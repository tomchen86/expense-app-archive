import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mobileTheme } from '../../theme/tokens';
import {
  FloatingActionOffsetContext,
  resolveAndroidFloatingActionOffset,
} from './floating-action-offset-policy';

export const useFloatingActionOffset = ({
  nativeTabsContentInsetApplied = false,
}: FloatingActionOffsetContext = {}) => {
  const { bottom } = useSafeAreaInsets();

  return resolveAndroidFloatingActionOffset(
    bottom,
    mobileTheme.spacing.lg,
    nativeTabsContentInsetApplied,
  );
};
