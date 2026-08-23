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
