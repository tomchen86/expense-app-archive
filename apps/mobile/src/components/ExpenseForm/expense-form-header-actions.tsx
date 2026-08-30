import React from 'react';
import { Stack } from 'expo-router';

interface ExpenseFormHeaderActionsProps {
  canSubmit: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export const ExpenseFormHeaderActions = ({
  canSubmit,
  isEditing,
  isSubmitting,
  onCancel,
  onSubmit,
}: ExpenseFormHeaderActionsProps) => (
  <>
    <Stack.Toolbar placement='left'>
      <Stack.Toolbar.Button
        accessibilityLabel='Cancel'
        disabled={isSubmitting}
        onPress={onCancel}
        variant='plain'
      >
        Cancel
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
    <Stack.Toolbar placement='right'>
      <Stack.Toolbar.Button
        accessibilityLabel={isEditing ? 'Save' : 'Add'}
        disabled={!canSubmit || isSubmitting}
        onPress={onSubmit}
        variant='prominent'
      >
        {isEditing ? 'Save' : 'Add'}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  </>
);
