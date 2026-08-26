import type { InsightPeriod } from '../../hooks/useInsightsData';

export interface DatePickerModalProps {
  aggregation: 'month' | 'year';
  availablePeriods: InsightPeriod[];
  onClose: () => void;
  onSelectPeriod: (period: InsightPeriod) => void;
  selectedMonth: number;
  selectedPeriodKey: string | null;
  selectedYear: number;
  visible: boolean;
}
