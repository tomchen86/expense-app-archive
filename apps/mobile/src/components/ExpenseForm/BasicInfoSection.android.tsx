import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { mobileTheme } from '../../theme/tokens';
import DatePicker from '../DatePicker';
import type { BasicInfoSectionProps } from './expense-form-section.types';

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  amount,
  caption,
  category,
  currency,
  date,
  financialEditingDisabled = false,
  financialEditingReason,
  interactionDisabled = false,
  onAmountChange,
  onCaptionChange,
  onCategoryPress,
  onDateChange,
  onTitleChange,
  title,
}) => {
  const amountDisabled = financialEditingDisabled || interactionDisabled;

  return (
    <View>
      <Text accessibilityRole='header' style={styles.sectionLabel}>
        Amount
      </Text>
      <View style={styles.amountField}>
        <Text style={styles.currency}>{currency}</Text>
        <TextInput
          accessibilityHint={financialEditingReason}
          accessibilityLabel={`Amount in ${currency}`}
          accessibilityState={{ disabled: amountDisabled }}
          editable={!amountDisabled}
          keyboardType='decimal-pad'
          onChangeText={onAmountChange}
          placeholder='0.00'
          placeholderTextColor={mobileTheme.colors.textMuted}
          returnKeyType='done'
          selectTextOnFocus
          style={styles.amountInput}
          testID='expense-amount-input'
          value={amount}
        />
      </View>
      {financialEditingReason ? (
        <Text accessibilityLiveRegion='polite' style={styles.supportingText}>
          {financialEditingReason}
        </Text>
      ) : null}

      <Text accessibilityRole='header' style={styles.sectionLabel}>
        Details
      </Text>
      <TextInput
        accessibilityLabel='Expense title'
        autoCapitalize='sentences'
        editable={!interactionDisabled}
        onChangeText={onTitleChange}
        placeholder='Title'
        placeholderTextColor={mobileTheme.colors.textMuted}
        returnKeyType='done'
        style={styles.outlinedInput}
        testID='expense-title-input'
        value={title}
      />
      <TouchableOpacity
        accessibilityLabel={`Category, ${category}`}
        accessibilityRole='button'
        accessibilityState={{ disabled: interactionDisabled }}
        disabled={interactionDisabled}
        onPress={onCategoryPress}
        style={styles.outlinedControl}
        testID='category-picker'
      >
        <View>
          <Text style={styles.controlLabel}>Category</Text>
          <Text style={styles.controlValue}>{category}</Text>
        </View>
        <Text accessibilityElementsHidden style={styles.chevron}>
          ›
        </Text>
      </TouchableOpacity>
      <DatePicker
        containerStyle={styles.outlinedControl}
        date={date}
        disabled={interactionDisabled}
        label='Date'
        onChange={onDateChange}
        testID='date-picker'
      />

      <Text accessibilityRole='header' style={styles.sectionLabel}>
        Note
      </Text>
      <TextInput
        accessibilityLabel='Expense note'
        editable={!interactionDisabled}
        multiline
        onChangeText={onCaptionChange}
        placeholder='Add a note…'
        placeholderTextColor={mobileTheme.colors.textMuted}
        style={[styles.outlinedInput, styles.noteInput]}
        testID='expense-caption-input'
        textAlignVertical='top'
        value={caption}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: mobileTheme.spacing.sm,
    marginTop: mobileTheme.spacing.xl,
  },
  amountField: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: mobileTheme.colors.primary,
    borderRadius: mobileTheme.radii.control,
    borderWidth: 1,
    backgroundColor: mobileTheme.colors.surface,
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  currency: {
    color: mobileTheme.colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
    marginRight: mobileTheme.spacing.md,
  },
  amountInput: {
    flex: 1,
    color: mobileTheme.colors.text,
    fontSize: 30,
    fontWeight: '600',
    paddingVertical: mobileTheme.spacing.sm,
  },
  supportingText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: mobileTheme.spacing.md,
    marginTop: mobileTheme.spacing.xs,
  },
  outlinedInput: {
    minHeight: 56,
    color: mobileTheme.colors.text,
    fontSize: 16,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radii.control,
    borderWidth: 1,
    backgroundColor: mobileTheme.colors.surface,
    marginBottom: mobileTheme.spacing.md,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: mobileTheme.spacing.md,
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
  noteInput: {
    minHeight: 112,
  },
});
