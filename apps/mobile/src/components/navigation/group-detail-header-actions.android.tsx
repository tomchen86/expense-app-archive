import React from 'react';
import { Alert } from 'react-native';
import { Stack } from 'expo-router';

import { AndroidHeaderAction } from './android-header-action';

interface GroupDetailHeaderActionsProps {
  onOpenMembers: () => void;
}

export const GroupDetailHeaderActions = ({
  onOpenMembers,
}: GroupDetailHeaderActionsProps) => (
  <Stack.Toolbar asChild placement='right'>
    <AndroidHeaderAction
      accessibilityHint='Shows group actions'
      accessibilityLabel='Group actions'
      icon='more-vert'
      onPress={() =>
        Alert.alert('Group actions', undefined, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Members', onPress: onOpenMembers },
        ])
      }
      testID='group-detail-overflow-action'
    />
  </Stack.Toolbar>
);
