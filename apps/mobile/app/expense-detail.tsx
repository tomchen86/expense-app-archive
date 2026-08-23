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
  getExpenseAmountMinor,
  getExpenseCurrency,
  getExpensePayments,
  getExpenseShares,
  getExpenseSpaceId,
  getExpenseSpaceKind,
  isExpenseDeleted,
} from '../src/utils/expenseDomain';
import { isExpenseGroupArchived } from '../src/utils/groupDomain';
import { minorUnitsToDecimalString } from '../src/utils/money';
import { formatLocalDateForDisplay } from '../src/utils/dateFormat';
import { mobileTheme } from '../src/theme/tokens';
import { ExpenseDetailHeaderActions } from '../src/components/navigation/expense-detail-header-actions';

const ExpenseDetailScreen = () => {
  const params = useLocalSearchParams<{ expenseId?: RouteParam }>();
  const expenseId = resolveSingleRouteParam(params.expenseId);
  const expenses = useExpenseStore((state) => state.expenses);
  const groups = useExpenseStore((state) => state.groups);
  const participants = useExpenseStore((state) => state.participants);
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

  if (!expense) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Expense' }} />
        <Text style={styles.emptyText}>Expense not found.</Text>
      </View>
    );
  }

  const payerDetails = [
    ...getExpensePayments(expense)
      .filter((payment) => payment.amountMinor > 0)
      .reduce((paymentsByParticipant, payment) => {
        paymentsByParticipant.set(
          payment.participantId,
          (paymentsByParticipant.get(payment.participantId) ?? 0) +
            payment.amountMinor,
        );
        return paymentsByParticipant;
      }, new Map<string, number>()),
  ].map(([participantId, amountMinor]) => ({
    amountMinor,
    name:
      participants.find((participant) => participant.id === participantId)
        ?.name ?? 'Former member',
  }));
  const payerSummary =
    payerDetails.length === 1
      ? payerDetails[0].name
      : `${payerDetails.length} people`;
  const shareNames = getExpenseShares(expense).map((share) => {
    const participant = participants.find(
      (candidate) => candidate.id === share.participantId,
    );
    return participant?.name ?? 'Former member';
  });
  const isHistoricalSharedExpense =
    getExpenseSpaceKind(expense) === 'shared' &&
    (!group || isExpenseGroupArchived(group));

  const handleDelete = () => {
    requestExpenseDeletion(expense.id, expense.title);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Expense' }} />
      <ExpenseDetailHeaderActions
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
          {getExpenseCurrency(expense)}{' '}
          {minorUnitsToDecimalString(
            getExpenseAmountMinor(expense),
            getExpenseCurrency(expense),
          )}
        </Text>

        {isHistoricalSharedExpense ? (
          <View style={styles.historyNotice}>
            <Text style={styles.historyNoticeTitle}>Shared history</Text>
            <Text style={styles.historyNoticeText}>
              Restore this group before changing its expense allocation.
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>DETAILS</Text>
        <View style={styles.section}>
          <DetailRow label='Category' value={expense.category} />
          <DetailRow
            label='Date'
            value={formatLocalDateForDisplay(expense.date)}
          />
        </View>

        {getExpenseSpaceKind(expense) === 'shared' ? (
          <>
            <Text style={styles.sectionLabel}>SHARING</Text>
            <View style={styles.section}>
              <DetailRow
                label='Group'
                value={group?.name ?? 'Archived group'}
              />
              <DetailRow label='Paid by' value={payerSummary} />
              {payerDetails.length > 1
                ? payerDetails.map((payerDetail, index) => (
                    <DetailRow
                      key={`${payerDetail.name}-${index}`}
                      label={`${payerDetail.name} paid`}
                      value={`${getExpenseCurrency(expense)} ${minorUnitsToDecimalString(
                        payerDetail.amountMinor,
                        getExpenseCurrency(expense),
                      )}`}
                    />
                  ))
                : null}
              <DetailRow
                label='Split between'
                value={
                  shareNames.length === 1
                    ? shareNames[0]
                    : `${shareNames.length} people`
                }
              />
            </View>
          </>
        ) : null}

        {expense.caption ? (
          <>
            <Text style={styles.sectionLabel}>NOTE</Text>
            <View style={styles.noteSection}>
              <Text style={styles.note}>{expense.caption}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
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
    borderRadius: mobileTheme.radii.card,
    backgroundColor: mobileTheme.colors.surfaceVariant,
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
    overflow: 'hidden',
    marginBottom: mobileTheme.spacing.xl,
    borderRadius: mobileTheme.radii.card,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
    backgroundColor: mobileTheme.colors.surface,
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
  noteSection: {
    minHeight: 96,
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.card,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
    backgroundColor: mobileTheme.colors.surface,
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
