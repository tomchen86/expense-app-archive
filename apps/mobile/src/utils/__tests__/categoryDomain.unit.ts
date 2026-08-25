import type { Category, Expense } from '../../types';
import { resolveExpenseCategoryPresentation } from '../categoryDomain';

const expense: Expense = {
  id: 'expense-1',
  title: 'Coffee',
  date: '2026-08-25',
  category: 'Legacy name',
  categoryId: 'category-1',
  categorySnapshot: { name: 'Snapshot name', color: '#123456' },
};

describe('expense category presentation', () => {
  it('uses current category metadata and marks archived history', () => {
    const category: Category = {
      id: 'category-1',
      name: 'Coffee',
      color: '#654321',
      archivedAt: '2026-08-25T00:00:00.000Z',
    };

    expect(resolveExpenseCategoryPresentation(expense, [category])).toEqual({
      archived: true,
      color: '#654321',
      label: 'Coffee (Archived)',
      name: 'Coffee',
    });
  });

  it('falls back to the stored snapshot while a reference is unavailable', () => {
    expect(resolveExpenseCategoryPresentation(expense, [])).toEqual({
      archived: false,
      color: '#123456',
      label: 'Snapshot name',
      name: 'Snapshot name',
    });
  });
});
