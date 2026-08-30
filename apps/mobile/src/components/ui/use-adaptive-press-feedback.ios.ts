import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import type { ViewStyle } from 'react-native';

interface AdaptivePressFeedback {
  onPressIn: () => void;
  onPressOut: () => void;
  surfaceStyle?: ViewStyle;
  triggerFeedback: () => void;
}

const pressedStyle: ViewStyle = { transform: [{ scale: 0.96 }] };

export const useAdaptivePressFeedback = (): AdaptivePressFeedback => {
  const [isPressed, setIsPressed] = useState(false);
  const onPressIn = useCallback(() => setIsPressed(true), []);
  const onPressOut = useCallback(() => setIsPressed(false), []);
  const triggerFeedback = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );
  }, []);

  return {
    onPressIn,
    onPressOut,
    surfaceStyle: isPressed ? pressedStyle : undefined,
    triggerFeedback,
  };
};
