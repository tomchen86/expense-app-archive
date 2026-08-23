import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import type { CurrencyInsight } from '../../utils/calculations/insightCalculations';
import { formatMinorUnits } from '../../utils/money';
import { mobileTheme } from '../../theme/tokens';

interface CategoryChartProps {
  insights: CurrencyInsight[];
}

const HORIZONTAL_BAR_ROW_HEIGHT = 44;
const HORIZONTAL_BAR_VERTICAL_PADDING = 32;

const toTestIdSegment = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const getHorizontalBarChartHeight = (categoryCount: number): number =>
  Math.max(
    200,
    categoryCount * HORIZONTAL_BAR_ROW_HEIGHT + HORIZONTAL_BAR_VERTICAL_PADDING,
  );

const CategoryChart: React.FC<CategoryChartProps> = ({ insights }) => {
  const currentInsights = insights.filter(
    (insight) => insight.exactCategories.length > 0,
  );
  if (currentInsights.length === 0) {
    return (
      <View accessibilityLiveRegion='polite' style={styles.container}>
        <View style={styles.chartContainer}>
          <Text style={styles.noDataText}>
            No expense data for the selected period.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentInsights.map((insight) => (
        <View key={insight.currency} style={styles.currencyGroup}>
          <Text accessibilityRole='header' style={styles.currencyHeading}>
            {insight.currency} categories
          </Text>

          {insight.chartKind === 'progress' ? (
            <View
              accessibilityElementsHidden
              accessible={false}
              aria-hidden
              importantForAccessibility='no-hide-descendants'
              pointerEvents='none'
              style={styles.progressTrack}
              testID='insight-progress-visual'
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: insight.exactCategories[0].color,
                    width: `${Math.min(
                      100,
                      insight.exactCategories[0].percentage,
                    )}%`,
                  },
                ]}
              />
            </View>
          ) : (
            <View
              accessibilityElementsHidden
              accessible={false}
              aria-hidden
              importantForAccessibility='no-hide-descendants'
              pointerEvents='none'
              style={[
                styles.chartContainer,
                insight.chartKind === 'bar' && {
                  height: getHorizontalBarChartHeight(
                    insight.chartCategories.length,
                  ),
                },
              ]}
              testID='insight-chart-visual'
            >
              {insight.chartKind === 'donut' ? (
                <PieChart
                  data={insight.chartCategories.map((category) => ({
                    category: category.category,
                    color: category.color,
                    value: category.value,
                  }))}
                  donut
                />
              ) : (
                <BarChart
                  barWidth={20}
                  data={insight.chartCategories.map((category) => ({
                    category: category.category,
                    frontColor: category.color,
                    label: category.category,
                    value: category.value,
                  }))}
                  disablePress
                  height={getHorizontalBarChartHeight(
                    insight.chartCategories.length,
                  )}
                  hideRules
                  horizontal
                  spacing={24}
                />
              )}
            </View>
          )}

          <View role='list' style={styles.legendContainer}>
            {insight.exactCategories.map((item) => (
              <View
                accessibilityLabel={`${item.category}, ${formatMinorUnits(
                  item.amountMinor,
                  insight.currency,
                )}, ${item.percentage.toFixed(1)} percent`}
                accessible
                key={`${item.categoryId ?? item.category}-${insight.currency}`}
                role='listitem'
                style={styles.legendItem}
                testID={`insight-category-${toTestIdSegment(
                  insight.currency,
                )}-${toTestIdSegment(item.category)}`}
              >
                <View
                  accessible={false}
                  style={[
                    styles.legendColorBox,
                    { backgroundColor: item.color },
                  ]}
                />
                <Text style={styles.legendText}>{item.category}</Text>
                <Text style={styles.legendAmount}>
                  {formatMinorUnits(item.amountMinor, insight.currency)} ·{' '}
                  {item.percentage.toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: mobileTheme.radii.card,
    padding: mobileTheme.spacing.lg,
    marginBottom: mobileTheme.spacing.xl,
  },
  currencyGroup: {
    marginBottom: mobileTheme.spacing.lg,
  },
  currencyHeading: {
    color: mobileTheme.colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    marginVertical: mobileTheme.spacing.lg,
  },
  noDataText: {
    fontSize: 16,
    color: mobileTheme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  legendContainer: {
    marginTop: mobileTheme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: mobileTheme.spacing.xs,
    paddingVertical: mobileTheme.spacing.sm,
  },
  legendColorBox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginRight: mobileTheme.spacing.sm,
  },
  legendText: {
    fontSize: 14,
    color: mobileTheme.colors.text,
    flex: 1,
  },
  legendAmount: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  progressTrack: {
    backgroundColor: mobileTheme.colors.surfaceVariant,
    borderRadius: mobileTheme.radii.pill,
    height: 16,
    marginVertical: mobileTheme.spacing.xl,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    borderRadius: mobileTheme.radii.pill,
    height: '100%',
  },
});

export default CategoryChart;
