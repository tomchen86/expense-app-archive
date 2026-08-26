import React, { createRef, forwardRef, useImperativeHandle } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useInsightsData } from '../useInsightsData';
import { useExpenseStore } from '../../store/expenseStore';
import { DEFAULT_CATEGORIES } from '../../constants/expenses';
import type { Expense, ExpenseGroup, Participant } from '../../types';

const defaultSettings = {
  theme: 'light' as const,
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  notifications: true,
};

type HookHandle = ReturnType<typeof useInsightsData>;

type HarnessProps = Parameters<typeof useInsightsData>[0];

const InsightsHarness = forwardRef<HookHandle, HarnessProps>((props, ref) => {
  const hookValue = useInsightsData(props);
  useImperativeHandle(ref, () => hookValue, [hookValue]);
  return null;
});
InsightsHarness.displayName = 'InsightsHarness';

const participants: Participant[] = [
  { id: 'user-1', name: 'Alice' },
  { id: 'user-2', name: 'Bob' },
];

const group: ExpenseGroup = {
  id: 'group-1',
  name: 'Cycling Club',
  participants,
  createdAt: '2025-01-01T00:00:00.000Z',
};

const personalExpenses: Expense[] = [
  {
    id: 'exp-1',
    spaceId: 'personal-space',
    spaceKind: 'personal',
    title: 'Coffee',
    amount: 5,
    date: '2025-01-02',
    category: 'Food & Dining',
    paidBy: 'user-1',
  },
  {
    id: 'exp-2',
    spaceId: 'personal-space',
    spaceKind: 'personal',
    title: 'Metro',
    amount: 8,
    date: '2025-01-15',
    category: 'Transportation',
    paidBy: 'user-1',
  },
  {
    id: 'exp-3',
    spaceId: 'personal-space',
    spaceKind: 'personal',
    title: 'Dinner',
    amount: 20,
    date: '2024-12-31',
    category: 'Food & Dining',
    paidBy: 'user-1',
  },
];

const groupExpenses: Expense[] = [
  {
    id: 'exp-4',
    title: 'Snacks',
    amount: 30,
    date: '2025-01-10',
    category: 'Food & Dining',
    groupId: 'group-1',
    paidBy: 'user-2',
    splitBetween: ['user-1', 'user-2'],
    participants,
  },
];

const resetStore = () => {
  useExpenseStore.setState({
    expenses: [],
    groups: [],
    participants: [],
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    user: null,
    settings: { ...defaultSettings },
    userSettings: null,
    internalUserId: null,
    personalSpaceId: 'personal-space',
    personalParticipantId: 'personal-participant',
  });
};

describe('useInsightsData', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('computes chart data for personal context and navigates periods', () => {
    useExpenseStore.setState((state) => ({
      ...state,
      expenses: personalExpenses,
      internalUserId: 'user-1',
    }));

    const ref = createRef<HookHandle>();

    act(() => {
      TestRenderer.create(
        <InsightsHarness
          ref={ref}
          contextType='personal'
          contextId='user-1'
          initialDate={new Date('2025-01-01')}
        />,
      );
    });

    const chartCategories = ref.current!.chartData.map(
      (point) => point.category,
    );
    expect(chartCategories).toContain('Food & Dining');
    expect(chartCategories).toContain('Transportation');
    expect(ref.current!.screenTitle).toBe('Insights');
    expect(ref.current!.displayPeriodText).toBe('January 2025');
    expect(ref.current!.selectedPeriodKey).toBe('month:2025-0');
    expect(ref.current!.availablePeriods.map((period) => period.label)).toEqual(
      ['December 2024', 'January 2025'],
    );
    expect(ref.current!.hasAvailablePeriods).toBe(true);
    expect(ref.current!.hasMultiplePeriods).toBe(true);
    expect(ref.current!.isPreviousDisabled).toBe(false);
    expect(ref.current!.isNextDisabled).toBe(true);

    act(() => {
      ref.current!.handlePreviousPeriod();
    });
    expect(ref.current!.selectedMonth).toBe(11); // December
    expect(ref.current!.selectedYear).toBe(2024);
    expect(ref.current!.selectedPeriodKey).toBe('month:2024-11');

    act(() => {
      ref.current!.handleNextPeriod();
    });
    expect(ref.current!.selectedYear).toBe(2025);
    expect(ref.current!.selectedMonth).toBe(0);

    act(() => {
      ref.current!.setAggregation('year');
    });
    expect(ref.current!.aggregation).toBe('year');
  });

  it('reports an empty state instead of inventing a selectable period', () => {
    const ref = createRef<HookHandle>();

    act(() => {
      TestRenderer.create(
        <InsightsHarness
          ref={ref}
          contextType='personal'
          contextId='user-1'
          initialDate='2025-01-01'
        />,
      );
    });

    expect(ref.current!.hasAvailablePeriods).toBe(false);
    expect(ref.current!.hasMultiplePeriods).toBe(false);
    expect(ref.current!.availablePeriods).toEqual([]);
    expect(ref.current!.availableYears).toEqual([]);
    expect(ref.current!.previousPeriodText).toBeNull();
  });

  it('filters expenses for group context and respects available participants', () => {
    useExpenseStore.setState((state) => ({
      ...state,
      expenses: [...personalExpenses, ...groupExpenses],
      groups: [group],
      participants,
      internalUserId: 'user-1',
    }));

    const ref = createRef<HookHandle>();

    act(() => {
      TestRenderer.create(
        <InsightsHarness
          ref={ref}
          contextType='group'
          contextId='group-1'
          initialDate={new Date('2025-01-01')}
        />,
      );
    });

    expect(ref.current!.screenTitle).toBe('Insights');
    expect(ref.current!.chartData).toHaveLength(1);
    expect(ref.current!.chartData[0].absoluteValue).toBe(30);
  });

  it('uses the bare legacy user identity for personal shared-expense insights', () => {
    const legacySharedExpense: Expense = {
      id: 'legacy-shared-expense',
      title: 'Legacy shared lunch',
      amountMinor: 500,
      currency: 'AUD',
      date: '2025-01-10',
      category: 'Food & Dining',
      spaceId: 'archived-shared-space',
      spaceKind: 'shared',
      payments: [{ participantId: 'other-user', amountMinor: 500 }],
      shares: [{ participantId: 'legacy-user', amountMinor: 500 }],
    };
    useExpenseStore.setState((state) => ({
      ...state,
      expenses: [legacySharedExpense],
      internalUserId: 'legacy-user',
      participants: [],
      personalParticipantId: 'canonical-personal-participant',
    }));

    const ref = createRef<HookHandle>();
    act(() => {
      TestRenderer.create(
        <InsightsHarness
          ref={ref}
          contextType='personal'
          contextId='legacy-user'
          initialDate={new Date('2025-01-01')}
        />,
      );
    });

    expect(ref.current!.chartData).toEqual([
      expect.objectContaining({
        absoluteValue: 5,
        category: 'Food & Dining',
        currency: 'AUD',
      }),
    ]);
  });

  it('compares the current personal share with the previous period that has data', () => {
    const current: Expense = {
      id: 'current-shared',
      title: 'Current shared expense',
      amountMinor: 10_000,
      currency: 'AUD',
      date: '2025-01-10',
      category: 'Food & Dining',
      spaceId: 'shared-space',
      spaceKind: 'shared',
      payments: [{ participantId: 'other-user', amountMinor: 10_000 }],
      shares: [
        { participantId: 'user-1', amountMinor: 2_000 },
        { participantId: 'other-user', amountMinor: 8_000 },
      ],
    };
    const prior: Expense = {
      ...current,
      id: 'prior-shared',
      date: '2024-10-10',
      amountMinor: 8_000,
      payments: [{ participantId: 'other-user', amountMinor: 8_000 }],
      shares: [
        { participantId: 'user-1', amountMinor: 1_000 },
        { participantId: 'other-user', amountMinor: 7_000 },
      ],
    };
    useExpenseStore.setState((state) => ({
      ...state,
      expenses: [current, prior],
      internalUserId: 'user-1',
      personalParticipantId: 'user-1',
    }));

    const ref = createRef<HookHandle>();
    act(() => {
      TestRenderer.create(
        <InsightsHarness
          ref={ref}
          contextType='personal'
          contextId='user-1'
          initialDate={new Date(2025, 0, 1)}
        />,
      );
    });

    expect(ref.current!.currencyInsights).toEqual([
      expect.objectContaining({
        currency: 'AUD',
        totalMinor: 2_000,
        priorTotalMinor: 1_000,
        deltaPercentage: 100,
      }),
    ]);
    expect(ref.current!.previousPeriodText).toBe('October 2024');
  });

  it('persists the selected visualization preference across hook remounts', () => {
    const firstRef = createRef<HookHandle>();
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <InsightsHarness
          ref={firstRef}
          contextType='personal'
          contextId='user-1'
        />,
      );
    });
    expect(firstRef.current!.chartPreference).toBe('auto');

    act(() => {
      firstRef.current!.setChartPreference('donut');
    });
    expect(useExpenseStore.getState().settings.insightsChartPreference).toBe(
      'donut',
    );
    act(() => renderer!.unmount());

    const secondRef = createRef<HookHandle>();
    act(() => {
      TestRenderer.create(
        <InsightsHarness
          ref={secondRef}
          contextType='personal'
          contextId='user-1'
        />,
      );
    });
    expect(secondRef.current!.chartPreference).toBe('donut');
  });

  it('defaults to the latest data month and skips empty gaps when navigating', () => {
    useExpenseStore.setState((state) => ({
      ...state,
      expenses: [
        { ...personalExpenses[0], id: 'may-2026', date: '2026-05-03' },
        { ...personalExpenses[1], id: 'august-2026', date: '2026-08-12' },
      ],
      internalUserId: 'user-1',
    }));
    const ref = createRef<HookHandle>();
    act(() => {
      TestRenderer.create(
        <InsightsHarness ref={ref} contextType='personal' contextId='user-1' />,
      );
    });

    expect(ref.current!.displayPeriodText).toBe('August 2026');
    expect(ref.current!.previousPeriodText).toBe('May 2026');
    expect(ref.current!.availablePeriods.map((period) => period.label)).toEqual(
      ['May 2026', 'August 2026'],
    );

    act(() => ref.current!.handlePreviousPeriod());
    expect(ref.current!.displayPeriodText).toBe('May 2026');
    act(() => ref.current!.handleNextPeriod());
    expect(ref.current!.displayPeriodText).toBe('August 2026');

    act(() => ref.current!.setSelectedMonth(6));
    expect(ref.current!.selectedYear).toBe(2026);
    expect(ref.current!.selectedMonth).toBe(7);
  });

  it('offers only data years and restores the latest data month in a selected year', () => {
    useExpenseStore.setState((state) => ({
      ...state,
      expenses: [
        { ...personalExpenses[0], id: 'january-2025', date: '2025-01-03' },
        { ...personalExpenses[1], id: 'may-2026', date: '2026-05-12' },
        { ...personalExpenses[2], id: 'august-2026', date: '2026-08-21' },
      ],
      internalUserId: 'user-1',
    }));
    const ref = createRef<HookHandle>();
    act(() => {
      TestRenderer.create(
        <InsightsHarness ref={ref} contextType='personal' contextId='user-1' />,
      );
    });

    act(() => ref.current!.setAggregation('year'));
    expect(ref.current!.availablePeriods.map((period) => period.label)).toEqual(
      ['2025', '2026'],
    );
    act(() => ref.current!.handlePreviousPeriod());
    expect(ref.current!.displayPeriodText).toBe('2025');
    act(() => ref.current!.setAggregation('month'));
    expect(ref.current!.displayPeriodText).toBe('January 2025');
  });

  it('hides navigation affordances when only one period has data', () => {
    useExpenseStore.setState((state) => ({
      ...state,
      expenses: [{ ...personalExpenses[0], date: '2026-08-03' }],
      internalUserId: 'user-1',
    }));
    const ref = createRef<HookHandle>();
    act(() => {
      TestRenderer.create(
        <InsightsHarness ref={ref} contextType='personal' contextId='user-1' />,
      );
    });

    expect(ref.current!.displayPeriodText).toBe('August 2026');
    expect(ref.current!.hasAvailablePeriods).toBe(true);
    expect(ref.current!.hasMultiplePeriods).toBe(false);
    expect(ref.current!.isPreviousDisabled).toBe(true);
    expect(ref.current!.isNextDisabled).toBe(true);
  });

  it('offers only relevant expense years and rejects empty selections', () => {
    useExpenseStore.setState((state) => ({
      ...state,
      expenses: [
        {
          ...personalExpenses[0],
          id: 'old-personal',
          date: '2010-04-03',
        },
        {
          ...groupExpenses[0],
          id: 'unrelated-group',
          date: '2005-02-01',
          paidBy: 'unrelated-user',
          splitBetween: ['unrelated-user'],
          participants: [{ id: 'unrelated-user', name: 'Other' }],
        },
      ],
      internalUserId: 'user-1',
    }));
    const ref = createRef<HookHandle>();
    act(() => {
      TestRenderer.create(
        <InsightsHarness ref={ref} contextType='personal' contextId='user-1' />,
      );
    });

    expect(ref.current!.availableYears).toEqual([2010]);
    act(() => ref.current!.setSelectedYear(2014));
    expect(ref.current!.selectedYear).toBe(2010);
    expect(ref.current!.availableYears).toEqual([2010]);
  });
});
