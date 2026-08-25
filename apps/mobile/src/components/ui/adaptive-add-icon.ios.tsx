import { SymbolView } from 'expo-symbols';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { semanticColors } from '../../theme/semantic-colors.ios';

export const AdaptiveAddIcon = () => (
  <SymbolView
    accessible={false}
    accessibilityElementsHidden
    fallback={<Text style={styles.fallback}>+</Text>}
    name='plus'
    size={26}
    tintColor={semanticColors.text}
    weight='medium'
  />
);

const styles = StyleSheet.create({
  fallback: {
    color: semanticColors.text,
    fontSize: 30,
    fontWeight: '500',
    lineHeight: 32,
  },
});
