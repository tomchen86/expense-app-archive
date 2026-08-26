import { useUserStore } from './features/userStore';

// Application-facing store boundary. UI code must not reach into slices.
export { useExpenseStore } from './composedExpenseStore';
export {
  flushExpensePersistence,
  getExpenseMutationVersion,
} from './features/expenseStore';

export const ensureLocalIdentityPersisted = (): Promise<void> =>
  useUserStore.getState().ensureLocalIdentityPersisted();
