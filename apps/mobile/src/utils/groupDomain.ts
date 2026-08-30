import type { ExpenseGroup } from '../types';

export type ExpenseGroupStatus = 'active' | 'archived';

export const isExpenseGroupArchived = (group: ExpenseGroup): boolean =>
  group.archivedAt !== undefined;

export const getExpenseGroupStatus = (
  group: ExpenseGroup,
): ExpenseGroupStatus =>
  isExpenseGroupArchived(group) ? 'archived' : 'active';

export const archiveExpenseGroup = (
  group: ExpenseGroup,
  archivedAt: string,
): ExpenseGroup =>
  isExpenseGroupArchived(group) ? group : { ...group, archivedAt };

export const restoreExpenseGroup = (group: ExpenseGroup): ExpenseGroup => {
  if (!isExpenseGroupArchived(group)) {
    return group;
  }

  const { archivedAt: _archivedAt, ...restoredGroup } = group;
  return restoredGroup;
};

export const canRemoveParticipantFromGroup = (
  group: ExpenseGroup,
  participantId: string,
  protectedParticipantId: string | null,
): boolean =>
  protectedParticipantId !== null &&
  group.participants.some(
    (participant) => participant.id === protectedParticipantId,
  ) &&
  !isExpenseGroupArchived(group) &&
  group.participants.length > 1 &&
  participantId !== protectedParticipantId &&
  group.participants.some((participant) => participant.id === participantId);
