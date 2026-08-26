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
    <View style={styles.actionFrame}>
      <AdaptiveActionSurface
        interactive
        style={styles.actionSurface}
        testID='adaptive-sheet-glass-action'
        tone='neutral'
      >
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
      </AdaptiveActionSurface>
    </View>
  );
};

export const AdaptiveSheet = ({
  children,
  contentStyle,
  leadingAction,
  onClose,
  sizing = 'resizable',
  surface = 'grouped',
  testID,
  title,
  trailingAction,
  visible,
}: AdaptiveSheetProps) => {
  const fitsContent = sizing === 'content';
  const usesGlassSurface = surface === 'glass';

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
      <BottomSheetView
        style={[
          styles.host,
          usesGlassSurface && styles.glassBackground,
          !fitsContent && styles.resizableHost,
        ]}
      >
        <View
          accessibilityViewIsModal
          style={[
            styles.screen,
            usesGlassSurface && styles.glassBackground,
            !fitsContent && styles.resizableScreen,
          ]}
          testID={testID}
        >
          <View style={styles.header} testID='adaptive-sheet-header'>
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
  glassBackground: {
    backgroundColor: 'transparent',
  },
  resizableHost: {
    flex: 1,
  },
  screen: {
    backgroundColor: semanticColors.background,
  },
  resizableScreen: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: mobileTheme.spacing.sm,
    paddingBottom: mobileTheme.spacing.xs,
  },
  title: {
    flex: 1,
    color: semanticColors.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  action: {
    alignItems: 'center',
    height: 44,
    minWidth: 72,
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing.md,
  },
  actionPlaceholder: {
    height: 44,
    width: 72,
  },
  actionFrame: {
    borderRadius: mobileTheme.radii.pill,
    ...mobileTheme.shadows.action,
  },
  actionSurface: {
    borderRadius: mobileTheme.radii.pill,
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
