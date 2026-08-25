import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CurrencyInsight } from '../../utils/calculations/insightCalculations';
import { formatMinorUnits } from '../../utils/money';
import { mobileTheme } from '../../theme/tokens';

interface InsightsSummaryProps {
  insights: CurrencyInsight[];
  priorPeriodText: string | null;
}

const comparisonText = (
  insight: CurrencyInsight,
  priorPeriodText: string | null,
): string | null => {
  if (!priorPeriodText) {
    return null;
  }
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
            accessibilityLabel={
              comparison
                ? `Total spent ${total}. ${comparison}`
                : `Total spent ${total}.`
            }
            accessible
            key={insight.currency}
            style={styles.card}
          >
            <Text accessibilityRole='header' style={styles.eyebrow}>
              TOTAL SPENT
            </Text>
            <Text style={styles.total}>{total}</Text>
            {comparison ? (
              <Text style={styles.comparison}>{comparison}</Text>
            ) : null}
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
  eyebrow: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
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
