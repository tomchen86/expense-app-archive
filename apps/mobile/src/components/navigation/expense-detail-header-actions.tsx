import React from 'react';
import { Stack } from 'expo-router';

import { ExpenseOverflowMenu } from './expense-overflow-menu';

interface ExpenseDetailHeaderActionsProps {
  editDisabled: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

export const ExpenseDetailHeaderActions = ({
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
    <ExpenseOverflowMenu onDelete={onDelete} />
  </Stack.Toolbar>
);
