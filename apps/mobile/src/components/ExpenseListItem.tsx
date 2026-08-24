import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { Expense, ExpenseGroup } from '../types';
import {
  getExpenseCurrency,
  getExpenseShares,
  getExpenseSpaceKind,
} from '../utils/expenseDomain';
import { formatMinorUnits, minorUnitsToDecimalString } from '../utils/money';
import { mobileTheme } from '../theme/tokens';
import { formatLocalDateForDisplay } from '../utils/dateFormat';

interface ExpenseListItemProps {
  item: Expense;
  group: ExpenseGroup | null;
  currentParticipantIds?: readonly string[];
  displayAmountMinor: number;
  currency?: string;
  onPress: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

const ExpenseListItem: React.FC<ExpenseListItemProps> = ({
  item,
  group,
  currentParticipantIds = [],
  displayAmountMinor,
  currency,
  onPress,
  onDelete,
}) => {
  const currentParticipantIdSet = new Set(currentParticipantIds);
  const isSharedExpense = getExpenseSpaceKind(item) === 'shared';
  const isHistoricalSharedExpense =
    isSharedExpense && (!group || Boolean(group.archivedAt));
  const currentUserShareMinor = getExpenseShares(item)
    .filter((share) => currentParticipantIdSet.has(share.participantId))
    .reduce((sum, share) => sum + share.amountMinor, 0);
  const sharedContext = isSharedExpense
    ? `${group ? `${group.name}${group.archivedAt ? ' (Archived)' : ''}` : 'Archived group'} · Your share ${
        currentParticipantIdSet.size > 0
          ? formatMinorUnits(
              currentUserShareMinor,
              currency ?? getExpenseCurrency(item),
            )
          : 'unavailable'
      }`
    : null;

  const renderDeleteAction = (
    _progress: unknown,
    _translation: unknown,
    swipeable: SwipeableMethods,
  ) => (
    <TouchableOpacity
      accessibilityLabel={`Delete ${item.title} expense`}
      accessibilityRole='button'
      onPress={() => {
        swipeable.close();
        onDelete(item);
      }}
      style={styles.deleteAction}
    >
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <ReanimatedSwipeable
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
        style={styles.expenseItem}
      >
        <View style={styles.expenseContent}>
          <View style={styles.expenseMain}>
            <Text style={styles.expenseTitle}>{item.title}</Text>
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
          <View style={styles.expenseDetails}>
            <Text style={styles.expenseCategory}>{item.category}</Text>
            {sharedContext ? (
              <Text style={styles.sharedContext}>{sharedContext}</Text>
            ) : null}
            <Text style={styles.expenseDate}>
              {formatLocalDateForDisplay(item.date)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  expenseItem: {
    backgroundColor: mobileTheme.colors.surface,
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.card,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
    marginBottom: mobileTheme.spacing.md,
    ...mobileTheme.shadows.card,
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
    fontWeight: '600',
  },
  expenseDetails: {},
  expenseCategory: {
    fontSize: 14,
    color: mobileTheme.colors.textMuted,
    marginTop: mobileTheme.spacing.xs,
  },
  expenseDate: {
    fontSize: 14,
    color: mobileTheme.colors.textMuted,
    marginTop: mobileTheme.spacing.xs,
  },
  sharedContext: {
    fontSize: 14,
    color: mobileTheme.colors.text,
    fontWeight: '600',
    marginTop: mobileTheme.spacing.xs,
  },
  deleteAction: {
    minWidth: 88,
    marginBottom: mobileTheme.spacing.md,
    backgroundColor: mobileTheme.colors.danger,
    borderRadius: mobileTheme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionText: {
    color: mobileTheme.colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ExpenseListItem;
