import React from 'react';
import { Alert } from 'react-native';
import { Stack } from 'expo-router';

import {
  AndroidHeaderAction,
  AndroidHeaderActionRow,
} from './android-header-action';

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
  <Stack.Toolbar asChild placement='right'>
    <AndroidHeaderActionRow>
      <AndroidHeaderAction
        accessibilityLabel='Edit expense'
        disabled={editDisabled}
        icon='edit'
        onPress={onEdit}
        testID='expense-detail-edit-action'
      />
      <AndroidHeaderAction
        accessibilityHint='Shows expense actions'
        accessibilityLabel='Expense actions'
        icon='more-vert'
        onPress={() =>
          Alert.alert('Expense actions', undefined, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ])
        }
        testID='expense-detail-overflow-action'
      />
    </AndroidHeaderActionRow>
  </Stack.Toolbar>
);
