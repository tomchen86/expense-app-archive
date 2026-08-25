import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { semanticColors } from '../../theme/semantic-colors';
import { mobileTheme } from '../../theme/tokens';
import type {
  AdaptiveSheetAction,
  AdaptiveSheetProps,
} from './adaptive-sheet.types';

export type {
  AdaptiveSheetAction,
  AdaptiveSheetProps,
} from './adaptive-sheet.types';

const HeaderAction = ({ action }: { action?: AdaptiveSheetAction }) =>
  action ? (
    <TouchableOpacity
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityRole='button'
      accessibilityState={{ disabled: action.disabled }}
      disabled={action.disabled}
      onPress={action.onPress}
      style={styles.action}
      testID={action.testID}
    >
      <Text
        style={[
          styles.actionText,
          action.destructive && styles.destructiveActionText,
          action.disabled && styles.disabledActionText,
        ]}
      >
        {action.label}
      </Text>
    </TouchableOpacity>
  ) : (
    <View style={styles.actionPlaceholder} />
  );

export const AdaptiveSheet = ({
  children,
  contentStyle,
  leadingAction,
  onClose,
  testID,
  title,
  trailingAction,
  visible,
}: AdaptiveSheetProps) => (
  <Modal
    animationType='slide'
    onRequestClose={onClose}
    transparent
    visible={visible}
  >
    <KeyboardAvoidingView behavior='height' style={styles.overlay}>
      <View accessibilityViewIsModal style={styles.sheet} testID={testID}>
        <View style={styles.header}>
          <HeaderAction action={leadingAction} />
          <Text
            accessibilityRole='header'
            numberOfLines={1}
            style={styles.title}
          >
            {title}
          </Text>
          <HeaderAction action={trailingAction} />
        </View>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: semanticColors.dimOverlay,
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: semanticColors.background,
    borderTopLeftRadius: mobileTheme.radii.card,
    borderTopRightRadius: mobileTheme.radii.card,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: semanticColors.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: semanticColors.surface,
  },
  title: {
    flex: 1,
    color: semanticColors.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  action: {
    minHeight: 48,
    minWidth: 76,
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  actionPlaceholder: {
    width: 76,
  },
  actionText: {
    color: semanticColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  destructiveActionText: {
    color: semanticColors.destructive,
  },
  disabledActionText: {
    opacity: 0.35,
  },
  content: {
    flexShrink: 1,
  },
});
