import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { semanticColors } from '../../theme/semantic-colors';
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
    transparent
    visible={visible}
  >
    <View style={styles.overlay}>
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
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
    justifyContent: 'center',
    padding: mobileTheme.spacing.xl,
    backgroundColor: semanticColors.dimOverlay,
  },
  popover: {
    overflow: 'hidden',
    width: '100%',
    maxWidth: 360,
    backgroundColor: semanticColors.surfaceElevated,
    borderColor: semanticColors.separator,
    borderRadius: mobileTheme.radii.card,
    borderWidth: 1,
  },
  header: {
    minHeight: 52,
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
    minHeight: 48,
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
