import React from 'react';
import { Alert } from 'react-native';
import { Stack } from 'expo-router';

interface ExpenseOverflowMenuProps {
  onDelete: () => void;
}

export const ExpenseOverflowMenu = ({ onDelete }: ExpenseOverflowMenuProps) => (
  <Stack.Toolbar.Button
    accessibilityHint='Shows expense actions'
    accessibilityLabel='Expense actions'
    onPress={() =>
      Alert.alert('Expense actions', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ])
    }
  >
    More
  </Stack.Toolbar.Button>
);
