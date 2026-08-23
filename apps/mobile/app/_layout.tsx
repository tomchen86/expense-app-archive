import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View } from 'react-native';
import { useMobileStoresHydrated } from '../src/store/hydration';
import { ExpenseDeletionProvider } from '../src/components/feedback/expense-deletion-provider';

export default function RootLayout() {
  const storesHydrated = useMobileStoresHydrated();
  if (!storesHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel='Restoring local data' />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ExpenseDeletionProvider>
        <Stack
          screenOptions={{
            headerBackButtonDisplayMode: 'minimal',
            headerBackTitle: 'Back',
          }}
        >
          <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
          <Stack.Screen
            name='add-expense'
            options={{
              headerBackVisible: false,
              presentation: 'modal',
              title: 'New Expense',
            }}
          />
          <Stack.Screen name='expense-detail' options={{ title: 'Expense' }} />
          <Stack.Screen
            name='group-detail'
            options={{ title: 'Group Details' }}
          />
          <Stack.Screen name='insights' options={{ title: 'Insights' }} />
          <Stack.Screen
            name='manage-categories'
            options={{ title: 'Manage Categories' }}
          />
        </Stack>
        <StatusBar style='auto' />
      </ExpenseDeletionProvider>
    </GestureHandlerRootView>
  );
}
