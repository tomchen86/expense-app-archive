import type { InsightPeriod } from '../../hooks/useInsightsData';

export interface PeriodPickerControlProps {
  aggregation: 'month' | 'year';
  availablePeriods: InsightPeriod[];
  displayPeriodText: string;
  onOpen: () => void;
  onSelectPeriod: (period: InsightPeriod) => void;
  selectedPeriodKey: string | null;
}
