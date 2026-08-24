import React from 'react';
import { Stack } from 'expo-router';

interface ExpenseDetailHeaderActionsProps {
  deleteDisabled: boolean;
  editDisabled: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

export const ExpenseDetailHeaderActions = ({
  deleteDisabled,
  editDisabled,
  onDelete,
  onEdit,
}: ExpenseDetailHeaderActionsProps) => (
  <Stack.Toolbar placement='right'>
    <Stack.Toolbar.Button
      accessibilityLabel='Edit expense'
      disabled={editDisabled}
      onPress={onEdit}
    >
      Edit
    </Stack.Toolbar.Button>
    <Stack.Toolbar.Menu
      accessibilityHint='Shows expense actions'
      accessibilityLabel='Expense actions'
      icon='ellipsis.circle'
    >
      <Stack.Toolbar.MenuAction
        destructive
        disabled={deleteDisabled}
        icon='trash'
        onPress={onDelete}
      >
        Delete
      </Stack.Toolbar.MenuAction>
    </Stack.Toolbar.Menu>
  </Stack.Toolbar>
);
