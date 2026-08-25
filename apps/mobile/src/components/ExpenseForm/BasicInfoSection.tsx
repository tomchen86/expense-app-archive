import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DatePicker from '../DatePicker';
import { AdaptiveGroupedSection } from '../ui/adaptive-grouped-list';
import { semanticColors } from '../../theme/semantic-colors';
import { mobileTheme } from '../../theme/tokens';
import type { BasicInfoSectionProps } from './expense-form-section.types';

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  title,
  amount,
  currency,
  category,
  caption,
  date,
  financialEditingDisabled = false,
  financialEditingReason,
  interactionDisabled = false,
  onTitleChange,
  onAmountChange,
  onCategoryPress,
  onCaptionChange,
  onDateChange,
}) => {
  return (
    <View>
      <View style={styles.amountContainer}>
        <Text style={styles.currency}>{currency}</Text>
        <TextInput
          accessibilityHint={financialEditingReason}
          accessibilityLabel={`Amount in ${currency}`}
          accessibilityState={{
            disabled: financialEditingDisabled || interactionDisabled,
          }}
          editable={!financialEditingDisabled && !interactionDisabled}
          keyboardType='decimal-pad'
          onChangeText={onAmountChange}
          placeholder='0.00'
          placeholderTextColor={semanticColors.placeholder}
          returnKeyType='done'
          selectTextOnFocus
          style={styles.amountInput}
          testID='expense-amount-input'
          value={amount}
        />
        {financialEditingReason ? (
          <Text accessibilityLiveRegion='polite' style={styles.financialNotice}>
            {financialEditingReason}
          </Text>
        ) : null}
      </View>

      <Text accessibilityRole='header' style={styles.sectionLabel}>
        DETAILS
      </Text>
      <AdaptiveGroupedSection>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Title</Text>
          <TextInput
            accessibilityLabel='Expense title'
            autoCapitalize='sentences'
            editable={!interactionDisabled}
            onChangeText={onTitleChange}
            placeholder='Dinner'
            placeholderTextColor={semanticColors.placeholder}
            returnKeyType='done'
            style={styles.rowInput}
            testID='expense-title-input'
            value={title}
          />
        </View>
        <TouchableOpacity
          accessibilityLabel={`Category, ${category}`}
          accessibilityRole='button'
          accessibilityState={{ disabled: interactionDisabled }}
          disabled={interactionDisabled}
          onPress={onCategoryPress}
          style={styles.row}
          testID='category-picker'
        >
          <Text style={styles.rowLabel}>Category</Text>
          <View style={styles.rowValueContainer}>
            <Text style={styles.rowValue}>{category}</Text>
            <Text accessibilityElementsHidden style={styles.chevron}>
              ›
            </Text>
          </View>
        </TouchableOpacity>
        <DatePicker
          label='Date'
          date={date}
          disabled={interactionDisabled}
          onChange={onDateChange}
          testID='date-picker'
        />
      </AdaptiveGroupedSection>

      <Text accessibilityRole='header' style={styles.sectionLabel}>
        NOTE
      </Text>
      <AdaptiveGroupedSection style={styles.noteSection}>
        <TextInput
          accessibilityLabel='Expense note'
          editable={!interactionDisabled}
          multiline
          onChangeText={onCaptionChange}
          placeholder='Add a note…'
          placeholderTextColor={semanticColors.placeholder}
          style={styles.noteInput}
          testID='expense-caption-input'
          textAlignVertical='top'
          value={caption}
        />
      </AdaptiveGroupedSection>
    </View>
  );
};

const styles = StyleSheet.create({
  amountContainer: {
    alignItems: 'center',
    marginBottom: mobileTheme.spacing.xxxl,
    paddingTop: mobileTheme.spacing.lg,
  },
  currency: {
    color: semanticColors.textMuted,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  amountInput: {
    minWidth: 180,
    color: semanticColors.text,
    fontSize: 44,
    fontWeight: '700',
    marginTop: mobileTheme.spacing.xs,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    textAlign: 'center',
  },
  financialNotice: {
    color: semanticColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: mobileTheme.spacing.sm,
    maxWidth: 320,
    textAlign: 'center',
  },
  sectionLabel: {
    color: semanticColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: mobileTheme.spacing.sm,
    marginLeft: mobileTheme.spacing.md,
    marginTop: mobileTheme.spacing.lg,
  },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: mobileTheme.spacing.lg,
    borderBottomColor: semanticColors.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    color: semanticColors.text,
    fontSize: 16,
  },
  rowInput: {
    flex: 1,
    color: semanticColors.text,
    fontSize: 16,
    marginLeft: mobileTheme.spacing.lg,
    paddingVertical: mobileTheme.spacing.md,
    textAlign: 'right',
  },
  rowValueContainer: {
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
  noteSection: {
    minHeight: 112,
  },
  noteInput: {
    minHeight: 110,
    color: semanticColors.text,
    fontSize: 16,
    lineHeight: 22,
    padding: mobileTheme.spacing.lg,
  },
});
