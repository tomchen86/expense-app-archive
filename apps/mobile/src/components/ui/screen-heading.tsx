import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { mobileTheme } from '../../theme/tokens';

interface ScreenHeadingProps {
  title: string;
  subtitle: string;
}

export const ScreenHeading = ({ title, subtitle }: ScreenHeadingProps) => (
  <View style={styles.container}>
    <Text accessibilityRole='header' style={styles.title}>
      {title}
    </Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: mobileTheme.spacing.xs,
    marginBottom: mobileTheme.spacing.xl,
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: mobileTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
  },
});
