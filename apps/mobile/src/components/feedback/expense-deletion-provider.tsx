import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useExpenseStore } from '../../store/expenseStore';
import { flushExpensePersistence } from '../../store/features/expenseStore';
import { mobileTheme } from '../../theme/tokens';
import {
  ExpenseDeletionContext,
  type ExpenseDeletionContextValue,
  useExpenseDeletion,
} from './expense-deletion-context';

export const EXPENSE_UNDO_DURATION_MS = 5_000;
export const EXPENSE_ACCESSIBLE_UNDO_DURATION_MS = 15_000;

interface PendingExpenseDeletion {
  id: string;
  title: string;
}

interface ExpenseDeletionProviderProps {
  children: ReactNode;
}

export const ExpenseDeletionProvider = ({
  children,
}: ExpenseDeletionProviderProps) => {
  const deleteExpense = useExpenseStore((state) => state.deleteExpense);
  const insets = useSafeAreaInsets();
  const [deletionQueue, setDeletionQueue] = useState<PendingExpenseDeletion[]>(
    [],
  );
  const [undoDurationMs, setUndoDurationMs] = useState(
    EXPENSE_UNDO_DURATION_MS,
  );
  const committingIds = useRef(new Set<string>());

  const activeDeletion = deletionQueue[0];
  const activeExpenseId = activeDeletion?.id;

  useEffect(() => {
    let mounted = true;
    const updateDuration = (screenReaderEnabled: boolean) => {
      if (mounted) {
        setUndoDurationMs(
          screenReaderEnabled
            ? EXPENSE_ACCESSIBLE_UNDO_DURATION_MS
            : EXPENSE_UNDO_DURATION_MS,
        );
      }
    };

    void AccessibilityInfo.isScreenReaderEnabled().then(updateDuration);
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      updateDuration,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const removeFromQueue = useCallback((expenseId: string) => {
    setDeletionQueue((current) =>
      current.filter((deletion) => deletion.id !== expenseId),
    );
  }, []);

  const commitDeletion = useCallback(
    async (expenseId: string) => {
      if (committingIds.current.has(expenseId)) {
        return;
      }

      committingIds.current.add(expenseId);
      try {
        deleteExpense(expenseId);
        await flushExpensePersistence();
      } catch {
        // The expense persistence queue retains the exact failed snapshot for
        // its next flush. Keep the in-memory deletion without leaking an
        // unhandled rejection from this transient UI coordinator.
      } finally {
        committingIds.current.delete(expenseId);
      }
    },
    [deleteExpense],
  );

  useEffect(() => {
    if (!activeExpenseId) {
      return;
    }

    const timer = setTimeout(() => {
      void commitDeletion(activeExpenseId);
      removeFromQueue(activeExpenseId);
    }, undoDurationMs);

    return () => clearTimeout(timer);
  }, [activeExpenseId, commitDeletion, removeFromQueue, undoDurationMs]);

  const requestExpenseDeletion = useCallback(
    (expenseId: string, expenseTitle = 'Expense') => {
      setDeletionQueue((current) =>
        current.some((deletion) => deletion.id === expenseId)
          ? current
          : [{ id: expenseId, title: expenseTitle }, ...current],
      );
    },
    [],
  );

  const undoActiveDeletion = useCallback(() => {
    if (activeExpenseId && !committingIds.current.has(activeExpenseId)) {
      removeFromQueue(activeExpenseId);
    }
  }, [activeExpenseId, removeFromQueue]);

  const pendingExpenseDeletionIds = useMemo(
    () => deletionQueue.map((deletion) => deletion.id),
    [deletionQueue],
  );
  const pendingIdSet = useMemo(
    () => new Set(pendingExpenseDeletionIds),
    [pendingExpenseDeletionIds],
  );
  const contextValue = useMemo<ExpenseDeletionContextValue>(
    () => ({
      isPendingDeletion: (expenseId) => pendingIdSet.has(expenseId),
      pendingExpenseDeletionIds,
      requestExpenseDeletion,
    }),
    [pendingExpenseDeletionIds, pendingIdSet, requestExpenseDeletion],
  );

  return (
    <ExpenseDeletionContext.Provider value={contextValue}>
      {children}
      {activeDeletion ? (
        <View
          accessibilityLiveRegion='polite'
          key={activeDeletion.id}
          style={[styles.notice, { bottom: Math.max(insets.bottom, 16) + 72 }]}
          testID='expense-deleted-notice'
        >
          <Text
            accessible
            accessibilityLabel={`${activeDeletion.title} deleted. Undo available.`}
            accessibilityRole='alert'
            style={styles.message}
          >
            Expense deleted
          </Text>
          <Text accessibilityElementsHidden style={styles.separator}>
            ·
          </Text>
          <TouchableOpacity
            accessibilityLabel={`Undo deletion of ${activeDeletion.title}`}
            accessibilityRole='button'
            hitSlop={mobileTheme.spacing.sm}
            onPress={undoActiveDeletion}
            style={styles.undoButton}
          >
            <Text style={styles.undoText}>Undo</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ExpenseDeletionContext.Provider>
  );
};

export { useExpenseDeletion };

const styles = StyleSheet.create({
  notice: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: 48,
    maxWidth: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.pill,
    backgroundColor: mobileTheme.colors.text,
    ...mobileTheme.shadows.action,
  },
  message: {
    color: mobileTheme.colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  separator: {
    color: mobileTheme.colors.surface,
    marginHorizontal: mobileTheme.spacing.sm,
  },
  undoButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  undoText: {
    color: mobileTheme.colors.primaryContainer,
    fontSize: 15,
    fontWeight: '700',
  },
});
