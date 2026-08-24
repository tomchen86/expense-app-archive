import React from 'react';
import { Stack } from 'expo-router';

interface GroupDetailHeaderActionsProps {
  onOpenMembers: () => void;
}

export const GroupDetailHeaderActions = ({
  onOpenMembers,
}: GroupDetailHeaderActionsProps) => (
  <Stack.Toolbar placement='right'>
    <Stack.Toolbar.Menu
      accessibilityHint='Shows group actions'
      accessibilityLabel='Group actions'
      icon='ellipsis.circle'
    >
      <Stack.Toolbar.MenuAction icon='person.2' onPress={onOpenMembers}>
        Members
      </Stack.Toolbar.MenuAction>
    </Stack.Toolbar.Menu>
  </Stack.Toolbar>
);
