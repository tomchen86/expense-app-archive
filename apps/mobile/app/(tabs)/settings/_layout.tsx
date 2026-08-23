import { Stack } from 'expo-router';
import React from 'react';

export default function SettingsStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name='index'
        options={{
          headerLargeTitleEnabled: true,
          title: 'Settings',
        }}
      />
    </Stack>
  );
}
