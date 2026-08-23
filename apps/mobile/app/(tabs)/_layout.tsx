import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { MOBILE_TABS } from '../../src/navigation/mobile-tabs';
import { mobileTheme } from '../../src/theme/tokens';

export default function TabLayout() {
  return (
    <NativeTabs
      backBehavior='initialRoute'
      iconColor={{
        default: mobileTheme.colors.textMuted,
        selected: mobileTheme.colors.primary,
      }}
      labelVisibilityMode='labeled'
      sidebarAdaptable={false}
      tabBarRespectsIMEInsets
      tintColor={mobileTheme.colors.primary}
    >
      {MOBILE_TABS.map((tab) => (
        <NativeTabs.Trigger
          contentStyle={{ backgroundColor: mobileTheme.colors.background }}
          key={tab.name}
          name={tab.name}
        >
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md={tab.md} sf={tab.sf} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
