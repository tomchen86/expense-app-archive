import { Stack } from 'expo-router';
import React from 'react';

export default function GroupsStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name='index'
        options={{
          headerLargeTitleEnabled: true,
          title: 'Groups',
        }}
      />
    </Stack>
  );
}
