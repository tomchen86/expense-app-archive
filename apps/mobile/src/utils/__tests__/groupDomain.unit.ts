import type { ExpenseGroup } from '../../types';
import { getExpenseGroupStatus, isExpenseGroupArchived } from '../groupDomain';

const legacyGroup: ExpenseGroup = {
  id: 'group-legacy',
  name: 'Legacy Group',
  participants: [],
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('group lifecycle domain', () => {
  it('treats a legacy group without archivedAt as active', () => {
    expect(getExpenseGroupStatus(legacyGroup)).toBe('active');
    expect(isExpenseGroupArchived(legacyGroup)).toBe(false);
  });

  it('derives archived status from archivedAt', () => {
    const archivedGroup = {
      ...legacyGroup,
      archivedAt: '2026-08-24T01:02:03.000Z',
    };

    expect(getExpenseGroupStatus(archivedGroup)).toBe('archived');
    expect(isExpenseGroupArchived(archivedGroup)).toBe(true);
  });
});
