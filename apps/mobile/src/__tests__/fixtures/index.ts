// Test fixtures for consistent test data across all tests
import type { Expense } from '../../types';

export const mockCategories = [
  {
    id: 'cat-1',
    name: 'Food & Dining',
    color: '#FF5722',
    isDefault: false,
  },
  {
    id: 'cat-2',
    name: 'Transportation',
    color: '#2196F3',
    isDefault: false,
  },
  {
    id: 'cat-3',
    name: 'Entertainment',
    color: '#9C27B0',
    isDefault: false,
  },
  {
    id: 'cat-other',
    name: 'Other',
    color: '#757575',
    isDefault: true,
  },
];

export const mockExpenses: Expense[] = [
  {
    id: 'exp-1',
    title: 'Coffee',
    amountMinor: 450,
    currency: 'USD',
    date: '2025-09-19',
    category: 'Food & Dining',
    spaceId: 'personal-space',
    spaceKind: 'personal',
    payments: [{ participantId: 'user-1', amountMinor: 450 }],
    shares: [{ participantId: 'user-1', amountMinor: 450 }],
    caption: '',
  },
  {
    id: 'exp-2',
    title: 'Lunch',
    amountMinor: 1275,
    currency: 'USD',
    date: '2025-09-18',
    category: 'Food & Dining',
    spaceId: 'group-1',
    spaceKind: 'shared',
    payments: [{ participantId: 'user-1', amountMinor: 1275 }],
    shares: [
      { participantId: 'user-1', amountMinor: 638 },
      { participantId: 'user-2', amountMinor: 637 },
    ],
    caption: 'Team lunch',
  },
  {
    id: 'exp-3',
    title: 'Gas',
    amountMinor: 4500,
    currency: 'USD',
    date: '2025-09-17',
    category: 'Transportation',
    spaceId: 'personal-space',
    spaceKind: 'personal',
    payments: [{ participantId: 'user-1', amountMinor: 4500 }],
    shares: [{ participantId: 'user-1', amountMinor: 4500 }],
    caption: '',
  },
];

export const mockGroups = [
  {
    id: 'group-1',
    name: 'Dinner Group',
    participants: [
      { id: 'user-1', name: 'Test User 1' },
      { id: 'user-2', name: 'Test User 2' },
    ],
    createdBy: 'user-1',
    createdAt: '2025-09-15',
  },
  {
    id: 'group-2',
    name: 'Vacation Trip',
    participants: [
      { id: 'user-1', name: 'Test User 1' },
      { id: 'user-3', name: 'Test User 3' },
    ],
    createdBy: 'user-1',
    createdAt: '2025-09-10',
  },
];

export const validExpense = {
  ...mockExpenses[0],
  id: 'expense-valid',
  title: 'Sample Expense',
  amountMinor: 4250,
  date: '2025-09-20',
  category: 'Food & Dining',
  caption: 'Team dinner',
  spaceId: 'group-1',
  spaceKind: 'shared' as const,
  payments: [{ participantId: 'user-1', amountMinor: 4250 }],
  shares: [
    { participantId: 'user-1', amountMinor: 2125 },
    { participantId: 'user-2', amountMinor: 2125 },
  ],
};

export const validGroup = {
  ...mockGroups[0],
  id: 'group-valid',
  name: 'Sample Group',
  lastActivity: '2025-09-20',
  expenses: [
    {
      id: 'expense-1',
      title: 'Shared Dinner',
      amountMinor: 6000,
      currency: 'USD',
      date: '2025-09-19',
    },
  ],
};

export const mockUser = {
  id: 'user-1',
  displayName: 'Test User',
  personalSpaceId: 'personal-space-1',
};

export const mockParticipants = [
  { id: 'user-1', name: 'Test User 1' },
  { id: 'user-2', name: 'Test User 2' },
  { id: 'user-3', name: 'Test User 3' },
];

// Helper functions for creating test data variations
export const createMockExpense = (
  overrides: Partial<Expense> = {},
): Expense => ({
  id: `exp-${Date.now()}`,
  title: 'Test Expense',
  amountMinor: 2500,
  currency: 'USD',
  date: '2025-09-19',
  category: 'Food & Dining',
  spaceId: 'personal-space',
  spaceKind: 'personal',
  payments: [{ participantId: 'user-1', amountMinor: 2500 }],
  shares: [{ participantId: 'user-1', amountMinor: 2500 }],
  caption: '',
  ...overrides,
});

export const createMockCategory = (overrides = {}) => ({
  id: `cat-${Date.now()}`,
  name: 'Test Category',
  color: '#FF5722',
  isDefault: false,
  ...overrides,
});

export const createMockGroup = (overrides = {}) => ({
  id: `group-${Date.now()}`,
  name: 'Test Group',
  participants: [mockParticipants[0], mockParticipants[1]],
  createdBy: 'user-1',
  createdAt: '2025-09-19',
  ...overrides,
});

// Insight calculation test data
export const mockInsightData = {
  monthlyExpenses: [
    { id: 'exp-1', amount: 50, date: '2025-09-01', category: 'Food & Dining' },
    { id: 'exp-2', amount: 30, date: '2025-09-05', category: 'Food & Dining' },
    { id: 'exp-3', amount: 20, date: '2025-09-10', category: 'Transportation' },
  ],
  expectedCategoryBreakdown: [
    { category: 'Food & Dining', total: 80, percentage: 80 },
    { category: 'Transportation', total: 20, percentage: 20 },
  ],
  expectedMonthlyTotal: 100,
};

// Form validation test data
export const validExpenseForm = {
  title: 'Valid Expense',
  amount: '25.50',
  category: 'Food & Dining',
  date: '2025-09-19',
  caption: 'Optional caption',
};

export const invalidExpenseForm = {
  title: '',
  amount: '-10',
  category: '',
  date: '',
  caption: '',
};

export const validCategoryForm = {
  name: 'New Category',
  color: '#4CAF50',
};

export const invalidCategoryForm = {
  name: '',
  color: '',
};

export const validGroupForm = {
  name: 'New Group',
  username: 'TestUser',
};

export const invalidGroupForm = {
  name: '',
  username: '',
};
