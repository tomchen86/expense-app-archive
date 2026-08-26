import type { InsightPeriod } from '../../hooks/useInsightsData';

export interface PeriodPickerControlProps {
  availablePeriods: InsightPeriod[];
  displayPeriodText: string;
  onOpen: () => void;
  onSelectPeriod: (period: InsightPeriod) => void;
  selectedPeriodKey: string | null;
}
