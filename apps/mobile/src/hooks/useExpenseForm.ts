import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Platform as _Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useExpenseStore } from '../store/expenseStore';
import { flushExpensePersistence } from '../store/features/expenseStore';
import {
  Expense,
  Participant,
  ExpenseGroup,
  ExpenseCategory,
  Category as _Category,
} from '../types'; // Added Category for type safety if needed
import {
  allocateEqualShares,
  formatLocalCalendarDate,
  minorUnitsToDecimalString,
  parseDecimalToMinorUnits,
  parseLocalCalendarDate,
} from '../utils/money';
import {
  getExpenseAmountMinor,
  getExpenseCurrency,
  getExpensePayments,
  getExpenseShares,
  getExpenseSpaceId,
  getExpenseSpaceKind,
} from '../utils/expenseDomain';
import { isExpenseGroupArchived } from '../utils/groupDomain';

// Define the shape of the form data
interface FormState {
  title: string;
  amount: string;
  date: Date;
  caption: string;
  category: ExpenseCategory;
  selectedGroup: ExpenseGroup | null;
  paidByParticipant: Participant | null;
  selectedParticipants: Participant[];
}

// Define the props for the hook
interface UseExpenseFormProps {
  editingExpense?: Expense | null;
  initialSpaceId?: string;
}

interface FinancialEditIntent {
  spaceTouched: boolean;
  paymentsTouched: boolean;
  sharesTouched: boolean;
}

interface FinancialSelection {
  spaceId?: string;
  payerId?: string;
  shareParticipantIds: string[];
}

interface PendingSubmission {
  expenseId: string;
  serializedExpenseData: string;
}

interface PreparedSubmission {
  expenseData: Omit<Expense, 'id' | 'sync'>;
  serializedExpenseData: string;
}

const EMPTY_FINANCIAL_INTENT: FinancialEditIntent = {
  spaceTouched: false,
  paymentsTouched: false,
  sharesTouched: false,
};

const allocationsMatch = (
  left: ReturnType<typeof getExpenseShares>,
  right: ReturnType<typeof getExpenseShares>,
): boolean =>
  left.length === right.length &&
  left.every(
    (allocation, index) =>
      allocation.participantId === right[index]?.participantId &&
      allocation.amountMinor === right[index]?.amountMinor,
  );

const participantIdsMatch = (left: string[], right: string[]): boolean =>
  left.length === right.length &&
  left.every((participantId, index) => participantId === right[index]);

export const useExpenseForm = ({
  editingExpense,
  initialSpaceId,
}: UseExpenseFormProps) => {
  // Get data and actions from the Zustand store
  const addExpenseToStore = useExpenseStore((state) => state.addExpense);
  const updateExpenseToStore = useExpenseStore((state) => state.updateExpense);
  const allGroups = useExpenseStore((state) => state.groups);
  const participants = useExpenseStore((state) => state.participants);
  const categories = useExpenseStore((state) => state.categories);
  const userSettings = useExpenseStore((state) => state.userSettings);
  const internalUserId = useExpenseStore((state) => state.internalUserId); // Get internalUserId
  const user = useExpenseStore((state) => state.user);
  const settings = useExpenseStore((state) => state.settings);
  const personalSpaceId = useExpenseStore((state) => state.personalSpaceId);
  const personalParticipantId = useExpenseStore(
    (state) => state.personalParticipantId,
  );

  const isEditing = !!editingExpense;
  const groups = useMemo(
    () => allGroups.filter((group) => !isExpenseGroupArchived(group)),
    [allGroups],
  );

  // Find the current user's participant entry
  const _currentUserParticipant = useMemo(() => {
    return userSettings?.name
      ? participants.find((p) => p.name === userSettings.name)
      : null;
  }, [userSettings, participants]);

  // Initialize state with default values
  const financialEditIntent = useRef<FinancialEditIntent>({
    ...EMPTY_FINANCIAL_INTENT,
  });
  const initialFinancialSelection = useRef<FinancialSelection>({
    shareParticipantIds: [],
  });
  const pendingSubmission = useRef<PendingSubmission | null>(null);
  const queuedSubmission = useRef<PreparedSubmission | null>(null);
  const submissionContextGeneration = useRef(0);
  const submissionInFlightGeneration = useRef<number | null>(null);
  const [formState, setFormStateInternal] = useState<FormState>({
    title: '',
    amount: '',
    date: new Date(),
    caption: '',
    category: categories[0]?.name ?? 'Other', // Use first category from store
    selectedGroup: null,
    paidByParticipant: null,
    selectedParticipants: [],
  });

  const setFormState = useCallback<Dispatch<SetStateAction<FormState>>>(
    (update) => {
      setFormStateInternal((previous) => {
        const next = typeof update === 'function' ? update(previous) : update;
        if (previous.selectedGroup?.id !== next.selectedGroup?.id) {
          financialEditIntent.current.spaceTouched = true;
        }
        if (previous.paidByParticipant?.id !== next.paidByParticipant?.id) {
          financialEditIntent.current.paymentsTouched = true;
        }
        if (
          previous.selectedParticipants.length !==
            next.selectedParticipants.length ||
          previous.selectedParticipants.some(
            (participant, index) =>
              participant.id !== next.selectedParticipants[index]?.id,
          )
        ) {
          financialEditIntent.current.sharesTouched = true;
        }
        return next;
      });
    },
    [],
  );

  // Initialize form state from editingExpense when it changes
  useEffect(() => {
    if (!editingExpense) {
      const initialGroup = initialSpaceId
        ? (groups.find((group) => group.id === initialSpaceId) ?? null)
        : null;
      // Reset form if editingExpense becomes null/undefined (e.g., navigating back)
      financialEditIntent.current = { ...EMPTY_FINANCIAL_INTENT };
      initialFinancialSelection.current = {
        spaceId: initialGroup?.id,
        shareParticipantIds: [],
      };
      setFormStateInternal({
        title: '',
        amount: '',
        date: new Date(),
        caption: '',
        category: categories[0]?.name ?? 'Other', // Use first category from store
        selectedGroup: initialGroup,
        paidByParticipant: null,
        selectedParticipants: [],
      });
      return;
    }

    const expenseSpaceId = getExpenseSpaceId(editingExpense);
    const group =
      expenseSpaceId && getExpenseSpaceKind(editingExpense) !== 'personal'
        ? (allGroups.find((g) => g.id === expenseSpaceId) ?? null)
        : null;
    const paymentParticipantId =
      getExpensePayments(editingExpense)[0]?.participantId;
    const paidBy = paymentParticipantId
      ? (participants.find((p) => p.id === paymentParticipantId) ?? null)
      : null;
    const shareParticipantIds = new Set(
      getExpenseShares(editingExpense).map((share) => share.participantId),
    );
    const splitBetween = participants.filter((participant) =>
      shareParticipantIds.has(participant.id),
    );
    const expenseCurrency = getExpenseCurrency(editingExpense);

    financialEditIntent.current = { ...EMPTY_FINANCIAL_INTENT };
    initialFinancialSelection.current = {
      spaceId: group?.id,
      payerId: paidBy?.id,
      shareParticipantIds: splitBetween.map((participant) => participant.id),
    };
    setFormStateInternal({
      title: editingExpense.title,
      amount: minorUnitsToDecimalString(
        getExpenseAmountMinor(editingExpense),
        expenseCurrency,
      ),
      date: parseLocalCalendarDate(editingExpense.date) ?? new Date(),
      caption: editingExpense.caption ?? '',
      category: editingExpense.category,
      selectedGroup: group,
      paidByParticipant: paidBy,
      selectedParticipants: splitBetween,
    });
  }, [
    editingExpense,
    allGroups,
    groups,
    participants,
    categories,
    initialSpaceId,
  ]);

  useEffect(() => {
    submissionContextGeneration.current += 1;
    const contextGeneration = submissionContextGeneration.current;
    pendingSubmission.current = null;
    queuedSubmission.current = null;

    return () => {
      if (submissionContextGeneration.current === contextGeneration) {
        submissionContextGeneration.current += 1;
        pendingSubmission.current = null;
        queuedSubmission.current = null;
      }
    };
  }, [editingExpense?.id, initialSpaceId]);

  // Generic handler to update any form field
  const handleUpdateFormState = (field: keyof FormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  // Handler to remove a participant from the split list
  const handleRemoveParticipant = (participantId: string) => {
    setFormState((prev) => ({
      ...prev,
      selectedParticipants: prev.selectedParticipants.filter(
        (p) => p.id !== participantId,
      ),
    }));
  };

  // Handler for date changes from DateTimePicker
  const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || formState.date;
    // Note: Hiding the picker is usually handled in the component UI state
    setFormState((prev) => ({ ...prev, date: currentDate }));
  };

  // Handler for form submission (add or update)
  const handleSubmit = async () => {
    // --- Validation ---
    if (
      !formState.title ||
      !formState.amount ||
      !formState.date ||
      !formState.category
    ) {
      Alert.alert('Validation Error', 'Please fill all required fields.');
      return;
    }

    const originalCurrency = editingExpense
      ? getExpenseCurrency(editingExpense)
      : null;
    const currency = originalCurrency ?? settings.currency.toUpperCase();
    const amountMinor = parseDecimalToMinorUnits(
      formState.amount,
      currency.toUpperCase(),
    );
    if (amountMinor === null) {
      Alert.alert(
        'Validation Error',
        'Amount must be a positive value with valid currency precision.',
      );
      return;
    }

    const originalSpaceKind = editingExpense
      ? getExpenseSpaceKind(editingExpense)
      : undefined;
    const originalSpaceId = editingExpense
      ? getExpenseSpaceId(editingExpense)
      : undefined;
    const originalSharedGroup =
      originalSpaceKind === 'shared' && originalSpaceId
        ? allGroups.find((group) => group.id === originalSpaceId)
        : undefined;

    if (editingExpense && originalSpaceKind === 'shared') {
      if (!originalSharedGroup || isExpenseGroupArchived(originalSharedGroup)) {
        Alert.alert(
          'Historical Shared Expense',
          'Restore its group before editing this expense.',
        );
        return;
      }
      if (formState.selectedGroup?.id !== originalSpaceId) {
        Alert.alert(
          'Shared Expense',
          'A shared expense cannot be moved to another ledger while editing.',
        );
        return;
      }
    }

    const currentUserId = user?.id ?? internalUserId;
    if (!currentUserId || !personalParticipantId) {
      Alert.alert('Validation Error', 'A local user identity is required.');
      return;
    }

    const originalAmountMinor = editingExpense
      ? getExpenseAmountMinor(editingExpense)
      : undefined;
    const originalPayments = editingExpense
      ? getExpensePayments(editingExpense)
      : [];
    const originalShares = editingExpense
      ? getExpenseShares(editingExpense)
      : [];
    const amountChanged =
      originalAmountMinor !== undefined && amountMinor !== originalAmountMinor;
    const spaceSelectionChanged =
      financialEditIntent.current.spaceTouched &&
      formState.selectedGroup?.id !== initialFinancialSelection.current.spaceId;
    const paymentSelectionChanged =
      financialEditIntent.current.paymentsTouched &&
      formState.paidByParticipant?.id !==
        initialFinancialSelection.current.payerId;
    const shareSelectionChanged =
      financialEditIntent.current.sharesTouched &&
      !participantIdsMatch(
        formState.selectedParticipants.map((participant) => participant.id),
        initialFinancialSelection.current.shareParticipantIds,
      );
    const paymentsRepresentable =
      originalAmountMinor !== undefined &&
      originalPayments.length === 1 &&
      originalPayments[0]?.amountMinor === originalAmountMinor;
    const sharesRepresentable =
      originalAmountMinor !== undefined &&
      allocationsMatch(
        originalShares,
        allocateEqualShares(
          originalAmountMinor,
          originalShares.map((share) => share.participantId),
        ),
      );
    const isSharedExpense = editingExpense
      ? originalSpaceKind === 'shared' ||
        (spaceSelectionChanged && !!formState.selectedGroup)
      : !!formState.selectedGroup;

    if (
      editingExpense &&
      originalSpaceKind === 'shared' &&
      ((amountChanged && (!paymentsRepresentable || !sharesRepresentable)) ||
        (paymentSelectionChanged && !paymentsRepresentable) ||
        (shareSelectionChanged && !sharesRepresentable) ||
        (spaceSelectionChanged &&
          (!paymentsRepresentable || !sharesRepresentable)))
    ) {
      Alert.alert(
        'Allocation Update Required',
        'Custom shared allocations need a dedicated editor before the amount or split can change.',
      );
      return;
    }

    const rebuildPayments =
      !editingExpense ||
      amountChanged ||
      paymentSelectionChanged ||
      spaceSelectionChanged;
    const rebuildShares =
      !editingExpense ||
      amountChanged ||
      shareSelectionChanged ||
      spaceSelectionChanged;
    if (
      isSharedExpense &&
      ((rebuildPayments && !formState.paidByParticipant) ||
        (rebuildShares && formState.selectedParticipants.length === 0))
    ) {
      Alert.alert(
        'Validation Error',
        'When adding to a group, please select who paid and who to split with.',
      );
      return;
    }
    // --- End Validation ---

    const spaceId =
      editingExpense && !spaceSelectionChanged
        ? (originalSpaceId ?? personalSpaceId)
        : (formState.selectedGroup?.id ?? personalSpaceId);
    const payerId = isSharedExpense
      ? (formState.paidByParticipant?.id ?? personalParticipantId)
      : (originalPayments[0]?.participantId ?? personalParticipantId);
    const payments = rebuildPayments
      ? [{ participantId: payerId, amountMinor }]
      : originalPayments;
    const personalShareParticipantIds =
      originalShares.length > 0
        ? originalShares.map((share) => share.participantId)
        : [personalParticipantId];
    const shares = rebuildShares
      ? allocateEqualShares(
          amountMinor,
          isSharedExpense
            ? formState.selectedParticipants.map(
                (participant) => participant.id,
              )
            : personalShareParticipantIds,
        )
      : originalShares;
    const selectedCategory = categories.find(
      (category) => category.name === formState.category,
    );

    // Prepare data for the store action
    const expenseData = {
      title: formState.title.trim(),
      amountMinor,
      currency,
      date: formatLocalCalendarDate(formState.date),
      category: formState.category,
      ...(selectedCategory ? { categoryId: selectedCategory.id } : {}),
      spaceId,
      spaceKind: isSharedExpense ? ('shared' as const) : ('personal' as const),
      payments,
      shares,
      ...(formState.caption.trim()
        ? { caption: formState.caption.trim() }
        : {}),
    };

    // The check for paidById on personal expenses is removed.
    // If currentUserParticipant was null, paidById will be undefined,
    // and the expense will be added without a payer, which is now allowed.

    const contextGeneration = submissionContextGeneration.current;
    const preparedSubmission: PreparedSubmission = {
      expenseData,
      serializedExpenseData: JSON.stringify(expenseData),
    };

    if (submissionInFlightGeneration.current === contextGeneration) {
      queuedSubmission.current = preparedSubmission;
      return;
    }

    submissionInFlightGeneration.current = contextGeneration;
    queuedSubmission.current = null;
    let nextSubmission = preparedSubmission;
    try {
      while (submissionContextGeneration.current === contextGeneration) {
        const pending = pendingSubmission.current;
        if (pending) {
          if (
            pending.serializedExpenseData !==
            nextSubmission.serializedExpenseData
          ) {
            updateExpenseToStore({
              ...nextSubmission.expenseData,
              id: pending.expenseId,
            });
            pending.serializedExpenseData =
              nextSubmission.serializedExpenseData;
          }
        } else if (isEditing && editingExpense) {
          updateExpenseToStore({
            ...nextSubmission.expenseData,
            id: editingExpense.id,
          });
          pendingSubmission.current = {
            expenseId: editingExpense.id,
            serializedExpenseData: nextSubmission.serializedExpenseData,
          };
        } else {
          pendingSubmission.current = {
            expenseId: addExpenseToStore(nextSubmission.expenseData),
            serializedExpenseData: nextSubmission.serializedExpenseData,
          };
        }

        await flushExpensePersistence();
        if (submissionContextGeneration.current !== contextGeneration) {
          return;
        }

        // Another submit can update this ref while the awaited write is in
        // flight, even though TypeScript cannot observe that async event.
        const queued = queuedSubmission.current as PreparedSubmission | null;
        queuedSubmission.current = null;
        if (
          queued &&
          queued.serializedExpenseData !== nextSubmission.serializedExpenseData
        ) {
          nextSubmission = queued;
          continue;
        }

        pendingSubmission.current = null;
        router.back();
        return;
      }
    } catch {
      if (submissionContextGeneration.current === contextGeneration) {
        Alert.alert(
          'Storage Error',
          'The expense could not be saved to this device. Please try again.',
        );
      }
    } finally {
      if (submissionInFlightGeneration.current === contextGeneration) {
        submissionInFlightGeneration.current = null;
      }
    }
  };

  return {
    formState,
    setFormState,
    handleUpdateFormState,
    handleRemoveParticipant,
    onChangeDate,
    handleSubmit,
    isEditing,
    // Expose necessary data for modals/pickers if not handled by components
    groups,
    participants,
    categories,
  };
};
