import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { mobileTheme } from '../../theme/tokens';
import type { GroupSectionProps } from './expense-form-section.types';

export const GroupSection: React.FC<GroupSectionProps> = ({
  sharingEnabled,
  sharingLocked = false,
  financialControlsDisabled = false,
  interactionDisabled = false,
  selectedGroup,
  paidByParticipant,
  selectedParticipants,
  onSharingChange,
  onGroupPress,
  onPaidByPress,
  onSplitPress,
}) => {
  const splitSummary =
    selectedParticipants.length === 0
      ? 'Choose people'
      : selectedParticipants.length === 1
        ? '1 person'
        : `${selectedParticipants.length} people`;
  const sharingControlDisabled =
    sharingLocked || financialControlsDisabled || interactionDisabled;

  return (
    <View>
      <Text accessibilityRole='header' style={styles.sectionLabel}>
        SHARING
      </Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Split with others</Text>
          <Switch
            accessibilityLabel='Split with others'
            accessibilityRole='switch'
            accessibilityState={{ disabled: sharingControlDisabled }}
            disabled={sharingControlDisabled}
            onValueChange={onSharingChange}
            testID='sharing-toggle'
            trackColor={{
              false: mobileTheme.colors.surfaceVariant,
              true: mobileTheme.colors.primary,
            }}
            value={sharingEnabled}
          />
        </View>

        {sharingEnabled ? (
          <>
            <SelectionRow
              accessibilityLabel={`Group, ${selectedGroup?.name ?? 'not selected'}`}
              disabled={
                sharingLocked ||
                financialControlsDisabled ||
                interactionDisabled
              }
              label='Group'
              onPress={onGroupPress}
              testID='group-picker'
              value={selectedGroup?.name ?? 'Choose a group'}
            />
            {selectedGroup ? (
              <>
                <SelectionRow
                  accessibilityLabel={`Paid by, ${paidByParticipant?.name ?? 'not selected'}`}
                  disabled={financialControlsDisabled || interactionDisabled}
                  label='Paid by'
                  onPress={onPaidByPress}
                  testID='paid-by-picker'
                  value={paidByParticipant?.name ?? 'Choose payer'}
                />
                <SelectionRow
                  accessibilityLabel={`Split between, ${splitSummary}`}
                  disabled={financialControlsDisabled || interactionDisabled}
                  label='Split between'
                  onPress={onSplitPress}
                  testID='split-between-picker'
                  value={splitSummary}
                />
              </>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
};

const SelectionRow = ({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
  testID,
  value,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  testID: string;
  value: string;
}) => (
  <TouchableOpacity
    accessibilityLabel={accessibilityLabel}
    accessibilityRole='button'
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={styles.row}
    testID={testID}
  >
    <Text style={styles.rowLabel}>{label}</Text>
    <View style={styles.valueContainer}>
      <Text style={styles.rowValue}>{value}</Text>
      <Text accessibilityElementsHidden style={styles.chevron}>
        ›
      </Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  sectionLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: mobileTheme.spacing.sm,
    marginLeft: mobileTheme.spacing.md,
    marginTop: mobileTheme.spacing.xxl,
  },
  section: {
    overflow: 'hidden',
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radii.card,
    borderWidth: 1,
    backgroundColor: mobileTheme.colors.surface,
  },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: mobileTheme.spacing.lg,
    borderBottomColor: mobileTheme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    color: mobileTheme.colors.text,
    fontSize: 16,
  },
  valueContainer: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: mobileTheme.spacing.lg,
  },
  rowValue: {
    flexShrink: 1,
    color: mobileTheme.colors.textMuted,
    fontSize: 16,
    textAlign: 'right',
  },
  chevron: {
    color: mobileTheme.colors.textMuted,
    fontSize: 24,
    marginLeft: mobileTheme.spacing.sm,
  },
});
