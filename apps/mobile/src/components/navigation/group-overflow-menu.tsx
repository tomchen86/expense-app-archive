import React from 'react';
import { Stack } from 'expo-router';

interface GroupOverflowMenuProps {
  onOpenMembers: () => void;
}

const GroupOverflowMenu = ({ onOpenMembers }: GroupOverflowMenuProps) => (
  <Stack.Toolbar.Menu
    accessibilityHint='Shows group actions'
    accessibilityLabel='Group actions'
    icon='ellipsis.circle'
  >
    <Stack.Toolbar.MenuAction icon='person.2' onPress={onOpenMembers}>
      Members
    </Stack.Toolbar.MenuAction>
  </Stack.Toolbar.Menu>
);

export default GroupOverflowMenu;
