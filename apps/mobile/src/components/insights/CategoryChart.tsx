import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import type { CurrencyInsight } from '../../utils/calculations/insightCalculations';
import { formatMinorUnits } from '../../utils/money';
import { mobileTheme } from '../../theme/tokens';

interface CategoryChartProps {
  insights: CurrencyInsight[];
}

const HORIZONTAL_BAR_ROW_HEIGHT = 44;

const toTestIdSegment = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const getHorizontalBarChartHeight = (categoryCount: number): number =>
  Math.max(96, categoryCount * HORIZONTAL_BAR_ROW_HEIGHT);

const HorizontalBarVisual = ({
  categories,
  currency,
}: {
  categories: CurrencyInsight['chartCategories'];
  currency: string;
}) => {
  const maxValue = Math.max(0, ...categories.map((category) => category.value));

  return (
    <View
      style={[
        styles.barVisual,
        { height: getHorizontalBarChartHeight(categories.length) },
      ]}
      testID='insight-bar-visual'
    >
      {categories.map((category) => {
        const width = maxValue > 0 ? (category.value / maxValue) * 100 : 0;
        const categoryKey = toTestIdSegment(
          category.categoryId ?? category.category,
        );

        return (
          <View
            key={`${categoryKey}-${currency}`}
            style={styles.barRow}
            testID={`insight-bar-track-${toTestIdSegment(
              currency,
            )}-${categoryKey}`}
          >
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: category.color,
                    width: `${Math.min(100, Math.max(0, width))}%`,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

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
                styles.chartVisualContainer,
                insight.chartKind === 'bar'
                  ? styles.barChartContainer
                  : styles.donutChartContainer,
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
                  innerCircleColor={mobileTheme.colors.surface}
                />
              ) : (
                <HorizontalBarVisual
                  categories={insight.chartCategories}
                  currency={insight.currency}
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
                <Text
                  ellipsizeMode='tail'
                  numberOfLines={1}
                  style={styles.legendText}
                >
                  {item.category}
                </Text>
                <Text numberOfLines={1} style={styles.legendAmount}>
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
  chartVisualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: mobileTheme.spacing.lg,
    width: '100%',
  },
  donutChartContainer: {
    minHeight: 200,
  },
  barChartContainer: {
    overflow: 'hidden',
  },
  barVisual: {
    overflow: 'hidden',
    width: '100%',
  },
  barRow: {
    height: HORIZONTAL_BAR_ROW_HEIGHT,
    justifyContent: 'center',
    width: '100%',
  },
  barTrack: {
    backgroundColor: mobileTheme.colors.surfaceVariant,
    borderRadius: mobileTheme.radii.pill,
    height: 18,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    borderRadius: mobileTheme.radii.pill,
    height: '100%',
    minWidth: 2,
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
    flexShrink: 1,
    marginRight: mobileTheme.spacing.sm,
  },
  legendAmount: {
    color: mobileTheme.colors.text,
    flexShrink: 0,
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
