import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mobileTheme } from '../../theme/tokens';
import {
  FloatingActionOffsetContext,
  resolveFallbackFloatingActionOffset,
} from './floating-action-offset-policy';

export const useFloatingActionOffset = (
  _context: FloatingActionOffsetContext = {},
) => {
  const { bottom } = useSafeAreaInsets();

  return resolveFallbackFloatingActionOffset(bottom, mobileTheme.spacing.lg);
};
