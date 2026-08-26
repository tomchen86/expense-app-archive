import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

export interface AdaptiveCardSurfaceProps extends ViewProps {
  children: ReactNode;
  interactive?: boolean;
  tone?: 'muted' | 'neutral' | 'shared';
  variant?: 'card' | 'section';
}
