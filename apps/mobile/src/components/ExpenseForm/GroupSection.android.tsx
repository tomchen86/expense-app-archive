import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { mobileTheme } from '../../theme/tokens';
import type { GroupSectionProps } from './expense-form-section.types';

export const GroupSection: React.FC<GroupSectionProps> = ({
  financialControlsDisabled = false,
  interactionDisabled = false,
  onGroupPress,
  onPaidByPress,
  onSharingChange,
  onSplitPress,
  paidByParticipant,
  selectedGroup,
  selectedParticipants,
  sharingEnabled,
  sharingLocked = false,
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
        Sharing
      </Text>
      <View style={styles.switchRow}>
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
              sharingLocked || financialControlsDisabled || interactionDisabled
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
  );
};

const SelectionRow = ({
  accessibilityLabel,
  disabled,
  label,
  onPress,
  testID,
  value,
}: {
  accessibilityLabel: string;
  disabled: boolean;
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
    style={styles.outlinedControl}
    testID={testID}
  >
    <View>
      <Text style={styles.controlLabel}>{label}</Text>
      <Text style={styles.controlValue}>{value}</Text>
    </View>
    <Text accessibilityElementsHidden style={styles.chevron}>
      ›
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  sectionLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: mobileTheme.spacing.sm,
    marginTop: mobileTheme.spacing.xl,
  },
  switchRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radii.control,
    borderWidth: 1,
    backgroundColor: mobileTheme.colors.surface,
    marginBottom: mobileTheme.spacing.md,
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  rowLabel: {
    color: mobileTheme.colors.text,
    fontSize: 16,
  },
  outlinedControl: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radii.control,
    borderWidth: 1,
    backgroundColor: mobileTheme.colors.surface,
    marginBottom: mobileTheme.spacing.md,
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  controlLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  controlValue: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    marginTop: 2,
  },
  chevron: {
    color: mobileTheme.colors.textMuted,
    fontSize: 24,
  },
});
