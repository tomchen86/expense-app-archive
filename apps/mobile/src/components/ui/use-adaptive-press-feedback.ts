import type { ViewStyle } from 'react-native';

interface AdaptivePressFeedback {
  onPressIn?: () => void;
  onPressOut?: () => void;
  surfaceStyle?: ViewStyle;
  triggerFeedback: () => void;
}

const noFeedback = () => undefined;

export const useAdaptivePressFeedback = (): AdaptivePressFeedback => ({
  triggerFeedback: noFeedback,
});
