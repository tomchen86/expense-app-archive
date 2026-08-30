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
import { resolveExpenseCategoryPresentation } from '../utils/categoryDomain';
import { AdaptiveCardSurface } from '../components/ui/adaptive-card-surface';

const ExpensesScreen = () => {
  const expenses = useExpenseStore((state) => state.expenses);
  const participants = useExpenseStore((state) => state.participants);
  const groups = useExpenseStore((state) => state.groups);
  const categories = useExpenseStore((state) => state.categories);
  const user = useExpenseStore((state) => state.user);
  const currentUserId = user?.id ?? null;
  const personalSpaceId = user?.personalSpaceId ?? null;
  const personalParticipantId = useExpenseStore(
    (state) => state.personalParticipantId,
  );
  const { pendingExpenseDeletionIds, requestExpenseDeletion } =
    useExpenseDeletion();

  const visibleExpenses = useMemo(() => {
    const pendingIds = new Set(pendingExpenseDeletionIds);
    return expenses.filter((expense) => !pendingIds.has(expense.id));
  }, [expenses, pendingExpenseDeletionIds]);

  const currentParticipantIds = useMemo(
    () =>
      resolvePersonalParticipantIds({
        userId: currentUserId,
        participants,
        personalParticipantId,
      }),
    [currentUserId, participants, personalParticipantId],
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
      if (group.id !== currentUserId) {
        map.set(group.id, group);
      }
    });
    return map;
  }, [groups, currentUserId]);

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
    return (
      <ExpenseListItem
        item={item}
        group={groupForDisplay ?? null}
        categoryLabel={
          resolveExpenseCategoryPresentation(item, categories).label
        }
        displayAmountMinor={sumPersonalShareMinor(
          item,
          currentParticipantIds,
          personalSpaceId,
        )}
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
            <AdaptiveCardSurface
              interactive
              style={styles.totalExpensesContainer}
              testID='total-share-surface'
            >
              <TouchableOpacity
                accessibilityHint='Opens charts and category breakdowns'
                accessibilityLabel={totalShareAccessibilityLabel}
                accessibilityRole='button'
                accessibilityState={{ disabled: !currentUserId }}
                disabled={!currentUserId}
                testID='total-share-button'
                onPress={() => {
                  if (currentUserId) {
                    router.push({
                      pathname: '/insights',
                      params: {
                        contextType: 'personal',
                        contextId: currentUserId,
                      },
                    });
                  }
                }}
                style={styles.totalExpensesButton}
              >
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
              </TouchableOpacity>
            </AdaptiveCardSurface>
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
    marginBottom: mobileTheme.spacing.xl,
  },
  totalExpensesButton: {
    alignItems: 'center',
    padding: mobileTheme.spacing.lg,
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
