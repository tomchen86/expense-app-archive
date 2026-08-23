import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { mobileTheme } from '../../theme/tokens';
import type { ExpenseGroup, Participant } from '../../types';
import {
  canRemoveParticipantFromGroup,
  isExpenseGroupArchived,
} from '../../utils/groupDomain';

interface GroupMembersModalProps {
  currentParticipantId: string | null;
  group: ExpenseGroup;
  onAddMember: () => void;
  onClose: () => void;
  onRemoveMember: (participantId: string) => void;
  removingParticipantId?: string | null;
  visible: boolean;
}

const GroupMembersModal = ({
  currentParticipantId,
  group,
  onAddMember,
  onClose,
  onRemoveMember,
  removingParticipantId = null,
  visible,
}: GroupMembersModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const isArchived = isExpenseGroupArchived(group);
  const canEditMembers = !isArchived && currentParticipantId !== null;
  const isMutationPending = removingParticipantId !== null;

  useEffect(() => {
    if (!visible || !canEditMembers) {
      setIsEditing(false);
    }
  }, [canEditMembers, visible]);

  const close = () => {
    if (isMutationPending) {
      return;
    }
    setIsEditing(false);
    onClose();
  };

  const renderMember = ({ item }: { item: Participant }) => {
    const isCurrentUser = item.id === currentParticipantId;
    const canRemove =
      isEditing &&
      canRemoveParticipantFromGroup(group, item.id, currentParticipantId);

    return (
      <View style={styles.memberRow}>
        <Text style={styles.memberName}>
          {item.name}
          {isCurrentUser ? ' (You)' : ''}
        </Text>
        {canRemove ? (
          <TouchableOpacity
            accessibilityLabel={`Remove ${item.name}`}
            accessibilityRole='button'
            accessibilityState={{
              busy: removingParticipantId === item.id,
              disabled: isMutationPending,
            }}
            disabled={isMutationPending}
            hitSlop={mobileTheme.spacing.sm}
            onPress={() => onRemoveMember(item.id)}
            style={styles.removeButton}
          >
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      animationType='slide'
      onRequestClose={close}
      presentationStyle='pageSheet'
      visible={visible}
    >
      <View accessibilityViewIsModal style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel='Close members'
            accessibilityRole='button'
            accessibilityState={{ disabled: isMutationPending }}
            disabled={isMutationPending}
            onPress={close}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>Close</Text>
          </TouchableOpacity>
          <Text accessibilityRole='header' style={styles.title}>
            Members
          </Text>
          {!canEditMembers ? (
            <View style={styles.headerButtonPlaceholder} />
          ) : (
            <TouchableOpacity
              accessibilityLabel={
                isEditing ? 'Finish editing members' : 'Edit members'
              }
              accessibilityRole='button'
              accessibilityState={{ disabled: isMutationPending }}
              disabled={isMutationPending}
              onPress={() => setIsEditing((editing) => !editing)}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>
                {isEditing ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          contentContainerStyle={styles.listContent}
          data={group.participants}
          keyExtractor={(participant) => participant.id}
          ListFooterComponent={
            canEditMembers && isEditing ? (
              <TouchableOpacity
                accessibilityLabel='Add member'
                accessibilityRole='button'
                accessibilityState={{ disabled: isMutationPending }}
                disabled={isMutationPending}
                onPress={onAddMember}
                style={styles.addButton}
              >
                <Text style={styles.addButtonText}>Add Member</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No current members.</Text>
          }
          renderItem={renderMember}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: mobileTheme.spacing.md,
    borderBottomColor: mobileTheme.colors.border,
    borderBottomWidth: 1,
    backgroundColor: mobileTheme.colors.surface,
  },
  headerButton: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerButtonPlaceholder: {
    width: 64,
  },
  headerButtonText: {
    color: mobileTheme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  listContent: {
    padding: mobileTheme.spacing.xl,
  },
  memberRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: mobileTheme.spacing.lg,
    borderBottomColor: mobileTheme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: mobileTheme.colors.surface,
  },
  memberName: {
    flex: 1,
    color: mobileTheme.colors.text,
    fontSize: 16,
  },
  removeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: mobileTheme.spacing.lg,
  },
  removeText: {
    color: mobileTheme.colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
    backgroundColor: mobileTheme.colors.surface,
  },
  addButtonText: {
    color: mobileTheme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: mobileTheme.spacing.xxxl,
    color: mobileTheme.colors.textMuted,
    fontSize: 16,
  },
});

export default GroupMembersModal;
