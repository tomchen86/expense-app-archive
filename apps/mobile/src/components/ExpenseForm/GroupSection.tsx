import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { AdaptiveGroupedSection } from '../ui/adaptive-grouped-list';
import { semanticColors } from '../../theme/semantic-colors';
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
      <AdaptiveGroupedSection>
        <View
          style={[styles.row, sharingEnabled && styles.separator]}
          testID='sharing-row'
        >
          <Text style={styles.rowLabel}>Split with others</Text>
          <Switch
            accessibilityLabel='Split with others'
            accessibilityRole='switch'
            accessibilityState={{ disabled: sharingControlDisabled }}
            disabled={sharingControlDisabled}
            onValueChange={onSharingChange}
            style={styles.switchControl}
            testID='sharing-toggle'
            trackColor={{
              false: semanticColors.fill,
              true: semanticColors.primary,
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
              separator={Boolean(selectedGroup)}
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
                  separator
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
      </AdaptiveGroupedSection>
    </View>
  );
};

const SelectionRow = ({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
  separator = false,
  testID,
  value,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  separator?: boolean;
  testID: string;
  value: string;
}) => (
  <TouchableOpacity
    accessibilityLabel={accessibilityLabel}
    accessibilityRole='button'
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={[styles.row, separator && styles.separator]}
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
    color: semanticColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: mobileTheme.spacing.sm,
    marginLeft: mobileTheme.spacing.md,
    marginTop: mobileTheme.spacing.xxl,
  },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  separator: {
    borderBottomColor: semanticColors.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    color: semanticColors.text,
    fontSize: 16,
  },
  switchControl: {
    alignSelf: 'center',
    height: 31,
    marginRight: mobileTheme.spacing.sm,
    width: 51,
  },
  valueContainer: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: mobileTheme.spacing.lg,
  },
  rowValue: {
    flexShrink: 1,
    color: semanticColors.textMuted,
    fontSize: 16,
    textAlign: 'right',
  },
  chevron: {
    color: semanticColors.textMuted,
    fontSize: 24,
    marginLeft: mobileTheme.spacing.sm,
  },
});
