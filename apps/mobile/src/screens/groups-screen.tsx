import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useExpenseStore } from '../store/expenseStore';
import { ExpenseGroup } from '../types';

import GroupListItem from '../components/GroupListItem';
import FloatingActionButton from '../components/FloatingActionButton';
import { calculateCurrentUserGroupSummaryByCurrency } from '../utils/groupCalculations';
import { mobileTheme } from '../theme/tokens';
import { isExpenseGroupArchived } from '../utils/groupDomain';
import { useExpenseDeletion } from '../components/feedback/expense-deletion-context';
import TransientNotice from '../components/feedback/transient-notice';

export const GROUP_ARCHIVE_NOTICE_DURATION_MS = 4_500;

const GroupsScreen = () => {
  const groups = useExpenseStore((state) => state.groups);
  const expenses = useExpenseStore((state) => state.expenses);
  const userSettings = useExpenseStore((state) => state.userSettings);
  const internalUserId = useExpenseStore((state) => state.internalUserId);
  const user = useExpenseStore((state) => state.user);
  const canonicalUserId = user?.id ?? null;
  const { pendingExpenseDeletionIds } = useExpenseDeletion();

  const visibleExpenses = useMemo(() => {
    const pendingIds = new Set(pendingExpenseDeletionIds);
    return expenses.filter((expense) => !pendingIds.has(expense.id));
  }, [expenses, pendingExpenseDeletionIds]);

  const archiveGroup = useExpenseStore((state) => state.archiveGroup);
  const restoreGroup = useExpenseStore((state) => state.restoreGroup);

  const [isArchiveNoticeVisible, setIsArchiveNoticeVisible] = useState(false);
  const [pendingLifecycleGroupIds, setPendingLifecycleGroupIds] = useState<
    Set<string>
  >(new Set());
  const pendingLifecycleGroupIdsRef = useRef(new Set<string>());
  const archiveNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeGroups = useMemo(
    () => groups.filter((group) => !isExpenseGroupArchived(group)),
    [groups],
  );
  useEffect(
    () => () => {
      if (archiveNoticeTimer.current) {
        clearTimeout(archiveNoticeTimer.current);
      }
    },
    [],
  );

  const handleArchiveGroup = async (groupId: string) => {
    if (pendingLifecycleGroupIdsRef.current.has(groupId)) {
      return false;
    }
    pendingLifecycleGroupIdsRef.current.add(groupId);
    setPendingLifecycleGroupIds(new Set(pendingLifecycleGroupIdsRef.current));
    try {
      const didArchive = await archiveGroup(groupId);
      if (!didArchive) {
        Alert.alert(
          'Unable to Archive Group',
          'The group changed before it could be archived. Please try again.',
        );
        return false;
      }
      setIsArchiveNoticeVisible(true);
      if (archiveNoticeTimer.current) {
        clearTimeout(archiveNoticeTimer.current);
      }
      archiveNoticeTimer.current = setTimeout(() => {
        setIsArchiveNoticeVisible(false);
        archiveNoticeTimer.current = null;
      }, GROUP_ARCHIVE_NOTICE_DURATION_MS);
      return true;
    } catch {
      Alert.alert(
        'Unable to Archive Group',
        'The group could not be saved as archived. Please try again.',
      );
      return false;
    } finally {
      pendingLifecycleGroupIdsRef.current.delete(groupId);
      setPendingLifecycleGroupIds(new Set(pendingLifecycleGroupIdsRef.current));
    }
  };

  const openNewGroup = () => {
    if (!(user?.displayName?.trim() || userSettings?.name?.trim())) {
      Alert.alert(
        'Username Required',
        'Please set your username in Settings before creating a group.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Settings',
            onPress: () => router.push('/settings'),
          },
        ],
      );
      return;
    }
    router.push('/new-group');
  };

  const handleGroupPress = (groupId: string) => {
    router.push({
      pathname: '/group-detail',
      params: { groupId },
    });
  };

  const renderGroupListItem = ({ item: group }: { item: ExpenseGroup }) => {
    const summary = calculateCurrentUserGroupSummaryByCurrency(
      group,
      visibleExpenses,
      internalUserId,
      canonicalUserId,
    );

    return (
      <GroupListItem
        group={group}
        isLifecyclePending={pendingLifecycleGroupIds.has(group.id)}
        summary={summary}
        onArchiveGroup={handleArchiveGroup}
        onPress={handleGroupPress}
        onRestoreGroup={restoreGroup}
      />
    );
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <FlatList
        contentInsetAdjustmentBehavior='automatic'
        contentContainerStyle={styles.groupsList}
        data={activeGroups}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyListText}>
            No groups yet. Tap + to create a group.
          </Text>
        }
        renderItem={renderGroupListItem}
      />

      <TransientNotice
        message='Group archived · Find it in Settings'
        testID='group-archived-notice'
        visible={isArchiveNoticeVisible}
      />
      <FloatingActionButton
        accessibilityLabel='Add group'
        nativeTabsContentInsetApplied
        onPress={openNewGroup}
        surfaceTestID='add-group-surface'
        testID='add-group-fab'
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  groupsList: {
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: mobileTheme.spacing.md,
    paddingBottom: 96,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: mobileTheme.spacing.xxxl,
    fontSize: 16,
    color: mobileTheme.colors.textMuted,
  },
});

export default GroupsScreen;
