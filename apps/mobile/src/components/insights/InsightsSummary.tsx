import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CurrencyInsight } from '../../utils/calculations/insightCalculations';
import { formatMinorUnits } from '../../utils/money';
import { mobileTheme } from '../../theme/tokens';

interface InsightsSummaryProps {
  insights: CurrencyInsight[];
  priorPeriodText: string;
}

const comparisonText = (
  insight: CurrencyInsight,
  priorPeriodText: string,
): string => {
  if (insight.priorTotalMinor === 0) {
    return `No spending in ${priorPeriodText}.`;
  }
  if (insight.deltaMinor === 0) {
    return `Same as ${priorPeriodText}.`;
  }

  const direction = insight.deltaMinor > 0 ? 'more' : 'less';
  const amount = formatMinorUnits(
    Math.abs(insight.deltaMinor),
    insight.currency,
  );
  const percentage = Math.abs(insight.deltaPercentage ?? 0).toFixed(1);
  return `${amount} ${direction} than ${priorPeriodText}, ${percentage} percent.`;
};

const InsightsSummary: React.FC<InsightsSummaryProps> = ({
  insights,
  priorPeriodText,
}) => {
  if (insights.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {insights.map((insight) => {
        const total = formatMinorUnits(insight.totalMinor, insight.currency);
        const comparison = comparisonText(insight, priorPeriodText);
        return (
          <View
            accessibilityLabel={`${insight.currency} total spent ${total}. ${comparison}`}
            accessible
            key={insight.currency}
            style={styles.card}
          >
            <Text accessibilityRole='header' style={styles.currency}>
              {insight.currency}
            </Text>
            <Text style={styles.eyebrow}>TOTAL SPENT</Text>
            <Text style={styles.total}>{total}</Text>
            <Text style={styles.comparison}>{comparison}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: mobileTheme.spacing.md,
    marginBottom: mobileTheme.spacing.lg,
  },
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radii.card,
    borderWidth: 1,
    padding: mobileTheme.spacing.lg,
    ...mobileTheme.shadows.card,
  },
  currency: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  eyebrow: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: mobileTheme.spacing.sm,
  },
  total: {
    color: mobileTheme.colors.text,
    fontSize: 32,
    fontWeight: '800',
    marginTop: mobileTheme.spacing.xs,
  },
  comparison: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: mobileTheme.spacing.sm,
  },
});

export default InsightsSummary;
