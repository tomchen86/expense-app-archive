import React from 'react';
import { Stack } from 'expo-router';

import { AndroidHeaderAction } from '../navigation/android-header-action';
import { mobileTheme } from '../../theme/tokens';

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
}: ExpenseFormHeaderActionsProps) => {
  const submitLabel = isEditing ? 'Save' : 'Add';

  return (
    <>
      <Stack.Toolbar asChild placement='left'>
        <AndroidHeaderAction
          accessibilityLabel='Cancel'
          disabled={isSubmitting}
          icon='close'
          onPress={onCancel}
          testID='expense-form-cancel-action'
        />
      </Stack.Toolbar>
      <Stack.Toolbar asChild placement='right'>
        <AndroidHeaderAction
          accessibilityLabel={submitLabel}
          color={mobileTheme.colors.primary}
          disabled={!canSubmit || isSubmitting}
          icon='check'
          onPress={onSubmit}
          testID='expense-form-submit-action'
        />
      </Stack.Toolbar>
    </>
  );
};
