import type { ExpenseGroup } from '../../types';
import {
  canRemoveParticipantFromGroup,
  getExpenseGroupStatus,
  isExpenseGroupArchived,
} from '../groupDomain';

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

  it('requires a resolved signed-in participant before allowing removal', () => {
    const group: ExpenseGroup = {
      ...legacyGroup,
      participants: [
        { id: 'participant-alex', name: 'Alex' },
        { id: 'participant-blake', name: 'Blake' },
      ],
    };

    expect(
      canRemoveParticipantFromGroup(group, 'participant-blake', null),
    ).toBe(false);
  });

  it('rejects a stale protected participant that is not in the group', () => {
    const group: ExpenseGroup = {
      ...legacyGroup,
      participants: [
        { id: 'participant-alex', name: 'Alex' },
        { id: 'participant-blake', name: 'Blake' },
      ],
    };

    expect(
      canRemoveParticipantFromGroup(
        group,
        'participant-blake',
        'participant-from-another-group',
      ),
    ).toBe(false);
  });
});
