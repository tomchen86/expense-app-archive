import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Expense, ExpenseGroup, Participant } from '../types'; // Import necessary types
import {
  getExpenseCurrency,
  getExpensePayments,
  getExpenseSpaceKind,
} from '../utils/expenseDomain';
import { formatMinorUnits } from '../utils/money';
import { mobileTheme } from '../theme/tokens';

interface ExpenseListItemProps {
  item: Expense;
  group: ExpenseGroup | null;
  allParticipants: Participant[]; // Add allParticipants prop
  displayAmountMinor: number;
  currency?: string;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

const ExpenseListItem: React.FC<ExpenseListItemProps> = ({
  item,
  group,
  allParticipants, // Destructure the new prop
  displayAmountMinor,
  currency,
  onEdit,
  onDelete,
}) => {
  // Safeguard: Ensure allParticipants is defined before calling .find()
  const payerId = getExpensePayments(item)[0]?.participantId;
  const payer =
    payerId && allParticipants
      ? allParticipants.find((p) => p.id === payerId)
      : null;
  const isHistoricalSharedExpense =
    getExpenseSpaceKind(item) === 'shared' &&
    (!group || Boolean(group.archivedAt));

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => onDelete(item.id),
          style: 'destructive',
        },
      ],
    );
  };

  return (
    <View style={styles.expenseItem}>
      {/* Main Content Area */}
      <View style={styles.expenseContent}>
        <View style={styles.expenseMain}>
          <Text style={styles.expenseTitle}>{item.title}</Text>
          {/* Use displayAmount for rendering */}
          <Text style={styles.expenseAmount}>
            {formatMinorUnits(
              displayAmountMinor,
              currency ?? getExpenseCurrency(item),
            )}
          </Text>
        </View>
        <View style={styles.expenseDetails}>
          <View style={styles.expenseMetadata}>
            <Text style={styles.expenseCategory}>{item.category}</Text>
            {/* Display group tag if group exists */}
            {group && (
              <View style={styles.groupTag}>
                <Text style={styles.groupTagText}>{group.name}</Text>
              </View>
            )}
          </View>
          {payer && (
            <Text style={styles.paidByText}>Paid by: {payer.name}</Text>
          )}
          <Text style={styles.expenseDate}>{item.date}</Text>
          {/* Display caption if it exists */}
          {item.caption && (
            <Text style={styles.expenseCaption}>{item.caption}</Text>
          )}
        </View>
      </View>

      {isHistoricalSharedExpense ? (
        <Text accessibilityRole='text' style={styles.readOnlyLabel}>
          {group ? 'Archived shared history' : 'Historical shared expense'}
        </Text>
      ) : (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            accessibilityLabel={`Edit ${item.title}`}
            accessibilityRole='button'
            style={styles.editButton}
            onPress={() => onEdit(item)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel={`Delete ${item.title}`}
            accessibilityRole='button'
            style={styles.deleteButton}
            onPress={handleDeletePress}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Align buttons to the right
    marginTop: mobileTheme.spacing.md,
    gap: mobileTheme.spacing.sm,
  },
  readOnlyLabel: {
    alignSelf: 'flex-start',
    marginTop: mobileTheme.spacing.md,
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  editButton: {
    minHeight: 44,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    backgroundColor: mobileTheme.colors.primaryContainer,
    borderRadius: mobileTheme.radii.control,
    justifyContent: 'center',
  },
  editButtonText: {
    color: mobileTheme.colors.onPrimaryContainer,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    minHeight: 44,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    backgroundColor: mobileTheme.colors.danger,
    borderRadius: mobileTheme.radii.control,
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: mobileTheme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ExpenseListItem;
