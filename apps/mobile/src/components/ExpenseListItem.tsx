import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { Expense, ExpenseGroup } from '../types';
import {
  getExpenseCurrency,
  getExpenseSpaceKind,
} from '../utils/expenseDomain';
import { formatMinorUnits, minorUnitsToDecimalString } from '../utils/money';
import { mobileTheme } from '../theme/tokens';
import { formatLocalDateForDisplay } from '../utils/dateFormat';
import { AdaptiveSwipeAction } from './ui/adaptive-swipe-action';

interface ExpenseListItemProps {
  item: Expense;
  group: ExpenseGroup | null;
  displayAmountMinor: number;
  categoryLabel?: string;
  currency?: string;
  onPress: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

const ExpenseListItem: React.FC<ExpenseListItemProps> = ({
  item,
  group,
  displayAmountMinor,
  categoryLabel,
  currency,
  onPress,
  onDelete,
}) => {
  const isSharedExpense = getExpenseSpaceKind(item) === 'shared';
  const isHistoricalSharedExpense =
    isSharedExpense && (!group || Boolean(group.archivedAt));
  const groupBadgeLabel = group
    ? `${group.name}${group.archivedAt ? ' · Archived' : ''}`
    : 'Archived group';

  const renderDeleteAction = (
    _progress: unknown,
    _translation: unknown,
    swipeable: SwipeableMethods,
  ) => (
    <AdaptiveSwipeAction
      accessibilityLabel={`Delete ${item.title} expense`}
      accessibilityRole='button'
      label='Delete'
      onPress={() => {
        swipeable.close();
        onDelete(item);
      }}
      style={styles.deleteAction}
      tone='destructive'
    />
  );

  return (
    <ReanimatedSwipeable
      childrenContainerStyle={styles.swipeableOverflow}
      containerStyle={styles.swipeableOverflow}
      overshootRight={false}
      renderRightActions={
        isHistoricalSharedExpense ? undefined : renderDeleteAction
      }
      rightThreshold={40}
      testID={`expense-swipeable-${item.id}`}
    >
      <TouchableOpacity
        accessibilityActions={
          isHistoricalSharedExpense
            ? undefined
            : [{ name: 'delete', label: 'Delete expense' }]
        }
        accessibilityHint={
          isHistoricalSharedExpense
            ? 'Opens read-only expense details.'
            : 'Opens expense details. Swipe left for Delete.'
        }
        accessibilityLabel={`Open ${item.title} expense`}
        accessibilityRole='button'
        activeOpacity={0.82}
        onAccessibilityAction={(event) => {
          if (
            !isHistoricalSharedExpense &&
            event.nativeEvent.actionName === 'delete'
          ) {
            onDelete(item);
          }
        }}
        onPress={() => onPress(item)}
        style={[
          styles.expenseItem,
          isSharedExpense
            ? styles.sharedExpenseItem
            : styles.personalExpenseItem,
        ]}
        testID={`expense-card-${item.id}`}
      >
        <View style={styles.expenseContent}>
          <View style={styles.expenseMain}>
            <Text
              ellipsizeMode='tail'
              numberOfLines={1}
              style={styles.expenseTitle}
            >
              {item.title}
            </Text>
            <Text
              accessibilityLabel={`Expense amount ${currency ?? getExpenseCurrency(item)} ${minorUnitsToDecimalString(
                displayAmountMinor,
                currency ?? getExpenseCurrency(item),
              )}`}
              style={styles.expenseAmount}
            >
              {formatMinorUnits(
                displayAmountMinor,
                currency ?? getExpenseCurrency(item),
              )}
            </Text>
          </View>
          <View style={styles.expenseMetadata}>
            <Text
              ellipsizeMode='tail'
              numberOfLines={1}
              style={styles.expenseCategory}
            >
              {categoryLabel ?? item.category}
            </Text>
            {isSharedExpense ? (
              <View
                style={styles.groupBadge}
                testID={`expense-group-badge-${item.id}`}
              >
                <Text
                  ellipsizeMode='tail'
                  numberOfLines={1}
                  style={styles.groupBadgeText}
                >
                  {groupBadgeLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.expenseDate}>
            {formatLocalDateForDisplay(item.date)}
          </Text>
        </View>
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  swipeableOverflow: {
    overflow: 'visible',
  },
  expenseItem: {
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.card,
    borderWidth: 1,
    marginBottom: mobileTheme.spacing.md,
    minHeight: 112,
    ...mobileTheme.shadows.card,
  },
  personalExpenseItem: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
  },
  sharedExpenseItem: {
    backgroundColor: mobileTheme.colors.sharedSurface,
    borderColor: mobileTheme.colors.sharedBorder,
  },
  expenseContent: {
    flex: 1,
  },
  expenseMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: mobileTheme.spacing.xs,
  },
  expenseTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '700',
    color: mobileTheme.colors.text,
    marginRight: mobileTheme.spacing.md,
  },
  expenseAmount: {
    fontSize: 16,
    color: mobileTheme.colors.text,
    flexShrink: 0,
    fontWeight: '600',
  },
  expenseMetadata: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: mobileTheme.spacing.xs,
    minHeight: 24,
  },
  expenseCategory: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    color: mobileTheme.colors.textMuted,
    marginRight: mobileTheme.spacing.sm,
  },
  expenseDate: {
    fontSize: 14,
    color: mobileTheme.colors.textMuted,
    marginTop: mobileTheme.spacing.xs,
  },
  groupBadge: {
    backgroundColor: mobileTheme.colors.sharedBadge,
    borderRadius: mobileTheme.radii.pill,
    flexShrink: 1,
    maxWidth: '48%',
    paddingHorizontal: mobileTheme.spacing.sm,
    paddingVertical: mobileTheme.spacing.xs,
  },
  groupBadgeText: {
    color: mobileTheme.colors.sharedBadgeText,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteAction: {
    minWidth: 88,
    marginBottom: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radii.card,
  },
});

export default ExpenseListItem;
