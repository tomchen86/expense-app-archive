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
import { useExpenseStore } from '../../src/store/expenseStore';
import {
  Expense,
  Participant as _Participant,
  ExpenseGroup,
  UserSettings as _UserSettings,
} from '../../src/types';

import ExpenseListItem from '../../src/components/ExpenseListItem';
import FloatingActionButton from '../../src/components/FloatingActionButton';
import {
  getExpenseCurrency,
  getExpenseSpaceId,
} from '../../src/utils/expenseDomain';
import {
  resolvePersonalParticipantIds,
  selectPersonalLedgerExpenses,
  sumPersonalShareMinor,
} from '../../src/utils/personalExpenseSelection';
import { formatMinorUnits } from '../../src/utils/money';
import { ScreenHeading } from '../../src/components/ui/screen-heading';
import { mobileTheme } from '../../src/theme/tokens';
import { buildEditExpenseRoute } from '../../src/navigation/expense-edit-route';

const HomeScreen = () => {
  const expenses = useExpenseStore((state) => state.expenses);
  const participants = useExpenseStore((state) => state.participants);
  const _userSettings = useExpenseStore((state) => state.userSettings);
  const groups = useExpenseStore((state) => state.groups);
  const deleteExpense = useExpenseStore((state) => state.deleteExpense);
  const internalUserId = useExpenseStore((state) => state.internalUserId);
  const personalParticipantId = useExpenseStore(
    (state) => state.personalParticipantId,
  );
  const personalSpaceId = useExpenseStore((state) => state.personalSpaceId);

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
      selectPersonalLedgerExpenses(expenses, {
        participantIds: currentParticipantIds,
        personalSpaceId,
      }),
    [expenses, personalSpaceId, currentParticipantIds],
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

  const handleEdit = (expense: Expense) => {
    router.push(buildEditExpenseRoute(expense.id));
  };

  const handleDelete = (expenseId: string) => {
    deleteExpense(expenseId);
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
        onEdit={handleEdit}
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
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={relevantExpenses}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <ScreenHeading
              title='Expenses'
              subtitle='Your money, clearly shared.'
            />
            <TouchableOpacity
              accessibilityHint='Opens charts and category breakdowns'
              accessibilityLabel={totalShareAccessibilityLabel}
              accessibilityRole='button'
              accessibilityState={{ disabled: !internalUserId }}
              disabled={!internalUserId}
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

export default HomeScreen;
