import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { semanticColors } from '../theme/semantic-colors';
import { mobileTheme } from '../theme/tokens';
import type { Expense, Participant } from '../types';
import {
  calculateAllMemberBalancesInGroup,
  type MemberBalanceDetails,
} from '../utils/groupCalculations';
import { formatMinorUnits } from '../utils/money';
import { AdaptiveGroupedSection } from './ui/adaptive-grouped-list';
import { AdaptiveSheet } from './ui/adaptive-sheet';

interface GroupBalancesOverlayProps {
  visible: boolean;
  onClose: () => void;
  members: Participant[];
  expenses: Expense[];
  currentUserId: string;
  allParticipants?: Participant[];
}

const GroupBalancesOverlay: React.FC<GroupBalancesOverlayProps> = ({
  visible,
  onClose,
  members,
  expenses,
  currentUserId,
  allParticipants = members,
}) => {
  const memberBalanceDetails = React.useMemo(() => {
    return calculateAllMemberBalancesInGroup(
      members,
      expenses,
      allParticipants,
    );
  }, [members, expenses, allParticipants]);

  const renderMemberBalance = ({ item }: { item: MemberBalanceDetails }) => {
    const balance = item.netBalanceMinor;
    const balanceText =
      balance > 0
        ? `Is Owed ${formatMinorUnits(balance, item.currency)}`
        : balance < 0
          ? `Owes ${formatMinorUnits(Math.abs(balance), item.currency)}`
          : 'Settled up';

    return (
      <View style={styles.memberItem}>
        <View style={styles.memberSummary}>
          <Text numberOfLines={1} style={styles.memberName}>
            {item.memberName}
            {item.memberId === currentUserId ? ' (You)' : ''}
          </Text>
          <Text
            style={[
              styles.memberBalance,
              balance > 0 && styles.positiveBalance,
              balance < 0 && styles.negativeBalance,
            ]}
          >
            {balanceText}
          </Text>
        </View>
        <Text style={styles.balanceDetail}>
          Paid {formatMinorUnits(item.totalPaidMinor, item.currency)} · Share{' '}
          {formatMinorUnits(item.totalShareMinor, item.currency)}
        </Text>
      </View>
    );
  };

  return (
    <AdaptiveSheet
      onClose={onClose}
      title='Balances'
      trailingAction={{ label: 'Done', onPress: onClose }}
      visible={visible}
    >
      <View style={styles.content}>
        <AdaptiveGroupedSection style={styles.listSection}>
          <FlatList
            data={memberBalanceDetails}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyExtractor={(item) => `${item.memberId}:${item.currency}`}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No balances to show.</Text>
            }
            renderItem={renderMemberBalance}
          />
        </AdaptiveGroupedSection>
      </View>
    </AdaptiveSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingTop: mobileTheme.spacing.xl,
  },
  listSection: {
    flexShrink: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: mobileTheme.spacing.lg,
    backgroundColor: semanticColors.separator,
  },
  memberItem: {
    minHeight: 72,
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingVertical: mobileTheme.spacing.md,
    backgroundColor: semanticColors.surface,
  },
  memberSummary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: mobileTheme.spacing.md,
  },
  memberName: {
    flex: 1,
    color: semanticColors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  memberBalance: {
    color: semanticColors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  positiveBalance: {
    color: semanticColors.primary,
  },
  negativeBalance: {
    color: semanticColors.destructive,
  },
  balanceDetail: {
    marginTop: mobileTheme.spacing.xs,
    color: semanticColors.textMuted,
    fontSize: 13,
  },
  emptyText: {
    padding: mobileTheme.spacing.xxl,
    color: semanticColors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default GroupBalancesOverlay;
