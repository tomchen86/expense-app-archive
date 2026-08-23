import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ExpenseGroup, Participant as _Participant } from '../types';
import type { CurrencyTotal } from '../utils/groupCalculations';
import { formatMinorUnits } from '../utils/money';
import { mobileTheme } from '../theme/tokens';

interface GroupListItemProps {
  group: ExpenseGroup;
  totals: CurrencyTotal[];
  onDeleteGroup: (groupId: string) => void;
  onRemoveParticipant: (groupId: string, participantId: string) => void;
  onAddParticipant: (group: ExpenseGroup) => void;
  onPress: (groupId: string) => void; // Add onPress prop for navigation
}

const GroupListItem: React.FC<GroupListItemProps> = ({
  group,
  totals,
  onDeleteGroup,
  onRemoveParticipant,
  onAddParticipant,
  onPress, // Destructure onPress
}) => {
  return (
    <View style={styles.groupCard}>
      {/* Group Header */}
      <View style={styles.groupHeader}>
        <TouchableOpacity
          accessibilityLabel={`Open ${group.name}`}
          accessibilityRole='button'
          onPress={() => onPress(group.id)}
          style={styles.openGroupButton}
        >
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.openGroupText}>View details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel={`Delete ${group.name}`}
          accessibilityRole='button'
          onPress={() => onDeleteGroup(group.id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Group Total */}
      {totals.length === 0 ? (
        <Text style={styles.groupTotal}>Total: —</Text>
      ) : (
        totals.map((total) => (
          <Text key={total.currency} style={styles.groupTotal}>
            Total: {formatMinorUnits(total.amountMinor, total.currency)}
          </Text>
        ))
      )}

      {/* Participants Section */}
      <Text style={styles.participantsLabel}>Participants:</Text>
      <View style={styles.participantsList}>
        {group.participants.map((participant) => (
          <View key={participant.id} style={styles.participantItem}>
            <Text style={styles.participantName}>{participant.name}</Text>
            <TouchableOpacity
              accessibilityLabel={`Remove ${participant.name} from ${group.name}`}
              accessibilityRole='button'
              onPress={() => onRemoveParticipant(group.id, participant.id)}
              style={styles.removeParticipantButton}
            >
              <Text style={styles.removeParticipantText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {/* Add Participant Button */}
        <TouchableOpacity
          accessibilityLabel={`Add participant to ${group.name}`}
          accessibilityRole='button'
          style={styles.addParticipantButton}
          onPress={() => onAddParticipant(group)}
        >
          <Text style={styles.addParticipantText}>+ Add Participant</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Styles copied and adapted from HistoryScreen.tsx
const styles = StyleSheet.create({
  groupCard: {
    backgroundColor: mobileTheme.colors.surface,
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.card,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
    marginBottom: mobileTheme.spacing.lg,
    ...mobileTheme.shadows.card,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: mobileTheme.spacing.md,
  },
  openGroupButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    marginRight: mobileTheme.spacing.md,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: mobileTheme.colors.text,
  },
  openGroupText: {
    color: mobileTheme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: mobileTheme.spacing.xs,
  },
  deleteButton: {
    minHeight: 44,
    minWidth: 68,
    backgroundColor: mobileTheme.colors.danger,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: mobileTheme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  groupTotal: {
    fontSize: 16,
    color: mobileTheme.colors.success,
    fontWeight: '600',
    marginBottom: mobileTheme.spacing.md,
  },
  participantsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: mobileTheme.colors.text,
    marginBottom: mobileTheme.spacing.md,
  },
  participantsList: {
    marginLeft: mobileTheme.spacing.md,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: mobileTheme.spacing.xs,
  },
  participantName: {
    fontSize: 16,
    color: mobileTheme.colors.text,
  },
  removeParticipantButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  removeParticipantText: {
    color: mobileTheme.colors.danger,
    fontSize: 20,
    fontWeight: 'bold',
  },
  addParticipantButton: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: mobileTheme.spacing.md,
  },
  addParticipantText: {
    color: mobileTheme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GroupListItem;
