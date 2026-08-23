import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { ChartDataPoint } from '../../utils/calculations/insightCalculations';
import { formatMinorUnits, getCurrencyFractionDigits } from '../../utils/money';
import { mobileTheme } from '../../theme/tokens';

interface CategoryChartProps {
  data: ChartDataPoint[];
  showLegend?: boolean;
}

const CategoryChart: React.FC<CategoryChartProps> = ({
  data,
  showLegend = true,
}) => {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.chartContainer}>
          <Text style={styles.noDataText}>
            No expense data for the selected period.
          </Text>
        </View>
      </View>
    );
  }

  const dataByCurrency = Array.from(
    data.reduce<Map<string, ChartDataPoint[]>>((groups, item) => {
      const currency = item.currency ?? 'USD';
      const currencyData = groups.get(currency) ?? [];
      currencyData.push(item);
      groups.set(currency, currencyData);
      return groups;
    }, new Map()),
  );

  return (
    <View style={styles.container}>
      {dataByCurrency.map(([currency, currencyData]) => (
        <View key={currency} style={styles.currencyGroup}>
          <Text accessibilityRole='header' style={styles.currencyHeading}>
            {currency} spending
          </Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={currencyData}
              donut
              focusOnPress
              showText
              textColor={mobileTheme.colors.text}
              textSize={10}
            />
          </View>

          {showLegend && (
            <View style={styles.legendContainer}>
              {currencyData.map((item) => (
                <View
                  key={`${item.category}-${currency}`}
                  style={styles.legendItem}
                >
                  <View
                    style={[
                      styles.legendColorBox,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <Text
                    accessibilityLabel={`${item.category}, ${currency} ${item.absoluteValue.toFixed(
                      getCurrencyFractionDigits(currency) ?? 2,
                    )}, ${item.percentage.toFixed(1)} percent`}
                    style={styles.legendText}
                  >
                    {item.category}:{' '}
                    {formatMinorUnits(
                      Math.round(
                        item.absoluteValue *
                          10 ** (getCurrencyFractionDigits(currency) ?? 2),
                      ),
                      currency,
                    )}{' '}
                    ({item.percentage.toFixed(1)}%)
                  </Text>
                </View>
              ))}
            </View>
          )}
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
    marginBottom: mobileTheme.spacing.lg,
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
    marginBottom: mobileTheme.spacing.sm,
    paddingHorizontal: mobileTheme.spacing.xs,
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
});

export default CategoryChart;
