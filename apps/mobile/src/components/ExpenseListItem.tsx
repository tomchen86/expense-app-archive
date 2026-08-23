import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Expense, ExpenseGroup, Participant } from '../types'; // Import necessary types
import {
  getExpenseCurrency,
  getExpensePayments,
  getExpenseSpaceKind,
} from '../utils/expenseDomain';
import { formatMinorUnits, minorUnitsToDecimalString } from '../utils/money';
import { mobileTheme } from '../theme/tokens';
import { formatLocalDateForDisplay } from '../utils/dateFormat';

interface ExpenseListItemProps {
  item: Expense;
  group: ExpenseGroup | null;
  allParticipants: Participant[]; // Add allParticipants prop
  displayAmountMinor: number;
  currency?: string;
  onPress: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

const ExpenseListItem: React.FC<ExpenseListItemProps> = ({
  item,
  group,
  allParticipants, // Destructure the new prop
  displayAmountMinor,
  currency,
  onPress,
  onDelete,
}) => {
  // Safeguard: Ensure allParticipants is defined before calling .find()
  const payerIds = [
    ...new Set(
      getExpensePayments(item)
        .filter((payment) => payment.amountMinor > 0)
        .map((payment) => payment.participantId),
    ),
  ];
  const payerSummary =
    payerIds.length === 1
      ? (allParticipants.find((participant) => participant.id === payerIds[0])
          ?.name ?? 'Former member')
      : payerIds.length > 1
        ? `${payerIds.length} people`
        : null;
  const isHistoricalSharedExpense =
    getExpenseSpaceKind(item) === 'shared' &&
    (!group || Boolean(group.archivedAt));

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
      renderRightActions={renderDeleteAction}
      rightThreshold={40}
      testID={`expense-swipeable-${item.id}`}
    >
      <TouchableOpacity
        accessibilityActions={[{ name: 'delete', label: 'Delete expense' }]}
        accessibilityHint='Opens expense details. Swipe left for Delete.'
        accessibilityLabel={`Open ${item.title} expense`}
        accessibilityRole='button'
        activeOpacity={0.82}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'delete') {
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
            <View style={styles.expenseMetadata}>
              <Text style={styles.expenseCategory}>{item.category}</Text>
              {group && (
                <View style={styles.groupTag}>
                  <Text style={styles.groupTagText}>{group.name}</Text>
                </View>
              )}
            </View>
            {payerSummary && (
              <Text style={styles.paidByText}>Paid by: {payerSummary}</Text>
            )}
            <Text style={styles.expenseDate}>
              {formatLocalDateForDisplay(item.date)}
            </Text>
            {item.caption && (
              <Text style={styles.expenseCaption}>{item.caption}</Text>
            )}
          </View>
        </View>
        {isHistoricalSharedExpense ? (
          <Text accessibilityRole='text' style={styles.readOnlyLabel}>
            {group ? 'Archived shared history' : 'Historical shared expense'}
          </Text>
        ) : null}
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
};

// Styles copied and adapted from HomeScreen.tsx
const styles = StyleSheet.create({
  expenseItem: {
    backgroundColor: mobileTheme.colors.surface,
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.card,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
    marginBottom: mobileTheme.spacing.md,
    ...mobileTheme.shadows.card,
    // Consider adding flexDirection: 'row' if actions should be beside content
    // flexDirection: 'row',
    // alignItems: 'center',
  },
  expenseContent: {
    flex: 1, // Takes available space if row direction is used
    // marginRight: 10, // Add margin if actions are beside content
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
    // flexShrink: 1, // Allow title to shrink if too long
  },
  expenseAmount: {
    fontSize: 16,
    color: mobileTheme.colors.success,
    fontWeight: '600',
  },
  expenseDetails: {
    // No changes needed here for now
  },
  expenseMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileTheme.spacing.sm,
    marginTop: mobileTheme.spacing.xs,
  },
  expenseCategory: {
    fontSize: 14,
    color: mobileTheme.colors.textMuted,
  },
  groupTag: {
    backgroundColor: mobileTheme.colors.primaryContainer,
    paddingHorizontal: mobileTheme.spacing.sm,
    paddingVertical: mobileTheme.spacing.xs,
    borderRadius: mobileTheme.radii.pill,
  },
  groupTagText: {
    color: mobileTheme.colors.onPrimaryContainer,
    fontSize: 12,
    fontWeight: '600',
  },
  expenseDate: {
    fontSize: 14,
    color: mobileTheme.colors.textMuted,
    marginTop: mobileTheme.spacing.xs,
  },
  expenseCaption: {
    fontSize: 14,
    color: mobileTheme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: mobileTheme.spacing.xs,
  },
  paidByText: {
    fontSize: 13,
    color: mobileTheme.colors.textMuted,
    marginTop: mobileTheme.spacing.xs,
  },
  readOnlyLabel: {
    alignSelf: 'flex-start',
    marginTop: mobileTheme.spacing.md,
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
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
