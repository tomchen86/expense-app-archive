import React from 'react';
import { Stack } from 'expo-router';

interface ExpenseOverflowMenuProps {
  onDelete: () => void;
}

export const ExpenseOverflowMenu = ({ onDelete }: ExpenseOverflowMenuProps) => (
  <Stack.Toolbar.Menu
    accessibilityHint='Shows expense actions'
    accessibilityLabel='Expense actions'
    icon='ellipsis.circle'
  >
    <Stack.Toolbar.MenuAction destructive icon='trash' onPress={onDelete}>
      Delete
    </Stack.Toolbar.MenuAction>
  </Stack.Toolbar.Menu>
);
