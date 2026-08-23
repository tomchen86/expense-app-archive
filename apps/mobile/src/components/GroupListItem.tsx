import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ExpenseGroup } from '../types';
import type { CurrentUserGroupCurrencySummary } from '../utils/groupCalculations';
import { formatMinorUnits } from '../utils/money';
import { mobileTheme } from '../theme/tokens';
import { isExpenseGroupArchived } from '../utils/groupDomain';

interface GroupListItemProps {
  group: ExpenseGroup;
  summary: CurrentUserGroupCurrencySummary[] | null;
  isLifecyclePending?: boolean;
  onArchiveGroup: (groupId: string) => void | Promise<unknown>;
  onRestoreGroup: (groupId: string) => void | Promise<unknown>;
  onPress: (groupId: string) => void;
}

const getBalanceCopy = (item: CurrentUserGroupCurrencySummary): string =>
  item.myNetBalanceMinor > 0
    ? `You're owed: ${formatMinorUnits(item.myNetBalanceMinor, item.currency)}`
    : item.myNetBalanceMinor < 0
      ? `You owe: ${formatMinorUnits(
          Math.abs(item.myNetBalanceMinor),
          item.currency,
        )}`
      : 'Settled up';

const getSummaryAccessibilityText = (
  isArchived: boolean,
  summary: CurrentUserGroupCurrencySummary[] | null,
): string => {
  if (isArchived) {
    return 'Archived group';
  }
  if (summary === null) {
    return 'Your balance is unavailable';
  }
  if (summary.length === 0) {
    return 'No spending yet';
  }
  return summary
    .map(
      (item) =>
        `Your share: ${formatMinorUnits(item.myShareMinor, item.currency)}. ${getBalanceCopy(item)}`,
    )
    .join('. ');
};

const GroupListItem: React.FC<GroupListItemProps> = ({
  group,
  summary,
  isLifecyclePending = false,
  onArchiveGroup,
  onRestoreGroup,
  onPress,
}) => {
  const isArchived = isExpenseGroupArchived(group);

  const card = (
    <TouchableOpacity
      accessibilityActions={
        isArchived || isLifecyclePending
          ? undefined
          : [{ label: 'Archive group', name: 'archive' }]
      }
      accessibilityHint={
        isArchived
          ? 'Opens archived group details'
          : 'Opens group details. Swipe left for Archive.'
      }
      accessibilityLabel={`Open ${group.name}`}
      accessibilityRole='button'
      accessibilityValue={{
        text: getSummaryAccessibilityText(isArchived, summary),
      }}
      activeOpacity={0.82}
      onAccessibilityAction={(event) => {
        if (!isLifecyclePending && event.nativeEvent.actionName === 'archive') {
          void onArchiveGroup(group.id);
        }
      }}
      onPress={() => onPress(group.id)}
      style={styles.groupCard}
      testID={`group-card-${group.id}`}
    >
      <Text style={styles.groupName}>{group.name}</Text>
      {isArchived ? (
        <Text style={styles.archivedStatus}>Archived group</Text>
      ) : summary === null ? (
        <Text style={styles.emptySummary}>Your balance is unavailable</Text>
      ) : summary.length === 0 ? (
        <Text style={styles.emptySummary}>No spending yet</Text>
      ) : (
        summary.map((item) => (
          <View key={item.currency} style={styles.summaryRow}>
            <Text style={styles.shareText}>
              Your share: {formatMinorUnits(item.myShareMinor, item.currency)}
            </Text>
            <Text style={styles.balanceText}>{getBalanceCopy(item)}</Text>
          </View>
        ))
      )}
    </TouchableOpacity>
  );

  if (isArchived) {
    return (
      <View style={styles.archivedCardContainer}>
        {card}
        <TouchableOpacity
          accessibilityLabel={`Restore ${group.name}`}
          accessibilityRole='button'
          accessibilityState={{
            busy: isLifecyclePending,
            disabled: isLifecyclePending,
          }}
          disabled={isLifecyclePending}
          onPress={() => void onRestoreGroup(group.id)}
          style={styles.restoreButton}
        >
          <Text style={styles.restoreButtonText}>Restore</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderArchiveAction = (
    _progress: unknown,
    _translation: unknown,
    swipeable: SwipeableMethods,
  ) => (
    <TouchableOpacity
      accessibilityLabel={`Archive ${group.name}`}
      accessibilityRole='button'
      accessibilityState={{
        busy: isLifecyclePending,
        disabled: isLifecyclePending,
      }}
      disabled={isLifecyclePending}
      onPress={() => {
        swipeable.close();
        void onArchiveGroup(group.id);
      }}
      style={styles.archiveSwipeAction}
    >
      <Text style={styles.archiveSwipeActionText}>Archive</Text>
    </TouchableOpacity>
  );

  return (
    <ReanimatedSwipeable
      overshootRight={false}
      renderRightActions={renderArchiveAction}
      rightThreshold={40}
      testID={`group-swipeable-${group.id}`}
    >
      {card}
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  groupCard: {
    backgroundColor: mobileTheme.colors.surface,
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.card,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
    marginBottom: mobileTheme.spacing.lg,
    ...mobileTheme.shadows.card,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: mobileTheme.colors.text,
  },
  restoreButton: {
    minHeight: 44,
    alignSelf: 'flex-end',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.control,
    marginTop: -4,
    marginBottom: mobileTheme.spacing.lg,
    backgroundColor: mobileTheme.colors.primary,
  },
  restoreButtonText: {
    color: mobileTheme.colors.onPrimary,
    fontWeight: '600',
  },
  archivedCardContainer: {
    marginBottom: mobileTheme.spacing.xs,
  },
  archivedStatus: {
    color: mobileTheme.colors.textMuted,
    fontSize: 15,
    marginTop: mobileTheme.spacing.sm,
  },
  emptySummary: {
    color: mobileTheme.colors.textMuted,
    fontSize: 15,
    marginTop: mobileTheme.spacing.sm,
  },
  summaryRow: {
    marginTop: mobileTheme.spacing.md,
  },
  shareText: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  balanceText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    marginTop: mobileTheme.spacing.xs,
  },
  archiveSwipeAction: {
    minWidth: 88,
    marginBottom: mobileTheme.spacing.lg,
    backgroundColor: mobileTheme.colors.textMuted,
    borderRadius: mobileTheme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveSwipeActionText: {
    color: mobileTheme.colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default GroupListItem;
