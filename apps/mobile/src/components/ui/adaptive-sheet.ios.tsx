import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { semanticColors } from '../../theme/semantic-colors.ios';
import { mobileTheme } from '../../theme/tokens';
import type {
  AdaptiveSheetAction,
  AdaptiveSheetProps,
} from './adaptive-sheet.types';

export type {
  AdaptiveSheetAction,
  AdaptiveSheetProps,
} from './adaptive-sheet.types';

const HeaderAction = ({ action }: { action?: AdaptiveSheetAction }) => {
  if (!action) {
    return <View style={styles.actionPlaceholder} />;
  }

  return (
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
  );
};

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
    presentationStyle='pageSheet'
    visible={visible}
  >
    <KeyboardAvoidingView
      behavior='padding'
      style={styles.keyboardAvoidingView}
    >
      <SafeAreaView
        accessibilityViewIsModal
        style={styles.screen}
        testID={testID}
      >
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
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>
);

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: semanticColors.background,
  },
  header: {
    minHeight: 52,
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
    minHeight: 44,
    minWidth: 72,
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  actionPlaceholder: {
    width: 72,
  },
  actionText: {
    color: semanticColors.primary,
    fontSize: 17,
  },
  destructiveActionText: {
    color: semanticColors.destructive,
  },
  disabledActionText: {
    opacity: 0.35,
  },
  content: {
    flex: 1,
  },
});
