import { useCallback, useState, useMemo } from 'react';
import { useExpenseStore } from '../store/expenseStore';
import {
  getRelevantExpenses,
  filterExpensesByDate,
  isNextPeriodDisabled,
  getDisplayPeriodText,
  getPreviousPeriod,
  getNextPeriod,
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

interface UseInsightsDataReturn {
  // Data
  chartData: ChartDataPoint[];
  currencyInsights: CurrencyInsight[];
  screenTitle: string;
  previousPeriodText: string;
  chartPreference: InsightChartPreference;

  // Date/Period State
  aggregation: 'month' | 'year';
  selectedYear: number;
  selectedMonth: number;
  displayPeriodText: string;
  isNextDisabled: boolean;

  // Date Picker State
  showDatePickers: boolean;
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
}

export const useInsightsData = ({
  contextType,
  contextId,
  initialDate,
}: UseInsightsDataProps): UseInsightsDataReturn => {
  // Store data
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

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const parsedInitialDate =
    typeof initialDate === 'string'
      ? parseLocalCalendarDate(initialDate)
      : initialDate;
  const initialYear = parsedInitialDate?.getFullYear();
  const initialMonth = parsedInitialDate?.getMonth();
  const hasValidInitialDate =
    initialYear !== undefined &&
    initialMonth !== undefined &&
    Number.isInteger(initialYear) &&
    Number.isInteger(initialMonth) &&
    (initialYear < currentYear ||
      (initialYear === currentYear && initialMonth <= currentMonth));

  // State
  const [aggregation, setAggregation] = useState<'month' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(
    hasValidInitialDate ? initialYear : currentYear,
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    hasValidInitialDate ? initialMonth : currentMonth,
  );
  const [showDatePickers, setShowDatePickers] = useState(false);

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

  const screenTitle = 'Insights';
  const chartPreference: InsightChartPreference =
    settings.insightsChartPreference ?? 'auto';

  // Display period text
  const displayPeriodText = useMemo(() => {
    return getDisplayPeriodText(
      selectedYear,
      selectedMonth,
      aggregation,
      monthNames,
    );
  }, [selectedMonth, selectedYear, aggregation, monthNames]);

  // Check if next is disabled
  const isNextDisabled = useMemo(() => {
    return isNextPeriodDisabled(selectedYear, selectedMonth, aggregation);
  }, [selectedYear, selectedMonth, aggregation]);

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

  const availableYears = useMemo(() => {
    const years = new Set([currentYear, selectedYear]);
    relevantExpenses.forEach((expense) => {
      const expenseYear = parseLocalCalendarDate(expense.date)?.getFullYear();
      if (expenseYear !== undefined && expenseYear <= currentYear) {
        years.add(expenseYear);
      }
    });
    return [...years].sort((left, right) => left - right);
  }, [currentYear, relevantExpenses, selectedYear]);

  const filteredExpenses = useMemo(() => {
    return filterExpensesByDate(
      relevantExpenses,
      aggregation,
      selectedYear,
      selectedMonth,
    );
  }, [relevantExpenses, aggregation, selectedYear, selectedMonth]);

  const previousPeriod = useMemo(
    () => getPreviousPeriod(selectedYear, selectedMonth, aggregation),
    [selectedYear, selectedMonth, aggregation],
  );
  const previousExpenses = useMemo(() => {
    return filterExpensesByDate(
      relevantExpenses,
      aggregation,
      previousPeriod.year,
      previousPeriod.month,
    );
  }, [relevantExpenses, aggregation, previousPeriod]);
  const previousPeriodText = useMemo(() => {
    return getDisplayPeriodText(
      previousPeriod.year,
      previousPeriod.month,
      aggregation,
      monthNames,
    );
  }, [previousPeriod, aggregation, monthNames]);

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

  const handleSelectedYear = useCallback(
    (year: number) => {
      if (!Number.isInteger(year) || year > currentYear) {
        return;
      }
      setSelectedYear(year);
      if (year === currentYear && selectedMonth > currentMonth) {
        setSelectedMonth(currentMonth);
      }
    },
    [currentYear, currentMonth, selectedMonth],
  );

  const handleSelectedMonth = useCallback(
    (month: number) => {
      if (
        !Number.isInteger(month) ||
        month < 0 ||
        month > 11 ||
        (selectedYear === currentYear && month > currentMonth)
      ) {
        return;
      }
      setSelectedMonth(month);
    },
    [selectedYear, currentYear, currentMonth],
  );

  // Period navigation handlers
  const handlePreviousPeriod = () => {
    const previous = getPreviousPeriod(
      selectedYear,
      selectedMonth,
      aggregation,
    );
    setSelectedYear(previous.year);
    setSelectedMonth(previous.month);
  };

  const handleNextPeriod = () => {
    const next = getNextPeriod(selectedYear, selectedMonth, aggregation);
    if (next) {
      setSelectedYear(next.year);
      setSelectedMonth(
        next.year === currentYear
          ? Math.min(next.month, currentMonth)
          : next.month,
      );
    }
  };

  return {
    // Data
    chartData,
    currencyInsights,
    screenTitle,
    previousPeriodText,
    chartPreference,

    // Date/Period State
    aggregation,
    selectedYear,
    selectedMonth,
    displayPeriodText,
    isNextDisabled,

    // Date Picker State
    showDatePickers,
    availableYears,
    monthNames,
    currentYear,
    currentMonth,

    // Actions
    setAggregation,
    setChartPreference,
    handlePreviousPeriod,
    handleNextPeriod,
    setShowDatePickers,
    setSelectedYear: handleSelectedYear,
    setSelectedMonth: handleSelectedMonth,
  };
};
