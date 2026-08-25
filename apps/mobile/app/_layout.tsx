import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  ActivityIndicator,
  Appearance,
  useColorScheme,
  View,
} from 'react-native';
import { useMobileStoresHydrated } from '../src/store/hydration';
import { ExpenseDeletionProvider } from '../src/components/feedback/expense-deletion-provider';
import { useExpenseStore } from '../src/store/expenseStore';

export default function RootLayout() {
  const storesHydrated = useMobileStoresHydrated();
  const preferredTheme = useExpenseStore((state) => state.settings.theme);
  const systemTheme = useColorScheme();
  const resolvedTheme =
    preferredTheme === 'system' ? (systemTheme ?? 'light') : preferredTheme;

  useEffect(() => {
    if (storesHydrated) {
      Appearance.setColorScheme(
        preferredTheme === 'system' ? 'unspecified' : preferredTheme,
      );
    }
  }, [preferredTheme, storesHydrated]);

  if (!storesHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel='Restoring local data' />
      </View>
    );
  }

  return (
    <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
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
            <Stack.Screen
              name='expense-detail'
              options={{ title: 'Expense' }}
            />
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
    </ThemeProvider>
  );
}
