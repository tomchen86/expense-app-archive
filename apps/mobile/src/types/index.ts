// Centralized type definitions for the application

// Import necessary types if they were defined elsewhere (e.g., constants)
// import { EXPENSE_CATEGORIES } from "../constants/expenses"; // Will be an array of Category objects

// Represents the name of the category, used as an identifier
export type ExpenseCategory = string;

export interface Category {
  id: string; // Stable UUID; legacy name-based identifiers require migration before sync.
  name: string;
  color: string; // Hex color code
  isDefault?: boolean;
}

export interface Participant {
  id: string;
  name: string;
  active?: boolean;
  spaceId?: string;
  userId?: string;
}

export interface ExpenseGroup {
  id: string;
  name: string;
  participants: Participant[];
  createdAt: string;
  archivedAt?: string;
}

export type ExpenseSpaceKind = 'personal' | 'shared';

export interface MoneyAllocation {
  participantId: string;
  amountMinor: number;
}

export type ExpenseSyncStatus =
  'local_only' | 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';

export interface ExpenseSyncMetadata {
  mutationId: string;
  serverVersion?: number;
  localRevision?: number;
  /** @deprecated Legacy mobile-local counter retained for hydration only. */
  version?: number;
  status: ExpenseSyncStatus;
  updatedAt: string;
  deletedAt?: string;
  lastError?: string;
}

export interface ExpenseMutationVersion {
  mutationId: string;
  serverVersion: number;
  localRevision: number;
  status: ExpenseSyncStatus;
  updatedAt: string;
  deletedAt?: string;
}

export type ExpenseRollbackResult =
  | { status: 'applied' }
  | {
      status: 'conflict';
      reason: 'missing' | 'version-mismatch' | 'snapshot-version-mismatch';
    };

export type ExpenseVersionMatchResult =
  | { status: 'matched' }
  | { status: 'conflict'; reason: 'missing' | 'version-mismatch' };

export type ExpenseConditionalUpdateResult =
  | { status: 'applied'; version: ExpenseMutationVersion }
  | { status: 'conflict'; reason: 'missing' | 'version-mismatch' };

export interface Expense {
  id: string;
  title: string;
  date: string;
  caption?: string;
  category: ExpenseCategory;
  categoryId?: string;

  // Canonical V2 fields. All newly-created expenses populate these fields.
  amountMinor?: number;
  currency?: string;
  spaceId?: string;
  spaceKind?: ExpenseSpaceKind;
  payments?: MoneyAllocation[];
  shares?: MoneyAllocation[];
  sync?: ExpenseSyncMetadata;

  // Legacy read compatibility. New writes must not populate these fields.
  amount?: number;
  groupId?: string;
  paidBy?: string;
  splitBetween?: string[];
  participants?: Participant[];
}

// User Identity (rarely changes)
export interface User {
  id: string; // Internal unique ID (replaces internalUserId)
  displayName: string; // Human-readable name for all purposes
  personalSpaceId?: string;
}

// User Preferences (frequently changes)
export interface Settings {
  theme: 'light' | 'dark';
  currency: string;
  dateFormat: string;
  notifications?: boolean;
  insightsChartPreference?: 'auto' | 'donut' | 'bar';
}

// Legacy interface - will be removed after refactor
export interface UserSettings {
  name: string;
}

// Interface defining the shape of the Zustand store state and actions
export interface ExpenseState {
  expenses: Expense[];
  groups: ExpenseGroup[];
  participants: Participant[];
  categories: Category[];

  // New user structure
  user: User | null;
  settings: Settings;

  // Legacy structure (temporary - will be removed)
  userSettings: UserSettings | null;
  internalUserId: string | null;
  personalSpaceId: string;
  personalParticipantId: string;

  // Expense management
  addExpense: (expense: Omit<Expense, 'id' | 'sync'>) => string;
  updateExpense: (expense: Expense) => void;
  updateExpenseIfVersion: (
    expense: Expense,
    expectedCurrentVersion: ExpenseMutationVersion | null,
  ) => ExpenseConditionalUpdateResult;
  checkExpenseVersion: (
    id: string,
    expectedCurrentVersion: ExpenseMutationVersion,
  ) => ExpenseVersionMatchResult;
  deleteExpense: (id: string) => void;
  deleteExpenseDraftIfVersion: (
    id: string,
    expectedCurrentVersion: ExpenseMutationVersion,
  ) => ExpenseRollbackResult;
  restoreExpenseSnapshot: (
    expense: Expense,
    expectedCurrentVersion: ExpenseMutationVersion,
    expectedSnapshotVersion: ExpenseMutationVersion | null,
  ) => ExpenseRollbackResult;
  getExpenseById: (id: string) => Expense | undefined;

  // New user management
  updateUser: (userData: Partial<User>) => Promise<boolean>;
  updateSettings: (settingsData: Partial<Settings>) => void;
  createUser: (displayName: string) => string; // Returns user ID

  // Legacy user management (temporary)
  updateUserSettings: (settings: UserSettings) => Promise<boolean>;

  // Group management
  addGroup: (name: string) => Promise<string>; // Resolves after identity, participant, and group durability
  updateGroup: (group: ExpenseGroup) => void;
  archiveGroup: (id: string) => Promise<boolean>;
  restoreGroup: (id: string) => Promise<boolean>;
  /** @deprecated Use archiveGroup for the non-destructive lifecycle action. */
  deleteGroup: (id: string) => Promise<boolean>;
  getGroupById: (id: string) => ExpenseGroup | undefined;

  // Participant management
  addParticipant: (
    name: string,
    idOverride?: string,
    identity?: Pick<Participant, 'spaceId' | 'userId'>,
  ) => string;
  updateParticipant: (participant: Participant) => Promise<boolean>;
  deleteParticipant: (id: string) => Promise<boolean>;
  getParticipantById: (id: string) => Participant | undefined;

  // Group participants
  addParticipantToGroup: (
    groupId: string,
    participantId: string,
  ) => Promise<boolean>;
  addParticipantToGroupByName: (
    groupId: string,
    participantName: string,
  ) => Promise<string | null>;
  removeParticipantFromGroup: (
    groupId: string,
    participantId: string,
  ) => Promise<boolean>;

  // Category management
  addCategory: (categoryData: Omit<Category, 'id'>) => Category; // Returns the new category with an ID
  updateCategory: (category: Category) => void;
  deleteCategory: (categoryId: string) => void;
  getCategoryByName: (name: string) => Category | undefined;
}
