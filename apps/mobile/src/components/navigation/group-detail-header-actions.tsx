import React from 'react';
import { Stack } from 'expo-router';

import GroupOverflowMenu from './group-overflow-menu';

interface GroupDetailHeaderActionsProps {
  onOpenMembers: () => void;
}

export const GroupDetailHeaderActions = ({
  onOpenMembers,
}: GroupDetailHeaderActionsProps) => (
  <Stack.Toolbar placement='right'>
    <GroupOverflowMenu onOpenMembers={onOpenMembers} />
  </Stack.Toolbar>
);
