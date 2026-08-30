import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { semanticColors } from '../theme/semantic-colors';
import { mobileTheme } from '../theme/tokens';

interface ParticipantTagProps {
  participantName: string;
  onRemove: () => void;
}

const ParticipantTag: React.FC<ParticipantTagProps> = ({
  participantName,
  onRemove,
}) => {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{participantName}</Text>
      <TouchableOpacity
        accessibilityLabel={`Remove ${participantName}`}
        accessibilityRole='button'
        hitSlop={mobileTheme.spacing.sm}
        onPress={onRemove}
        style={styles.removeButton}
      >
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: semanticColors.fill,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radii.pill,
    marginRight: mobileTheme.spacing.sm,
    marginBottom: mobileTheme.spacing.sm,
  },
  tagText: {
    color: semanticColors.primary,
    marginRight: mobileTheme.spacing.sm,
    fontSize: 14,
  },
  removeButton: {
    marginLeft: mobileTheme.spacing.xs,
    padding: mobileTheme.spacing.xs,
  },
  removeButtonText: {
    color: semanticColors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ParticipantTag;
