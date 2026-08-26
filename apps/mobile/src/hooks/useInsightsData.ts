import { useCallback, useEffect, useMemo, useState } from 'react';
import { useExpenseStore } from '../store/expenseStore';
import {
  getRelevantExpenses,
  filterExpensesByDate,
  type ChartDataPoint,
  buildCurrencyInsights,
  type CurrencyInsight,
  type InsightChartPreference,
} from '../utils/calculations/insightCalculations';
import {
  resolvePersonalParticipantIds,
  selectPersonalLedgerExpenses,
  sumPersonalShareMinor,
} from '../utils/personalExpenseSelection';
import { useExpenseDeletion } from '../components/feedback/expense-deletion-context';
import { parseLocalCalendarDate } from '../utils/money';

interface UseInsightsDataProps {
  contextType: 'personal' | 'group';
  contextId: string;
  initialDate?: Date | string;
}

export interface InsightPeriod {
  key: string;
  label: string;
  month: number;
  year: number;
}

interface UseInsightsDataReturn {
  // Data
  chartData: ChartDataPoint[];
  currencyInsights: CurrencyInsight[];
  screenTitle: string;
  previousPeriodText: string | null;
  chartPreference: InsightChartPreference;

  // Date/Period State
  aggregation: 'month' | 'year';
  selectedYear: number;
  selectedMonth: number;
  displayPeriodText: string;
  selectedPeriodKey: string | null;
  hasAvailablePeriods: boolean;
  hasMultiplePeriods: boolean;
  isNextDisabled: boolean;
  isPreviousDisabled: boolean;

  // Date Picker State
  showDatePickers: boolean;
  availablePeriods: InsightPeriod[];
  availableYears: number[];
  monthNames: string[];
  currentYear: number;
  currentMonth: number;

  // Actions
  setAggregation: (aggregation: 'month' | 'year') => void;
  setChartPreference: (preference: InsightChartPreference) => void;
  handlePreviousPeriod: () => void;
  handleNextPeriod: () => void;
  setShowDatePickers: (show: boolean) => void;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
  selectPeriod: (period: InsightPeriod) => void;
}

const comparePeriods = (left: InsightPeriod, right: InsightPeriod) =>
  left.year - right.year || left.month - right.month;

const matchesPeriod = (
  period: InsightPeriod,
  aggregation: 'month' | 'year',
  year: number,
  month: number,
) => period.year === year && (aggregation === 'year' || period.month === month);

export const useInsightsData = ({
  contextType,
  contextId,
  initialDate,
}: UseInsightsDataProps): UseInsightsDataReturn => {
  const allExpenses = useExpenseStore((state) => state.expenses);
  const internalUserId = useExpenseStore((state) => state.internalUserId);
  const personalParticipantId = useExpenseStore(
    (state) => state.personalParticipantId,
  );
  const personalSpaceId = useExpenseStore((state) => state.personalSpaceId);
  const participants = useExpenseStore((state) => state.participants);
  const appCategories = useExpenseStore((state) => state.categories);
  const settings = useExpenseStore((state) => state.settings);
  const updateSettings = useExpenseStore((state) => state.updateSettings);
  const { pendingExpenseDeletionIds } = useExpenseDeletion();

  const visibleExpenses = useMemo(() => {
    const pendingIds = new Set(pendingExpenseDeletionIds);
    return allExpenses.filter((expense) => !pendingIds.has(expense.id));
  }, [allExpenses, pendingExpenseDeletionIds]);

  const monthNames = useMemo(
    () => [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    [],
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const personalParticipantIds = useMemo(
    () =>
      resolvePersonalParticipantIds({
        internalUserId,
        participants,
        personalParticipantId,
      }),
    [internalUserId, participants, personalParticipantId],
  );

  const relevantExpenses = useMemo(() => {
    return contextType === 'personal'
      ? selectPersonalLedgerExpenses(visibleExpenses, {
          participantIds: personalParticipantIds,
          personalSpaceId,
        })
      : getRelevantExpenses(
          visibleExpenses,
          contextType,
          contextId,
          personalParticipantId,
          personalSpaceId,
          personalParticipantIds,
        );
  }, [
    visibleExpenses,
    contextType,
    contextId,
    personalParticipantId,
    personalSpaceId,
    personalParticipantIds,
  ]);

  const availableMonthPeriods = useMemo(() => {
    const periods = new Map<string, InsightPeriod>();
    relevantExpenses.forEach((expense) => {
      const date = parseLocalCalendarDate(expense.date);
      if (!date) {
        return;
      }
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `month:${year}-${month}`;
      periods.set(key, {
        key,
        label: `${monthNames[month]} ${year}`,
        month,
        year,
      });
    });
    return [...periods.values()].sort(comparePeriods);
  }, [monthNames, relevantExpenses]);

  const availableYearPeriods = useMemo(() => {
    const periods = new Map<number, InsightPeriod>();
    availableMonthPeriods.forEach((period) => {
      periods.set(period.year, {
        key: `year:${period.year}`,
        label: period.year.toString(),
        month: period.month,
        year: period.year,
      });
    });
    return [...periods.values()].sort(comparePeriods);
  }, [availableMonthPeriods]);

  const parsedInitialDate =
    typeof initialDate === 'string'
      ? parseLocalCalendarDate(initialDate)
      : initialDate;
  const requestedInitialPeriod = parsedInitialDate
    ? availableMonthPeriods.find(
        (period) =>
          period.year === parsedInitialDate.getFullYear() &&
          period.month === parsedInitialDate.getMonth(),
      )
    : undefined;
  const initialPeriod =
    requestedInitialPeriod ?? availableMonthPeriods.at(-1) ?? null;

  const [aggregation, setAggregation] = useState<'month' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(
    initialPeriod?.year ?? currentYear,
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    initialPeriod?.month ?? currentMonth,
  );
  const [showDatePickers, setShowDatePickers] = useState(false);
  const screenTitle = 'Insights';
  const chartPreference: InsightChartPreference =
    settings.insightsChartPreference ?? 'auto';

  const availablePeriods =
    aggregation === 'month' ? availableMonthPeriods : availableYearPeriods;
  const availableYears = useMemo(
    () => availableYearPeriods.map((period) => period.year),
    [availableYearPeriods],
  );
  const selectedPeriodIndex = availablePeriods.findIndex((period) =>
    matchesPeriod(period, aggregation, selectedYear, selectedMonth),
  );
  const selectedPeriod =
    selectedPeriodIndex >= 0 ? availablePeriods[selectedPeriodIndex] : null;
  const hasAvailablePeriods = availablePeriods.length > 0;
  const hasMultiplePeriods = availablePeriods.length > 1;
  const isPreviousDisabled = selectedPeriodIndex <= 0;
  const isNextDisabled =
    selectedPeriodIndex < 0 ||
    selectedPeriodIndex >= availablePeriods.length - 1;
  const displayPeriodText = selectedPeriod?.label ?? '';

  const applyPeriod = useCallback((period: InsightPeriod) => {
    setSelectedYear(period.year);
    setSelectedMonth(period.month);
  }, []);

  useEffect(() => {
    if (availablePeriods.length === 0) {
      setShowDatePickers(false);
      return;
    }
    if (selectedPeriodIndex >= 0) {
      return;
    }

    const sameYearPeriod = [...availablePeriods]
      .reverse()
      .find((period) => period.year === selectedYear);
    applyPeriod(sameYearPeriod ?? availablePeriods.at(-1)!);
  }, [applyPeriod, availablePeriods, selectedPeriodIndex, selectedYear]);

  const filteredExpenses = useMemo(() => {
    if (!selectedPeriod) {
      return [];
    }
    return filterExpensesByDate(
      relevantExpenses,
      aggregation,
      selectedPeriod.year,
      selectedPeriod.month,
    );
  }, [relevantExpenses, aggregation, selectedPeriod]);

  const previousPeriod =
    selectedPeriodIndex > 0 ? availablePeriods[selectedPeriodIndex - 1] : null;
  const previousExpenses = useMemo(() => {
    if (!previousPeriod) {
      return [];
    }
    return filterExpensesByDate(
      relevantExpenses,
      aggregation,
      previousPeriod.year,
      previousPeriod.month,
    );
  }, [relevantExpenses, aggregation, previousPeriod]);
  const previousPeriodText = previousPeriod?.label ?? null;

  const amountMinorSelector = useMemo(
    () =>
      contextType === 'personal'
        ? (expense: Parameters<typeof sumPersonalShareMinor>[0]) =>
            sumPersonalShareMinor(
              expense,
              personalParticipantIds,
              personalSpaceId,
            )
        : undefined,
    [contextType, personalParticipantIds, personalSpaceId],
  );

  const currencyInsights = useMemo(() => {
    return buildCurrencyInsights({
      currentExpenses: filteredExpenses,
      priorExpenses: previousExpenses,
      categories: appCategories,
      preference: chartPreference,
      amountMinorSelector,
    });
  }, [
    filteredExpenses,
    previousExpenses,
    appCategories,
    chartPreference,
    amountMinorSelector,
  ]);
  const chartData = useMemo(
    () => currencyInsights.flatMap((insight) => insight.exactCategories),
    [currencyInsights],
  );

  const setChartPreference = useCallback(
    (preference: InsightChartPreference) => {
      updateSettings({ insightsChartPreference: preference });
    },
    [updateSettings],
  );

  const handleAggregation = useCallback(
    (nextAggregation: 'month' | 'year') => {
      if (nextAggregation === aggregation) {
        return;
      }
      const nextPeriods =
        nextAggregation === 'month'
          ? availableMonthPeriods
          : availableYearPeriods;
      const exactPeriod = nextPeriods.find((period) =>
        matchesPeriod(period, nextAggregation, selectedYear, selectedMonth),
      );
      const sameYearPeriod = [...nextPeriods]
        .reverse()
        .find((period) => period.year === selectedYear);
      const nextPeriod = exactPeriod ?? sameYearPeriod ?? nextPeriods.at(-1);
      setAggregation(nextAggregation);
      setShowDatePickers(false);
      if (nextPeriod) {
        applyPeriod(nextPeriod);
      }
    },
    [
      aggregation,
      applyPeriod,
      availableMonthPeriods,
      availableYearPeriods,
      selectedMonth,
      selectedYear,
    ],
  );

  const handleSelectedYear = useCallback(
    (year: number) => {
      if (!Number.isInteger(year)) {
        return;
      }
      const matchingPeriod = [...availablePeriods]
        .reverse()
        .find((period) => period.year === year);
      if (matchingPeriod) {
        applyPeriod(matchingPeriod);
      }
    },
    [applyPeriod, availablePeriods],
  );

  const handleSelectedMonth = useCallback(
    (month: number) => {
      if (!Number.isInteger(month) || month < 0 || month > 11) {
        return;
      }
      const matchingPeriod = availableMonthPeriods.find(
        (period) => period.year === selectedYear && period.month === month,
      );
      if (matchingPeriod) {
        applyPeriod(matchingPeriod);
      }
    },
    [applyPeriod, availableMonthPeriods, selectedYear],
  );

  const selectPeriod = useCallback(
    (period: InsightPeriod) => {
      const matchingPeriod = availablePeriods.find(
        (availablePeriod) => availablePeriod.key === period.key,
      );
      if (matchingPeriod) {
        applyPeriod(matchingPeriod);
      }
    },
    [applyPeriod, availablePeriods],
  );

  const handlePreviousPeriod = useCallback(() => {
    if (selectedPeriodIndex > 0) {
      applyPeriod(availablePeriods[selectedPeriodIndex - 1]);
    }
  }, [applyPeriod, availablePeriods, selectedPeriodIndex]);

  const handleNextPeriod = useCallback(() => {
    if (
      selectedPeriodIndex >= 0 &&
      selectedPeriodIndex < availablePeriods.length - 1
    ) {
      applyPeriod(availablePeriods[selectedPeriodIndex + 1]);
    }
  }, [applyPeriod, availablePeriods, selectedPeriodIndex]);

  const handleShowDatePickers = useCallback(
    (show: boolean) => {
      setShowDatePickers(show && hasMultiplePeriods);
    },
    [hasMultiplePeriods],
  );

  return {
    chartData,
    currencyInsights,
    screenTitle,
    previousPeriodText,
    chartPreference,
    aggregation,
    selectedYear,
    selectedMonth,
    displayPeriodText,
    selectedPeriodKey: selectedPeriod?.key ?? null,
    hasAvailablePeriods,
    hasMultiplePeriods,
    isNextDisabled,
    isPreviousDisabled,
    showDatePickers,
    availablePeriods,
    availableYears,
    monthNames,
    currentYear,
    currentMonth,
    setAggregation: handleAggregation,
    setChartPreference,
    handlePreviousPeriod,
    handleNextPeriod,
    setShowDatePickers: handleShowDatePickers,
    setSelectedYear: handleSelectedYear,
    setSelectedMonth: handleSelectedMonth,
    selectPeriod,
  };
};
