import { Stack } from 'expo-router';
import React from 'react';

export default function ExpensesStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name='index'
        options={{
          headerLargeTitleEnabled: true,
          title: 'Expenses',
        }}
      />
    </Stack>
  );
}
