import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { useExpenseStore } from '../src/store/expenseStore';
import { Expense } from '../src/types';
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
import {
  buildExpenseDetailRoute,
  resolveSingleRouteParam,
  type RouteParam,
} from '../src/navigation/expense-edit-route';
import { isExpenseGroupArchived } from '../src/utils/groupDomain';
import { semanticColors } from '../src/theme/semantic-colors';
import { mobileTheme } from '../src/theme/tokens';
import { useExpenseDeletion } from '../src/components/feedback/expense-deletion-context';
import GroupMembersModal from '../src/components/groups/GroupMembersModal';
import { GroupDetailHeaderActions } from '../src/components/navigation/group-detail-header-actions';
import TextInputModal from '../src/components/TextInputModal';
import { resolveExpenseCategoryPresentation } from '../src/utils/categoryDomain';

const GroupDetailScreen = () => {
  const params = useLocalSearchParams<{ groupId?: RouteParam }>();
  const groupId = resolveSingleRouteParam(params.groupId);

  const expenses = useExpenseStore((state) => state.expenses);
  const groups = useExpenseStore((state) => state.groups);
  const categories = useExpenseStore((state) => state.categories);
  const restoreGroup = useExpenseStore((state) => state.restoreGroup);
  const internalUserId = useExpenseStore((state) => state.internalUserId);
  const canonicalUserId = useExpenseStore((state) => state.user?.id ?? null);
  const allParticipants = useExpenseStore((state) => state.participants);
  const addParticipantToGroupByName = useExpenseStore(
    (state) => state.addParticipantToGroupByName,
  );
  const removeParticipantFromGroup = useExpenseStore(
    (state) => state.removeParticipantFromGroup,
  );
  const { pendingExpenseDeletionIds, requestExpenseDeletion } =
    useExpenseDeletion();

  const [isBalancesOverlayVisible, setIsBalancesOverlayVisible] =
    useState(false);
  const [isMembersVisible, setIsMembersVisible] = useState(false);
  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);
  const [removingParticipantId, setRemovingParticipantId] = useState<
    string | null
  >(null);
  const removingParticipantIdRef = useRef<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const isRestoringRef = useRef(false);

  const group = useMemo(() => {
    return groups.find((g) => g.id === groupId);
  }, [groups, groupId]);

  const groupExpenses = useMemo(() => {
    const pendingIds = new Set(pendingExpenseDeletionIds);
    return expenses.filter(
      (expense) =>
        !isExpenseDeleted(expense) &&
        !pendingIds.has(expense.id) &&
        getExpenseSpaceId(expense) === groupId,
    );
  }, [expenses, groupId, pendingExpenseDeletionIds]);

  const groupTotals = useMemo(() => {
    return calculateGroupTotalsByCurrency(groupExpenses, groupId ?? '');
  }, [groupExpenses, groupId]);

  const currentGroupParticipantId = useMemo(
    () =>
      resolveGroupParticipantIdForUser(group, internalUserId, canonicalUserId),
    [canonicalUserId, group, internalUserId],
  );

  const currentUserTotalContributions = useMemo(() => {
    if (!currentGroupParticipantId) {
      return [];
    }
    return calculateUserTotalContributionMinorInGroup(
      currentGroupParticipantId,
      groupExpenses,
      groupId ?? '',
    );
  }, [currentGroupParticipantId, groupExpenses, groupId]);

  const groupMembers = useMemo(() => {
    return group?.participants || [];
  }, [group]);
  const isArchived = group ? isExpenseGroupArchived(group) : false;

  const handlePress = (expense: Expense) => {
    router.push(buildExpenseDetailRoute(expense.id));
  };

  const handleDelete = (expense: Expense) => {
    requestExpenseDeletion(expense.id, expense.title);
  };

  const openAddMember = () => {
    setIsMembersVisible(false);
    setIsAddMemberVisible(true);
  };

  const closeAddMember = () => {
    setIsAddMemberVisible(false);
    if (!isArchived) {
      setIsMembersVisible(true);
    }
  };

  const handleAddMember = async (participantName: string) => {
    if (!group) {
      Alert.alert(
        'Unable to Add Member',
        'The group or your membership changed. Reopen Members and try again.',
      );
      return false;
    }

    try {
      const participantId = await addParticipantToGroupByName(
        group.id,
        participantName,
      );
      if (!participantId) {
        Alert.alert(
          'Unable to Add Member',
          'The group or your membership changed. Reopen Members and try again.',
        );
        return false;
      }
      return true;
    } catch {
      Alert.alert(
        'Unable to Add Member',
        'The member could not be saved. Please try again.',
      );
      return false;
    }
  };

  const handleRemoveMember = (participantId: string) => {
    const participant = group?.participants.find(
      (candidate) => candidate.id === participantId,
    );
    if (!group || !participant) {
      return;
    }

    Alert.alert(
      'Remove Member',
      `Remove ${participant.name} from ${group.name}? Their historical payments and shares will be retained.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (removingParticipantIdRef.current) {
              return;
            }
            removingParticipantIdRef.current = participantId;
            setRemovingParticipantId(participantId);
            void removeParticipantFromGroup(group.id, participantId)
              .then((didRemove) => {
                if (!didRemove) {
                  Alert.alert(
                    'Unable to Remove Member',
                    'The group or your membership changed. Please try again.',
                  );
                }
              })
              .catch(() => {
                Alert.alert(
                  'Unable to Remove Member',
                  'The member could not be removed safely. Please try again.',
                );
              })
              .finally(() => {
                removingParticipantIdRef.current = null;
                setRemovingParticipantId(null);
              });
          },
        },
      ],
    );
  };

  const handleRestoreGroup = async () => {
    if (!group || isRestoringRef.current) {
      return;
    }
    isRestoringRef.current = true;
    setIsRestoring(true);
    try {
      const didRestore = await restoreGroup(group.id);
      if (!didRestore) {
        Alert.alert(
          'Unable to Restore Group',
          'The group changed before it could be restored. Please try again.',
        );
      }
    } catch {
      Alert.alert(
        'Unable to Restore Group',
        'The group could not be restored. Please try again.',
      );
    } finally {
      isRestoringRef.current = false;
      setIsRestoring(false);
    }
  };

  const renderExpenseListItem = ({ item }: { item: Expense }) => {
    return (
      <ExpenseListItem
        item={item}
        group={group ?? null}
        categoryLabel={
          resolveExpenseCategoryPresentation(item, categories).label
        }
        displayAmountMinor={getExpenseAmountMinor(item)}
        currency={getExpenseCurrency(item)}
        onPress={handlePress}
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
      <GroupDetailHeaderActions
        onOpenMembers={() => setIsMembersVisible(true)}
      />

      {isArchived && (
        <View style={styles.archivedBanner}>
          <Text style={styles.archivedBannerText}>
            Archived group. Expenses and allocations are read-only.
          </Text>
          <TouchableOpacity
            accessibilityLabel='Restore group'
            accessibilityRole='button'
            accessibilityState={{
              busy: isRestoring,
              disabled: isRestoring,
            }}
            disabled={isRestoring}
            onPress={() => void handleRestoreGroup()}
            style={styles.restoreButton}
          >
            <Text style={styles.restoreButtonText}>Restore Group</Text>
          </TouchableOpacity>
        </View>
      )}

      {groupTotals.length > 0 ? (
        <TouchableOpacity
          accessibilityLabel={`View insights for ${group.name}`}
          accessibilityRole='button'
          onPress={() =>
            router.push({
              pathname: '/insights',
              params: {
                contextType: 'group',
                contextId: group.id,
              },
            })
          }
          style={styles.totalContainer}
          testID='group-total-summary'
        >
          {groupTotals.map((total) => (
            <Text key={total.currency} style={styles.totalText}>
              Group Total: {formatMinorUnits(total.amountMinor, total.currency)}
            </Text>
          ))}
        </TouchableOpacity>
      ) : null}

      {currentUserTotalContributions.length > 0 ? (
        <TouchableOpacity
          accessibilityLabel={`View balances for ${group.name}`}
          accessibilityRole='button'
          onPress={() => setIsBalancesOverlayVisible(true)}
          style={styles.totalContainer}
          testID='user-contribution-summary'
        >
          {currentUserTotalContributions.map((total) => (
            <Text key={total.currency} style={styles.totalText}>
              My Total Contribution:{' '}
              {formatMinorUnits(total.amountMinor, total.currency)}
            </Text>
          ))}
        </TouchableOpacity>
      ) : null}

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
      <GroupMembersModal
        currentParticipantId={currentGroupParticipantId}
        group={group}
        onAddMember={openAddMember}
        onClose={() => setIsMembersVisible(false)}
        onRemoveMember={handleRemoveMember}
        removingParticipantId={removingParticipantId}
        visible={isMembersVisible}
      />
      <TextInputModal
        inputTestID='participant-name-input'
        onClose={closeAddMember}
        onSubmit={handleAddMember}
        placeholder='Enter member name'
        submitButtonTestID='add-participant-submit'
        submitButtonText='Add'
        title={`Add Member to ${group.name}`}
        visible={isAddMemberVisible}
      />
      {!isArchived && <FloatingActionButton groupId={group.id} />}
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
    color: semanticColors.destructive,
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
