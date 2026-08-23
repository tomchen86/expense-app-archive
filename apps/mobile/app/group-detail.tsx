import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable as _Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';

import { useExpenseStore } from '../src/store/expenseStore';
import {
  Expense,
  ExpenseGroup,
  Participant as _Participant,
} from '../src/types';
import ExpenseListItem from '../src/components/ExpenseListItem';
import GroupBalancesOverlay from '../src/components/GroupBalancesOverlay';
import FloatingActionButton from '../src/components/FloatingActionButton';
import {
  calculateGroupTotalsByCurrency,
  calculateUserTotalContributionMinorInGroup,
  resolveGroupParticipantIdForUser,
} from '../src/utils/groupCalculations';
import {
  getExpenseAmountMinor,
  getExpenseCurrency,
  getExpenseSpaceId,
  isExpenseDeleted,
} from '../src/utils/expenseDomain';
import { formatMinorUnits } from '../src/utils/money';
import { buildEditExpenseRoute } from '../src/navigation/expense-edit-route';
import { isExpenseGroupArchived } from '../src/utils/groupDomain';
import { mobileTheme } from '../src/theme/tokens';

const GroupDetailScreen = () => {
  const params = useLocalSearchParams();
  const { groupId } = params;

  const expenses = useExpenseStore((state) => state.expenses);
  const groups = useExpenseStore((state) => state.groups);
  const deleteExpense = useExpenseStore((state) => state.deleteExpense);
  const restoreGroup = useExpenseStore((state) => state.restoreGroup);
  const internalUserId = useExpenseStore((state) => state.internalUserId);
  const allParticipants = useExpenseStore((state) => state.participants);

  const [isBalancesOverlayVisible, setIsBalancesOverlayVisible] =
    useState(false);

  const group = useMemo(() => {
    return groups.find((g) => g.id === groupId);
  }, [groups, groupId]);

  const groupExpenses = useMemo(() => {
    return expenses.filter(
      (expense) =>
        !isExpenseDeleted(expense) && getExpenseSpaceId(expense) === groupId,
    );
  }, [expenses, groupId]);

  const groupTotals = useMemo(() => {
    return calculateGroupTotalsByCurrency(groupExpenses, groupId as string);
  }, [groupExpenses, groupId]);

  const currentGroupParticipantId = useMemo(
    () => resolveGroupParticipantIdForUser(group, internalUserId),
    [group, internalUserId],
  );

  const currentUserTotalContributions = useMemo(() => {
    if (!currentGroupParticipantId) {
      return [];
    }
    return calculateUserTotalContributionMinorInGroup(
      currentGroupParticipantId,
      groupExpenses,
      groupId as string,
    );
  }, [currentGroupParticipantId, groupExpenses, groupId]);

  const groupMembers = useMemo(() => {
    return group?.participants || [];
  }, [group]);
  const isArchived = group ? isExpenseGroupArchived(group) : false;

  const _groupMap = useMemo(() => {
    const map = new Map<string, ExpenseGroup>();
    if (group) {
      map.set(group.id, group);
    }
    return map;
  }, [group]);

  const handleEdit = (expense: Expense) => {
    router.push(buildEditExpenseRoute(expense.id));
  };

  const handleDelete = (expenseId: string) => {
    deleteExpense(expenseId);
  };

  const renderExpenseListItem = ({ item }: { item: Expense }) => {
    return (
      <ExpenseListItem
        item={item}
        group={group ?? null}
        allParticipants={allParticipants}
        displayAmountMinor={getExpenseAmountMinor(item)}
        currency={getExpenseCurrency(item)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  };

  if (!group) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Group Details' }} />
        <Text style={styles.errorText}>Group not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: group.name }} />

      {isArchived && (
        <View style={styles.archivedBanner}>
          <Text style={styles.archivedBannerText}>
            Archived group. Expenses and allocations are read-only.
          </Text>
          <TouchableOpacity
            accessibilityLabel='Restore group'
            accessibilityRole='button'
            onPress={() => restoreGroup(group.id)}
            style={styles.restoreButton}
          >
            <Text style={styles.restoreButtonText}>Restore Group</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        accessibilityLabel={`View insights for ${group.name}`}
        accessibilityRole='button'
        onPress={() =>
          router.push({
            pathname: '/insights',
            params: {
              contextType: 'group',
              contextId: groupId as string,
            },
          })
        }
      >
        <View style={styles.totalContainer}>
          {groupTotals.map((total) => (
            <Text key={total.currency} style={styles.totalText}>
              Group Total: {formatMinorUnits(total.amountMinor, total.currency)}
            </Text>
          ))}
        </View>
      </TouchableOpacity>

      {currentGroupParticipantId && (
        <TouchableOpacity
          accessibilityLabel={`View balances for ${group.name}`}
          accessibilityRole='button'
          onPress={() => setIsBalancesOverlayVisible(true)}
          style={styles.totalContainer}
        >
          {currentUserTotalContributions.map((total) => (
            <Text key={total.currency} style={styles.totalText}>
              My Total Contribution:{' '}
              {formatMinorUnits(total.amountMinor, total.currency)}
            </Text>
          ))}
        </TouchableOpacity>
      )}

      <FlatList
        data={groupExpenses}
        renderItem={renderExpenseListItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyListText}>
            No expenses in this group yet.
          </Text>
        }
        style={styles.list}
      />

      {group && currentGroupParticipantId && (
        <GroupBalancesOverlay
          visible={isBalancesOverlayVisible}
          onClose={() => setIsBalancesOverlayVisible(false)}
          members={groupMembers}
          expenses={groupExpenses}
          currentUserId={currentGroupParticipantId}
          allParticipants={allParticipants}
        />
      )}
      {!isArchived && <FloatingActionButton groupId={groupId as string} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: mobileTheme.spacing.xl,
    backgroundColor: mobileTheme.colors.background,
  },
  totalContainer: {
    backgroundColor: mobileTheme.colors.surface,
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.card,
    marginBottom: mobileTheme.spacing.xl,
    alignItems: 'center',
    ...mobileTheme.shadows.card,
  },
  totalText: {
    fontSize: 18,
    fontWeight: '700',
    color: mobileTheme.colors.text,
  },
  list: {
    flex: 1,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: mobileTheme.spacing.xxxl,
    fontSize: 16,
    color: mobileTheme.colors.textMuted,
  },
  errorText: {
    textAlign: 'center',
    marginTop: mobileTheme.spacing.xxxl,
    fontSize: 18,
    color: mobileTheme.colors.danger,
  },
  archivedBanner: {
    padding: mobileTheme.spacing.lg,
    marginBottom: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.card,
    backgroundColor: mobileTheme.colors.surfaceVariant,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
  },
  archivedBannerText: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  restoreButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: mobileTheme.spacing.md,
    paddingHorizontal: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.control,
    backgroundColor: mobileTheme.colors.primary,
  },
  restoreButtonText: {
    color: mobileTheme.colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default GroupDetailScreen;
