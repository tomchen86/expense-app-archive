import type { ReactNode } from 'react';

export interface AdaptivePopoverProps {
  children: ReactNode;
  onClose: () => void;
  testID?: string;
  title: string;
  visible: boolean;
}
