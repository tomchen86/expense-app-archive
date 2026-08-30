import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mobileTheme } from '../../theme/tokens';

interface TransientNoticeProps {
  message: string;
  testID?: string;
  visible: boolean;
}

const TransientNotice = ({
  message,
  testID = 'transient-notice',
  visible,
}: TransientNoticeProps) => {
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion='polite'
      style={[styles.notice, { bottom: Math.max(insets.bottom, 16) + 136 }]}
      testID={testID}
    >
      <Text accessibilityRole='alert' style={styles.message}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  notice: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: 48,
    maxWidth: '90%',
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.pill,
    backgroundColor: mobileTheme.colors.text,
    ...mobileTheme.shadows.action,
  },
  message: {
    color: mobileTheme.colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TransientNotice;
