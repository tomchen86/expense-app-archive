import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
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
      <InsightsChartHeaderAction
        onChange={insightsData.setChartPreference}
        preference={insightsData.chartPreference}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior='automatic'
        style={styles.container}
      >
        <InsightsHeader
          aggregation={insightsData.aggregation}
          onAggregationChange={insightsData.setAggregation}
          displayPeriodText={insightsData.displayPeriodText}
          onPeriodPress={() => insightsData.setShowDatePickers(true)}
          onPreviousPeriod={insightsData.handlePreviousPeriod}
          onNextPeriod={insightsData.handleNextPeriod}
          isNextDisabled={insightsData.isNextDisabled}
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
          onYearChange={insightsData.setSelectedYear}
          onMonthChange={insightsData.setSelectedMonth}
          availableYears={insightsData.availableYears}
          monthNames={insightsData.monthNames}
          currentYear={insightsData.currentYear}
          currentMonth={insightsData.currentMonth}
        />
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
});

export default ExpenseInsightsScreen;
