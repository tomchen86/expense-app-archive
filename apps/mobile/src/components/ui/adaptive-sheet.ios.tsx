import BottomSheet, { BottomSheetView } from '@expo/ui/community/bottom-sheet';
import { Button, Host } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

const RESIZABLE_SNAP_POINTS = ['50%', '90%'];

const HeaderAction = ({ action }: { action?: AdaptiveSheetAction }) => {
  if (!action) {
    return <View style={styles.actionPlaceholder} />;
  }

  const hierarchyStyle =
    action.variant === 'prominent'
      ? buttonStyle('glassProminent')
      : buttonStyle('glass');

  return (
    <Host
      ignoreSafeArea='all'
      seedColor={semanticColors.primary}
      style={styles.actionHost}
      testID='adaptive-sheet-glass-action'
      useViewportSizeMeasurement
    >
      <Button
        label={action.label}
        modifiers={[
          hierarchyStyle,
          buttonBorderShape('capsule'),
          controlSize('large'),
          disabled(Boolean(action.disabled || action.busy)),
          accessibilityLabel(action.accessibilityLabel ?? action.label),
          ...(action.destructive ? [tint(semanticColors.destructive)] : []),
        ]}
        onPress={action.onPress}
        role={action.destructive ? 'destructive' : 'default'}
        testID={action.testID}
      />
    </Host>
  );
};

export const AdaptiveSheet = ({
  children,
  contentStyle,
  leadingAction,
  onClose,
  sizing = 'resizable',
  surface = 'system',
  testID,
  title,
  trailingAction,
  visible,
}: AdaptiveSheetProps) => {
  const fitsContent = sizing === 'content';
  const usesSystemSurface = surface === 'system';

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
          usesSystemSurface && styles.systemSheetContent,
          !fitsContent && styles.resizableHost,
        ]}
      >
        <View
          accessibilityViewIsModal
          style={[
            styles.screen,
            usesSystemSurface && styles.systemSheetContent,
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
  systemSheetContent: {
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
  actionHost: {
    height: 48,
    width: 104,
  },
  actionPlaceholder: {
    height: 48,
    width: 104,
  },
  content: {},
  resizableContent: {
    flex: 1,
  },
});
