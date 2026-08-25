import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { mobileTheme } from '../../theme/tokens';

export const AdaptiveAddIcon = () => (
  <Text accessibilityElementsHidden style={styles.icon}>
    +
  </Text>
);

const styles = StyleSheet.create({
  icon: {
    color: mobileTheme.colors.onPrimaryContainer,
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 34,
  },
});
