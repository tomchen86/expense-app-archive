import React, { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import GroupListItem from '../components/GroupListItem';
import { useExpenseStore } from '../store/expenseStore';
import { mobileTheme } from '../theme/tokens';
import type { ExpenseGroup } from '../types';
import { isExpenseGroupArchived } from '../utils/groupDomain';

const ArchivedGroupsScreen = () => {
  const groups = useExpenseStore((state) => state.groups);
  const restoreGroup = useExpenseStore((state) => state.restoreGroup);
  const [pendingGroupIds, setPendingGroupIds] = useState<Set<string>>(
    new Set(),
  );
  const pendingGroupIdsRef = useRef(new Set<string>());
  const archivedGroups = useMemo(
    () => groups.filter(isExpenseGroupArchived),
    [groups],
  );

  const openGroup = (groupId: string) => {
    router.push({
      pathname: '/group-detail',
      params: { groupId },
    });
  };

  const handleRestoreGroup = async (groupId: string) => {
    if (pendingGroupIdsRef.current.has(groupId)) {
      return false;
    }
    pendingGroupIdsRef.current.add(groupId);
    setPendingGroupIds(new Set(pendingGroupIdsRef.current));
    try {
      const didRestore = await restoreGroup(groupId);
      if (!didRestore) {
        Alert.alert(
          'Unable to Restore Group',
          'The group changed before it could be restored. Please try again.',
        );
        return false;
      }
      return true;
    } catch {
      Alert.alert(
        'Unable to Restore Group',
        'The group could not be restored. Please try again.',
      );
      return false;
    } finally {
      pendingGroupIdsRef.current.delete(groupId);
      setPendingGroupIds(new Set(pendingGroupIdsRef.current));
    }
  };

  const renderGroup = ({ item }: { item: ExpenseGroup }) => (
    <GroupListItem
      group={item}
      isLifecyclePending={pendingGroupIds.has(item.id)}
      onArchiveGroup={() => undefined}
      onPress={openGroup}
      onRestoreGroup={handleRestoreGroup}
      summary={null}
    />
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.container}>
      <FlatList
        contentInsetAdjustmentBehavior='automatic'
        contentContainerStyle={styles.content}
        data={archivedGroups}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No archived groups.</Text>
        }
        renderItem={renderGroup}
        testID='archived-groups-list'
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: mobileTheme.spacing.md,
    paddingBottom: mobileTheme.spacing.xxxl,
  },
  emptyText: {
    marginTop: mobileTheme.spacing.xxxl,
    textAlign: 'center',
    color: mobileTheme.colors.textMuted,
    fontSize: 16,
  },
});

export default ArchivedGroupsScreen;
