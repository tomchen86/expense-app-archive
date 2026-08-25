import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';

import { useInsightsData } from '../src/hooks/useInsightsData';
import CategoryChart from '../src/components/insights/CategoryChart';
import InsightsHeader from '../src/components/insights/InsightsHeader';
import DatePickerModal from '../src/components/insights/DatePickerModal';
import InsightsSummary from '../src/components/insights/InsightsSummary';
import InsightsChartHeaderAction from '../src/components/insights/insights-chart-header-action';
import { mobileTheme } from '../src/theme/tokens';

const ExpenseInsightsScreen = () => {
  const params = useLocalSearchParams();
  const { contextType, contextId, initialDate } = params;

  const insightsData = useInsightsData({
    contextType: contextType as 'personal' | 'group',
    contextId: contextId as string,
    initialDate: typeof initialDate === 'string' ? initialDate : undefined,
  });

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: insightsData.screenTitle }} />
      {insightsData.hasAvailablePeriods ? (
        <InsightsChartHeaderAction
          onChange={insightsData.setChartPreference}
          preference={insightsData.chartPreference}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior='automatic'
        style={styles.container}
      >
        {insightsData.hasAvailablePeriods ? (
          <>
            <InsightsHeader
              aggregation={insightsData.aggregation}
              onAggregationChange={insightsData.setAggregation}
              displayPeriodText={insightsData.displayPeriodText}
              hasMultiplePeriods={insightsData.hasMultiplePeriods}
              onPeriodPress={() => insightsData.setShowDatePickers(true)}
              onPreviousPeriod={insightsData.handlePreviousPeriod}
              onNextPeriod={insightsData.handleNextPeriod}
              isNextDisabled={insightsData.isNextDisabled}
              isPreviousDisabled={insightsData.isPreviousDisabled}
            />

            <InsightsSummary
              insights={insightsData.currencyInsights}
              priorPeriodText={insightsData.previousPeriodText}
            />

            <CategoryChart insights={insightsData.currencyInsights} />

            <DatePickerModal
              visible={insightsData.showDatePickers}
              onClose={() => insightsData.setShowDatePickers(false)}
              aggregation={insightsData.aggregation}
              selectedYear={insightsData.selectedYear}
              selectedMonth={insightsData.selectedMonth}
              onSelectPeriod={insightsData.selectPeriod}
              availablePeriods={insightsData.availablePeriods}
            />
          </>
        ) : (
          <View accessibilityLiveRegion='polite' style={styles.emptyState}>
            <Text accessibilityRole='header' style={styles.emptyTitle}>
              No expenses yet
            </Text>
            <Text style={styles.emptyBody}>
              Add an expense to see spending insights.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  content: {
    padding: mobileTheme.spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: mobileTheme.spacing.xxl,
    paddingTop: 120,
  },
  emptyTitle: {
    color: mobileTheme.colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: mobileTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: mobileTheme.spacing.sm,
    textAlign: 'center',
  },
});

export default ExpenseInsightsScreen;
