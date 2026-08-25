import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { semanticColors } from '../../theme/semantic-colors';
import { mobileTheme } from '../../theme/tokens';
import type { ExpenseGroup, Participant } from '../../types';
import {
  canRemoveParticipantFromGroup,
  isExpenseGroupArchived,
} from '../../utils/groupDomain';
import { AdaptiveGroupedSection } from '../ui/adaptive-grouped-list';
import { AdaptiveSheet } from '../ui/adaptive-sheet';

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
  const sheetSizing = group.participants.length <= 5 ? 'content' : 'resizable';

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
    <AdaptiveSheet
      leadingAction={{
        accessibilityLabel: 'Close members',
        disabled: isMutationPending,
        label: 'Close',
        onPress: close,
      }}
      onClose={close}
      title='Members'
      trailingAction={
        canEditMembers
          ? {
              accessibilityLabel: isEditing
                ? 'Finish editing members'
                : 'Edit members',
              disabled: isMutationPending,
              label: isEditing ? 'Done' : 'Edit',
              onPress: () => setIsEditing((editing) => !editing),
            }
          : undefined
      }
      sizing={sheetSizing}
      visible={visible}
    >
      <View
        style={[
          styles.content,
          sheetSizing === 'resizable' && styles.resizableContent,
        ]}
      >
        <AdaptiveGroupedSection style={styles.listSection}>
          <FlatList
            data={group.participants}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyExtractor={(participant) => participant.id}
            ListFooterComponent={
              canEditMembers && isEditing ? (
                <>
                  {group.participants.length > 0 ? (
                    <View style={styles.separator} />
                  ) : null}
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
                </>
              ) : null
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No current members.</Text>
            }
            renderItem={renderMember}
          />
        </AdaptiveGroupedSection>
      </View>
    </AdaptiveSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingTop: mobileTheme.spacing.xl,
    paddingBottom: mobileTheme.spacing.xl,
  },
  resizableContent: {
    flex: 1,
  },
  listSection: {
    flexShrink: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: mobileTheme.spacing.lg,
    backgroundColor: semanticColors.separator,
  },
  memberRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: mobileTheme.spacing.lg,
    backgroundColor: semanticColors.surface,
  },
  memberName: {
    flex: 1,
    color: semanticColors.text,
    fontSize: 16,
  },
  removeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: mobileTheme.spacing.lg,
  },
  removeText: {
    color: semanticColors.destructive,
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
    backgroundColor: semanticColors.surface,
  },
  addButtonText: {
    color: semanticColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    padding: mobileTheme.spacing.xxl,
    textAlign: 'center',
    color: semanticColors.textMuted,
    fontSize: 16,
  },
});

export default GroupMembersModal;
