import { Ionicons } from '@expo/vector-icons';
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
import { AdaptiveActionSurface } from './adaptive-action-surface';
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
      <View style={styles.popoverFrame}>
        <AdaptiveActionSurface
          accessibilityViewIsModal
          style={styles.popover}
          testID={testID}
          tone='grouped'
        >
          <View style={styles.header}>
            <Text accessibilityRole='header' style={styles.title}>
              {title}
            </Text>
            <TouchableOpacity
              accessibilityLabel={`Close ${title}`}
              accessibilityRole='button'
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons
                color={semanticColors.textMuted}
                name='close'
                size={20}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>{children}</View>
        </AdaptiveActionSurface>
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
  popoverFrame: {
    width: '100%',
    maxWidth: 360,
    borderCurve: 'continuous',
    borderRadius: mobileTheme.radii.card,
    ...mobileTheme.shadows.action,
  },
  popover: {
    width: '100%',
    borderCurve: 'continuous',
    borderRadius: mobileTheme.radii.card,
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
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: {
    backgroundColor: semanticColors.background,
  },
});
