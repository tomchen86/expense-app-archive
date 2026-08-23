import type { InsightChartPreference } from '../../utils/calculations/insightCalculations';

export interface InsightsChartMenuProps {
  preference: InsightChartPreference;
  onChange: (preference: InsightChartPreference) => void;
}
