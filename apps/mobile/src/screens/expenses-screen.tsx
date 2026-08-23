import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useExpenseStore } from '../store/expenseStore';
import {
  Expense,
  Participant as _Participant,
  ExpenseGroup,
  UserSettings as _UserSettings,
} from '../types';

import ExpenseListItem from '../components/ExpenseListItem';
import FloatingActionButton from '../components/FloatingActionButton';
import { getExpenseCurrency, getExpenseSpaceId } from '../utils/expenseDomain';
import {
  resolvePersonalParticipantIds,
  selectPersonalLedgerExpenses,
  sumPersonalShareMinor,
} from '../utils/personalExpenseSelection';
import { formatMinorUnits } from '../utils/money';
import { mobileTheme } from '../theme/tokens';
import { buildExpenseDetailRoute } from '../navigation/expense-edit-route';
import { useExpenseDeletion } from '../components/feedback/expense-deletion-context';

const ExpensesScreen = () => {
  const expenses = useExpenseStore((state) => state.expenses);
  const participants = useExpenseStore((state) => state.participants);
  const _userSettings = useExpenseStore((state) => state.userSettings);
  const groups = useExpenseStore((state) => state.groups);
  const internalUserId = useExpenseStore((state) => state.internalUserId);
  const personalParticipantId = useExpenseStore(
    (state) => state.personalParticipantId,
  );
  const personalSpaceId = useExpenseStore((state) => state.personalSpaceId);
  const { pendingExpenseDeletionIds, requestExpenseDeletion } =
    useExpenseDeletion();

  const visibleExpenses = useMemo(() => {
    const pendingIds = new Set(pendingExpenseDeletionIds);
    return expenses.filter((expense) => !pendingIds.has(expense.id));
  }, [expenses, pendingExpenseDeletionIds]);

  const currentParticipantIds = useMemo(
    () =>
      resolvePersonalParticipantIds({
        internalUserId,
        participants,
        personalParticipantId,
      }),
    [internalUserId, participants, personalParticipantId],
  );

  const relevantExpenses = useMemo(
    () =>
      selectPersonalLedgerExpenses(visibleExpenses, {
        participantIds: currentParticipantIds,
        personalSpaceId,
      }),
    [visibleExpenses, personalSpaceId, currentParticipantIds],
  );

  const totalUserShares = useMemo(() => {
    const totals = new Map<string, number>();
    relevantExpenses.forEach((expense) => {
      const currency = getExpenseCurrency(expense);
      totals.set(
        currency,
        (totals.get(currency) ?? 0) +
          sumPersonalShareMinor(
            expense,
            currentParticipantIds,
            personalSpaceId,
          ),
      );
    });
    return [...totals.entries()];
  }, [relevantExpenses, currentParticipantIds, personalSpaceId]);

  const groupMap = useMemo(() => {
    const map = new Map<string, ExpenseGroup>();
    groups.forEach((group) => {
      if (group.id !== internalUserId) {
        map.set(group.id, group);
      }
    });
    return map;
  }, [groups, internalUserId]);

  const handlePress = (expense: Expense) => {
    router.push(buildExpenseDetailRoute(expense.id));
  };

  const handleDelete = (expense: Expense) => {
    requestExpenseDeletion(expense.id, expense.title);
  };

  const renderExpenseListItem = ({ item }: { item: Expense }) => {
    const groupForDisplay = getExpenseSpaceId(item)
      ? groupMap.get(getExpenseSpaceId(item)!)
      : null;
    const userShareMinor = sumPersonalShareMinor(
      item,
      currentParticipantIds,
      personalSpaceId,
    );

    return (
      <ExpenseListItem
        item={item}
        group={groupForDisplay ?? null}
        allParticipants={participants}
        displayAmountMinor={userShareMinor}
        currency={getExpenseCurrency(item)}
        onPress={handlePress}
        onDelete={handleDelete}
      />
    );
  };

  const totalShareAccessibilityLabel =
    totalUserShares.length === 0
      ? 'View expense insights. Your total share is unavailable.'
      : `View expense insights. Your total share is ${totalUserShares
          .map(([currency, amountMinor]) =>
            formatMinorUnits(amountMinor, currency),
          )
          .join(', ')}.`;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <FlatList
        testID='expense-list'
        contentInsetAdjustmentBehavior='automatic'
        contentContainerStyle={styles.listContent}
        data={relevantExpenses}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <TouchableOpacity
              accessibilityHint='Opens charts and category breakdowns'
              accessibilityLabel={totalShareAccessibilityLabel}
              accessibilityRole='button'
              accessibilityState={{ disabled: !internalUserId }}
              disabled={!internalUserId}
              testID='total-share-button'
              onPress={() => {
                if (internalUserId) {
                  router.push({
                    pathname: '/insights',
                    params: {
                      contextType: 'personal',
                      contextId: internalUserId,
                    },
                  });
                }
              }}
            >
              <View style={styles.totalExpensesContainer}>
                {totalUserShares.length === 0 ? (
                  <Text style={styles.totalExpensesText}>
                    Your Total Share: —
                  </Text>
                ) : (
                  totalUserShares.map(([currency, amountMinor]) => (
                    <Text key={currency} style={styles.totalExpensesText}>
                      Your Total Share:{' '}
                      {formatMinorUnits(amountMinor, currency)}
                    </Text>
                  ))
                )}
              </View>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.noExpensesText}>
            No expenses to display. Add a personal expense or get involved in a
            group expense.
          </Text>
        }
        renderItem={renderExpenseListItem}
        style={styles.list}
      />
      <FloatingActionButton nativeTabsContentInsetApplied />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  totalExpensesContainer: {
    backgroundColor: mobileTheme.colors.surface,
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.card,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
    marginBottom: mobileTheme.spacing.xl,
    alignItems: 'center',
    ...mobileTheme.shadows.card,
  },
  totalExpensesText: {
    fontSize: 18,
    fontWeight: '700',
    color: mobileTheme.colors.text,
  },
  list: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: mobileTheme.spacing.md,
    paddingBottom: 96,
  },
  noExpensesText: {
    textAlign: 'center',
    marginTop: mobileTheme.spacing.xxxl,
    paddingHorizontal: mobileTheme.spacing.lg,
    fontSize: 16,
    lineHeight: 24,
    color: mobileTheme.colors.textMuted,
  },
});

export default ExpensesScreen;
