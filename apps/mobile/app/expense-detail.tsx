import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { useExpenseDeletion } from '../src/components/feedback/expense-deletion-context';
import { useExpenseStore } from '../src/store/expenseStore';
import type { RouteParam } from '../src/navigation/expense-edit-route';
import {
  buildEditExpenseRoute,
  resolveSingleRouteParam,
} from '../src/navigation/expense-edit-route';
import {
  getExpenseSpaceId,
  getExpenseSpaceKind,
  isExpenseDeleted,
} from '../src/utils/expenseDomain';
import {
  buildExpenseDetailProjection,
  type ExpenseDetailAllocationRow,
} from '../src/utils/expense-detail-projection';
import { isExpenseGroupArchived } from '../src/utils/groupDomain';
import { minorUnitsToDecimalString } from '../src/utils/money';
import { resolvePersonalParticipantIds } from '../src/utils/personalExpenseSelection';
import { formatLocalDateForDisplay } from '../src/utils/dateFormat';
import { mobileTheme } from '../src/theme/tokens';
import { ExpenseDetailHeaderActions } from '../src/components/navigation/expense-detail-header-actions';
import { resolveExpenseCategoryPresentation } from '../src/utils/categoryDomain';
import { AdaptiveCardSurface } from '../src/components/ui/adaptive-card-surface';

const ExpenseDetailScreen = () => {
  const params = useLocalSearchParams<{ expenseId?: RouteParam }>();
  const expenseId = resolveSingleRouteParam(params.expenseId);
  const expenses = useExpenseStore((state) => state.expenses);
  const groups = useExpenseStore((state) => state.groups);
  const categories = useExpenseStore((state) => state.categories);
  const participants = useExpenseStore((state) => state.participants);
  const currentUserId = useExpenseStore((state) => state.user?.id ?? null);
  const personalParticipantId = useExpenseStore(
    (state) => state.personalParticipantId,
  );
  const { isPendingDeletion, requestExpenseDeletion } = useExpenseDeletion();

  const expense = useMemo(
    () =>
      expenses.find(
        (candidate) =>
          candidate.id === expenseId &&
          !isExpenseDeleted(candidate) &&
          !isPendingDeletion(candidate.id),
      ),
    [expenseId, expenses, isPendingDeletion],
  );
  const group = useMemo(
    () =>
      expense
        ? groups.find(
            (candidate) => candidate.id === getExpenseSpaceId(expense),
          )
        : undefined,
    [expense, groups],
  );
  const currentParticipantIds = useMemo(
    () =>
      resolvePersonalParticipantIds({
        userId: currentUserId,
        participants: group
          ? [...participants, ...group.participants]
          : participants,
        personalParticipantId,
      }),
    [currentUserId, group, participants, personalParticipantId],
  );
  const projection = useMemo(
    () =>
      expense
        ? buildExpenseDetailProjection({
            currentParticipantIds,
            expense,
            group,
            participants,
          })
        : null,
    [currentParticipantIds, expense, group, participants],
  );
  const categoryPresentation = useMemo(
    () =>
      expense ? resolveExpenseCategoryPresentation(expense, categories) : null,
    [categories, expense],
  );

  if (!expense || !projection || !categoryPresentation) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Expense' }} />
        <Text style={styles.emptyText}>Expense not found.</Text>
      </View>
    );
  }

  const isSharedExpense = getExpenseSpaceKind(expense) === 'shared';
  const isHistoricalSharedExpense =
    isSharedExpense && (!group || isExpenseGroupArchived(group));
  const formatAmount = (amountMinor: number) =>
    `${projection.currency} ${minorUnitsToDecimalString(
      amountMinor,
      projection.currency,
    )}`;
  const netLabel =
    projection.myBalanceMinor > 0
      ? 'You are owed'
      : projection.myBalanceMinor < 0
        ? 'You owe'
        : 'Settled up';

  const handleDelete = () => {
    if (isHistoricalSharedExpense) {
      return;
    }
    requestExpenseDeletion(expense.id, expense.title);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Expense' }} />
      <ExpenseDetailHeaderActions
        deleteDisabled={isHistoricalSharedExpense}
        editDisabled={isHistoricalSharedExpense}
        onDelete={handleDelete}
        onEdit={() => router.push(buildEditExpenseRoute(expense.id))}
      />

      <ScrollView
        contentInsetAdjustmentBehavior='automatic'
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>{expense.title}</Text>
        <Text style={styles.amount}>
          {formatAmount(projection.amountMinor)}
        </Text>

        {isHistoricalSharedExpense ? (
          <AdaptiveCardSurface style={styles.historyNotice} tone='muted'>
            <Text style={styles.historyNoticeTitle}>Shared history</Text>
            <Text style={styles.historyNoticeText}>
              Payments and shares are preserved as read-only history. Restore
              this group before editing.
            </Text>
          </AdaptiveCardSurface>
        ) : null}

        {isSharedExpense ? (
          <>
            <Text style={styles.sectionLabel}>YOUR POSITION</Text>
            <AdaptiveCardSurface style={styles.section}>
              <DetailRow
                label='You paid'
                value={formatAmount(projection.myPaidMinor)}
              />
              <DetailRow
                label='Your share'
                value={formatAmount(projection.myShareMinor)}
              />
              <DetailRow
                emphasis
                label={netLabel}
                value={formatAmount(Math.abs(projection.myBalanceMinor))}
              />
            </AdaptiveCardSurface>

            <AllocationSection
              currency={projection.currency}
              emptyLabel='Payment record unavailable'
              label='PAID BY'
              rows={projection.paymentRows}
            />
            <AllocationSection
              currency={projection.currency}
              emptyLabel='Split record unavailable'
              label='SPLIT'
              rows={projection.shareRows}
            />
          </>
        ) : null}

        <Text style={styles.sectionLabel}>DETAILS</Text>
        <AdaptiveCardSurface style={styles.section}>
          {isSharedExpense ? (
            <DetailRow label='Group' value={group?.name ?? 'Archived group'} />
          ) : null}
          {isHistoricalSharedExpense ? (
            <DetailRow label='Status' value='Archived · Read-only' />
          ) : null}
          <DetailRow label='Category' value={categoryPresentation.label} />
          <DetailRow
            label='Date'
            value={formatLocalDateForDisplay(expense.date)}
          />
        </AdaptiveCardSurface>

        {expense.caption ? (
          <>
            <Text style={styles.sectionLabel}>NOTE</Text>
            <AdaptiveCardSurface style={styles.noteSection}>
              <Text style={styles.note}>{expense.caption}</Text>
            </AdaptiveCardSurface>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const AllocationSection = ({
  currency,
  emptyLabel,
  label,
  rows,
}: {
  currency: string;
  emptyLabel: string;
  label: string;
  rows: ExpenseDetailAllocationRow[];
}) => (
  <>
    <Text style={styles.sectionLabel}>{label}</Text>
    <AdaptiveCardSurface style={styles.section}>
      {rows.length > 0 ? (
        rows.map((row) => (
          <DetailRow
            key={row.participantId}
            label={row.name}
            value={`${currency} ${minorUnitsToDecimalString(
              row.amountMinor,
              currency,
            )}`}
          />
        ))
      ) : (
        <DetailRow label={emptyLabel} value='—' />
      )}
    </AdaptiveCardSurface>
  </>
);

const DetailRow = ({
  emphasis = false,
  label,
  value,
}: {
  emphasis?: boolean;
  label: string;
  value: string;
}) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, emphasis && styles.emphasizedRowText]}>
      {label}
    </Text>
    <Text style={[styles.rowValue, emphasis && styles.emphasizedRowText]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  content: {
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingVertical: mobileTheme.spacing.xxl,
    paddingBottom: mobileTheme.spacing.xxxl,
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  amount: {
    color: mobileTheme.colors.text,
    fontSize: 32,
    fontWeight: '700',
    marginTop: mobileTheme.spacing.sm,
    marginBottom: mobileTheme.spacing.xxl,
    textAlign: 'center',
  },
  historyNotice: {
    padding: mobileTheme.spacing.lg,
    marginBottom: mobileTheme.spacing.xl,
  },
  historyNoticeTitle: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  historyNoticeText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: mobileTheme.spacing.xs,
  },
  sectionLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: mobileTheme.spacing.sm,
    marginLeft: mobileTheme.spacing.md,
  },
  section: {
    marginBottom: mobileTheme.spacing.xl,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: mobileTheme.spacing.lg,
    borderBottomColor: mobileTheme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    color: mobileTheme.colors.text,
    fontSize: 16,
  },
  rowValue: {
    flexShrink: 1,
    color: mobileTheme.colors.textMuted,
    fontSize: 16,
    marginLeft: mobileTheme.spacing.lg,
    textAlign: 'right',
  },
  emphasizedRowText: {
    color: mobileTheme.colors.text,
    fontWeight: '700',
  },
  noteSection: {
    minHeight: 96,
    padding: mobileTheme.spacing.lg,
  },
  note: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  emptyText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 16,
    marginTop: mobileTheme.spacing.xxxl,
    textAlign: 'center',
  },
});

export default ExpenseDetailScreen;
