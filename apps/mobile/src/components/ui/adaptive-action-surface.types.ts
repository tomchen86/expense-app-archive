import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

export interface AdaptiveActionSurfaceProps extends ViewProps {
  children: ReactNode;
  tone?: 'grouped' | 'primary' | 'neutral' | 'selection';
  interactive?: boolean;
}
