import React, { useState, useMemo as _useMemo } from 'react';
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
  const deleteGroup = useExpenseStore((state) => state.deleteGroup);

  const [isNewGroupModalVisible, setIsNewGroupModalVisible] = useState(false);
  const [isAddParticipantModalVisible, setIsAddParticipantModalVisible] =
    useState(false);
  const [groupToAddParticipantTo, setGroupToAddParticipantTo] =
    useState<ExpenseGroup | null>(null);

  const handleDeleteGroup = (groupId: string) => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This will not delete the expenses.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteGroup(groupId),
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
        onDeleteGroup={handleDeleteGroup}
        onRemoveParticipant={handleRemoveParticipant}
        onAddParticipant={openAddParticipantModal}
        onPress={handleGroupPress}
      />
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <FlatList
        contentContainerStyle={styles.groupsList}
        data={groups}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <ScreenHeading
              title='Groups'
              subtitle='Shared spending without the guesswork.'
            />
            <TouchableOpacity
              accessibilityRole='button'
              style={styles.createGroupButton}
              onPress={openNewGroupModal}
            >
              <Text style={styles.createGroupButtonText}>Create New Group</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyListText}>No groups yet. Create one!</Text>
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
      <FloatingActionButton nativeTabsContentInsetApplied />
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
