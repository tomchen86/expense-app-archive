import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useExpenseStore } from '../../src/store/expenseStore';
import { ExpenseGroup, Participant as _Participant } from '../../src/types';

import GroupListItem from '../../src/components/GroupListItem';
import TextInputModal from '../../src/components/TextInputModal';
import FloatingActionButton from '../../src/components/FloatingActionButton';
import { calculateGroupTotalsByCurrency } from '../../src/utils/groupCalculations';
import { ScreenHeading } from '../../src/components/ui/screen-heading';
import { mobileTheme } from '../../src/theme/tokens';
import { isExpenseGroupArchived } from '../../src/utils/groupDomain';

const HistoryScreen = () => {
  const groups = useExpenseStore((state) => state.groups);
  const expenses = useExpenseStore((state) => state.expenses);
  const userSettings = useExpenseStore((state) => state.userSettings);

  const addGroup = useExpenseStore((state) => state.addGroup);
  const addParticipant = useExpenseStore((state) => state.addParticipant);
  const addParticipantToGroup = useExpenseStore(
    (state) => state.addParticipantToGroup,
  );
  const removeParticipantFromGroup = useExpenseStore(
    (state) => state.removeParticipantFromGroup,
  );
  const archiveGroup = useExpenseStore((state) => state.archiveGroup);
  const restoreGroup = useExpenseStore((state) => state.restoreGroup);

  const [isNewGroupModalVisible, setIsNewGroupModalVisible] = useState(false);
  const [showArchivedGroups, setShowArchivedGroups] = useState(false);
  const [isAddParticipantModalVisible, setIsAddParticipantModalVisible] =
    useState(false);
  const [groupToAddParticipantTo, setGroupToAddParticipantTo] =
    useState<ExpenseGroup | null>(null);

  const activeGroups = useMemo(
    () => groups.filter((group) => !isExpenseGroupArchived(group)),
    [groups],
  );
  const archivedGroups = useMemo(
    () => groups.filter(isExpenseGroupArchived),
    [groups],
  );
  const visibleGroups = showArchivedGroups ? archivedGroups : activeGroups;

  const handleArchiveGroup = (groupId: string) => {
    Alert.alert(
      'Archive Group',
      'This hides the group from daily use while retaining its expenses, participants, payments, and shares.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: () => archiveGroup(groupId),
        },
      ],
    );
  };

  const handleRemoveParticipant = (groupId: string, participantId: string) => {
    Alert.alert(
      'Remove Participant',
      'Are you sure you want to remove this participant from the group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeParticipantFromGroup(groupId, participantId),
        },
      ],
    );
  };

  const openNewGroupModal = () => {
    if (!userSettings?.name?.trim()) {
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
    setIsNewGroupModalVisible(true);
  };

  const handleNewGroupSubmit = (groupName: string) => {
    addGroup(groupName);
  };

  const openAddParticipantModal = (group: ExpenseGroup) => {
    setGroupToAddParticipantTo(group);
    setIsAddParticipantModalVisible(true);
  };

  const handleAddParticipantSubmit = (participantName: string) => {
    if (groupToAddParticipantTo) {
      const participantId = addParticipant(participantName, undefined, {
        spaceId: groupToAddParticipantTo.id,
      });
      addParticipantToGroup(groupToAddParticipantTo.id, participantId);
    }
    setGroupToAddParticipantTo(null);
  };

  const handleGroupPress = (groupId: string) => {
    router.push({
      pathname: '/group-detail',
      params: { groupId },
    });
  };

  const renderGroupListItem = ({ item: group }: { item: ExpenseGroup }) => {
    const totals = calculateGroupTotalsByCurrency(expenses, group.id);

    return (
      <GroupListItem
        group={group}
        totals={totals}
        onArchiveGroup={handleArchiveGroup}
        onRemoveParticipant={handleRemoveParticipant}
        onAddParticipant={openAddParticipantModal}
        onPress={handleGroupPress}
        onRestoreGroup={restoreGroup}
      />
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <FlatList
        contentContainerStyle={styles.groupsList}
        data={visibleGroups}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <ScreenHeading
              title='Groups'
              subtitle={
                showArchivedGroups
                  ? 'Read-only shared history.'
                  : 'Shared spending without the guesswork.'
              }
            />
            {(archivedGroups.length > 0 || showArchivedGroups) && (
              <TouchableOpacity
                accessibilityLabel={
                  showArchivedGroups
                    ? 'View active groups'
                    : 'View archived groups'
                }
                accessibilityRole='button'
                style={styles.archiveToggleButton}
                onPress={() => setShowArchivedGroups((visible) => !visible)}
              >
                <Text style={styles.archiveToggleButtonText}>
                  {showArchivedGroups
                    ? 'View Active Groups'
                    : `View Archived Groups (${archivedGroups.length})`}
                </Text>
              </TouchableOpacity>
            )}
            {!showArchivedGroups && (
              <TouchableOpacity
                accessibilityRole='button'
                style={styles.createGroupButton}
                onPress={openNewGroupModal}
              >
                <Text style={styles.createGroupButtonText}>
                  Create New Group
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyListText}>
            {showArchivedGroups
              ? 'No archived groups.'
              : 'No groups yet. Create one!'}
          </Text>
        }
        renderItem={renderGroupListItem}
      />

      <TextInputModal
        visible={isNewGroupModalVisible}
        title='Create New Group'
        placeholder='Enter group name'
        submitButtonText='Create'
        onSubmit={handleNewGroupSubmit}
        onClose={() => setIsNewGroupModalVisible(false)}
      />

      <TextInputModal
        visible={isAddParticipantModalVisible}
        title={`Add Participant to ${groupToAddParticipantTo?.name || ''}`}
        placeholder='Enter participant name'
        submitButtonText='Add'
        onSubmit={handleAddParticipantSubmit}
        onClose={() => {
          setIsAddParticipantModalVisible(false);
          setGroupToAddParticipantTo(null);
        }}
      />
      {!showArchivedGroups && (
        <FloatingActionButton nativeTabsContentInsetApplied />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  createGroupButton: {
    backgroundColor: mobileTheme.colors.primary,
    paddingVertical: mobileTheme.spacing.lg,
    paddingHorizontal: mobileTheme.spacing.xl,
    borderRadius: mobileTheme.radii.control,
    alignItems: 'center',
    marginBottom: mobileTheme.spacing.xl,
    ...mobileTheme.shadows.action,
  },
  createGroupButtonText: {
    color: mobileTheme.colors.onPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  archiveToggleButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radii.control,
    backgroundColor: mobileTheme.colors.surfaceVariant,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
  },
  archiveToggleButtonText: {
    color: mobileTheme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
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

export default HistoryScreen;
