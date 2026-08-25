import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { semanticColors } from '../../theme/semantic-colors.ios';
import { mobileTheme } from '../../theme/tokens';
import type { AdaptivePopoverProps } from './adaptive-popover.types';

export type { AdaptivePopoverProps } from './adaptive-popover.types';

export const AdaptivePopover = ({
  children,
  onClose,
  testID,
  title,
  visible,
}: AdaptivePopoverProps) => (
  <Modal
    animationType='fade'
    onRequestClose={onClose}
    presentationStyle='overFullScreen'
    transparent
    visible={visible}
  >
    <View style={styles.overlay}>
      <Pressable
        accessibilityElementsHidden
        importantForAccessibility='no-hide-descendants'
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <View accessibilityViewIsModal style={styles.popover} testID={testID}>
        <View style={styles.header}>
          <Text accessibilityRole='header' style={styles.title}>
            {title}
          </Text>
          <TouchableOpacity
            accessibilityLabel={`Close ${title}`}
            accessibilityRole='button'
            onPress={onClose}
            style={styles.doneButton}
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: 176,
    backgroundColor: semanticColors.dimOverlay,
  },
  popover: {
    overflow: 'hidden',
    width: '100%',
    maxWidth: 360,
    backgroundColor: semanticColors.surfaceElevated,
    borderColor: semanticColors.separator,
    borderCurve: 'continuous',
    borderRadius: mobileTheme.radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    ...mobileTheme.shadows.action,
  },
  header: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: semanticColors.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingLeft: mobileTheme.spacing.lg,
  },
  title: {
    flex: 1,
    color: semanticColors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  doneButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  doneText: {
    color: semanticColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    backgroundColor: semanticColors.background,
  },
});
