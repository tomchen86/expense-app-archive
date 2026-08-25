import BottomSheet, { BottomSheetView } from '@expo/ui/community/bottom-sheet';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { semanticColors } from '../../theme/semantic-colors.ios';
import { mobileTheme } from '../../theme/tokens';
import { AdaptiveActionSurface } from './adaptive-action-surface';
import type {
  AdaptiveSheetAction,
  AdaptiveSheetProps,
} from './adaptive-sheet.types';

export type {
  AdaptiveSheetAction,
  AdaptiveSheetProps,
} from './adaptive-sheet.types';

const RESIZABLE_SNAP_POINTS = ['50%', '90%'];

const HeaderAction = ({ action }: { action?: AdaptiveSheetAction }) => {
  if (!action) {
    return <View style={styles.actionPlaceholder} />;
  }

  return (
    <TouchableOpacity
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityRole='button'
      accessibilityState={{
        busy: action.busy,
        disabled: action.disabled,
      }}
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
  sizing = 'resizable',
  testID,
  title,
  trailingAction,
  visible,
}: AdaptiveSheetProps) => {
  const fitsContent = sizing === 'content';

  return (
    <BottomSheet
      enableDynamicSizing={fitsContent}
      enablePanDownToClose
      index={visible ? 0 : -1}
      onClose={() => {
        if (visible) {
          onClose();
        }
      }}
      snapPoints={fitsContent ? undefined : RESIZABLE_SNAP_POINTS}
    >
      <BottomSheetView style={styles.host}>
        <View
          accessibilityViewIsModal
          style={[styles.screen, !fitsContent && styles.resizableScreen]}
          testID={testID}
        >
          <AdaptiveActionSurface
            style={styles.header}
            testID='adaptive-sheet-glass-header'
            tone='neutral'
          >
            <HeaderAction action={leadingAction} />
            <Text
              accessibilityRole='header'
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </Text>
            <HeaderAction action={trailingAction} />
          </AdaptiveActionSurface>
          <View
            style={[
              styles.content,
              !fitsContent && styles.resizableContent,
              contentStyle,
            ]}
          >
            {children}
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  host: {
    backgroundColor: semanticColors.background,
  },
  screen: {
    backgroundColor: semanticColors.background,
  },
  resizableScreen: {
    flex: 1,
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: semanticColors.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderWidth: 0,
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
  content: {},
  resizableContent: {
    flex: 1,
  },
});
