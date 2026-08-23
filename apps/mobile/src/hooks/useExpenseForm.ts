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
import {
  flushExpensePersistence,
  getExpenseMutationVersion,
} from '../store/features/expenseStore';
import { useUserStore as useUserFeatureStore } from '../store/features/userStore';
import {
  Expense,
  Participant,
  ExpenseGroup,
  ExpenseCategory,
  ExpenseMutationVersion,
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
import { createUuid } from '../utils/ids';

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
  draftSessionId: string;
  editingExpense?: Expense | null;
  initialSpaceId?: string;
  onSaved?: () => void;
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
  attemptedVersion: ExpenseMutationVersion;
  expenseId: string;
  openingExpected: ExpenseMutationVersion | null;
  serializedExpenseData: string;
}

interface PreparedSubmission {
  expenseData: Omit<Expense, 'id' | 'sync'>;
  serializedExpenseData: string;
}

interface ExpenseFormDraftSession {
  activeAttemptToken?: string;
  financialEditIntent: FinancialEditIntent;
  formState: FormState;
  initialFinancialSelection: FinancialSelection;
  isDirty: boolean;
  originalExpense?: Expense;
  ownerToken?: string;
  pendingSubmission: PendingSubmission | null;
  rollbackPending: boolean;
  saveConflict: boolean;
  sharingEnabled: boolean;
}

const expenseFormDraftSessions = new Map<string, ExpenseFormDraftSession>();

export const resetExpenseFormDraftSessionsForTests = () => {
  expenseFormDraftSessions.clear();
};

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

const cloneFormState = (formState: FormState): FormState => ({
  ...formState,
  date: new Date(formState.date),
  selectedParticipants: [...formState.selectedParticipants],
});

const cloneExpenseSnapshot = (expense: Expense): Expense =>
  JSON.parse(JSON.stringify(expense)) as Expense;

const requireExpenseMutationVersion = (
  expenseId: string,
): ExpenseMutationVersion => {
  const expense = useExpenseStore.getState().getExpenseById(expenseId);
  const version = expense ? getExpenseMutationVersion(expense) : null;
  if (!version) {
    throw new Error('A pending expense mutation requires version metadata.');
  }
  return version;
};

export const useExpenseForm = ({
  draftSessionId,
  editingExpense,
  initialSpaceId,
  onSaved,
}: UseExpenseFormProps) => {
  // Get data and actions from the Zustand store
  const addExpenseToStore = useExpenseStore((state) => state.addExpense);
  const updateExpenseIfVersion = useExpenseStore(
    (state) => state.updateExpenseIfVersion,
  );
  const checkExpenseVersion = useExpenseStore(
    (state) => state.checkExpenseVersion,
  );
  const deleteExpenseDraftIfVersion = useExpenseStore(
    (state) => state.deleteExpenseDraftIfVersion,
  );
  const restoreExpenseSnapshot = useExpenseStore(
    (state) => state.restoreExpenseSnapshot,
  );
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
  const submissionContextKey = editingExpense
    ? `edit:${editingExpense.id}:${draftSessionId}`
    : `create:${draftSessionId}`;
  const existingDraftSession =
    expenseFormDraftSessions.get(submissionContextKey);

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
    ...(existingDraftSession?.financialEditIntent ?? EMPTY_FINANCIAL_INTENT),
  });
  const initialFinancialSelection = useRef<FinancialSelection>({
    ...(existingDraftSession?.initialFinancialSelection ?? {
      shareParticipantIds: [],
    }),
  });
  const initializedFormContext = useRef<string | null>(null);
  const pendingSubmission = useRef<PendingSubmission | null>(
    existingDraftSession?.pendingSubmission ?? null,
  );
  const queuedSubmission = useRef<PreparedSubmission | null>(null);
  const submissionContextGeneration = useRef(0);
  const submissionInFlightGeneration = useRef<number | null>(null);
  const ownerToken = useRef(createUuid());
  const [isDirty, setIsDirty] = useState(
    existingDraftSession?.isDirty ?? false,
  );
  const [isRollbackPending, setIsRollbackPending] = useState(
    existingDraftSession?.rollbackPending ?? false,
  );
  const [hasSaveConflict, setHasSaveConflict] = useState(
    existingDraftSession?.saveConflict ?? false,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sharingEnabled, setSharingEnabled] = useState(
    existingDraftSession?.sharingEnabled ??
      Boolean(
        initialSpaceId ||
        (editingExpense && getExpenseSpaceKind(editingExpense) === 'shared'),
      ),
  );
  const [formState, setFormStateInternal] = useState<FormState>({
    ...(existingDraftSession?.formState ?? {
      title: '',
      amount: '',
      date: new Date(),
      caption: '',
      category: categories[0]?.name ?? 'Other',
      selectedGroup: null,
      paidByParticipant: null,
      selectedParticipants: [],
    }),
  });
  const hasPendingMutation =
    pendingSubmission.current !== null || isRollbackPending || hasSaveConflict;

  const updateOwnedDraftSession = useCallback(
    (update: (session: ExpenseFormDraftSession) => void) => {
      const session = expenseFormDraftSessions.get(submissionContextKey);
      if (session?.ownerToken === ownerToken.current) {
        update(session);
      }
    },
    [submissionContextKey],
  );

  const setFormState = useCallback<Dispatch<SetStateAction<FormState>>>(
    (update) => {
      setIsDirty(true);
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
        updateOwnedDraftSession((session) => {
          session.financialEditIntent = { ...financialEditIntent.current };
          session.formState = cloneFormState(next);
          session.isDirty = true;
        });
        return next;
      });
    },
    [updateOwnedDraftSession],
  );

  // Initialize form state from editingExpense when it changes
  useEffect(() => {
    if (initializedFormContext.current === submissionContextKey) {
      return;
    }
    initializedFormContext.current = submissionContextKey;

    const restoredSession = expenseFormDraftSessions.get(submissionContextKey);
    if (restoredSession) {
      restoredSession.ownerToken = ownerToken.current;
      financialEditIntent.current = {
        ...restoredSession.financialEditIntent,
      };
      initialFinancialSelection.current = {
        ...restoredSession.initialFinancialSelection,
        shareParticipantIds: [
          ...restoredSession.initialFinancialSelection.shareParticipantIds,
        ],
      };
      pendingSubmission.current = restoredSession.pendingSubmission;
      setFormStateInternal(cloneFormState(restoredSession.formState));
      setIsDirty(restoredSession.isDirty);
      setIsRollbackPending(restoredSession.rollbackPending);
      setHasSaveConflict(restoredSession.saveConflict);
      setSharingEnabled(restoredSession.sharingEnabled);
      return;
    }

    if (!editingExpense) {
      const initialGroup = initialSpaceId
        ? (groups.find((group) => group.id === initialSpaceId) ?? null)
        : null;
      const initialFormState: FormState = {
        title: '',
        amount: '',
        date: new Date(),
        caption: '',
        category: categories[0]?.name ?? 'Other',
        selectedGroup: initialGroup,
        paidByParticipant: null,
        selectedParticipants: [],
      };
      financialEditIntent.current = { ...EMPTY_FINANCIAL_INTENT };
      setIsDirty(false);
      initialFinancialSelection.current = {
        spaceId: initialGroup?.id,
        shareParticipantIds: [],
      };
      setSharingEnabled(Boolean(initialGroup));
      setIsRollbackPending(false);
      setHasSaveConflict(false);
      setFormStateInternal(initialFormState);
      expenseFormDraftSessions.set(submissionContextKey, {
        financialEditIntent: { ...EMPTY_FINANCIAL_INTENT },
        formState: cloneFormState(initialFormState),
        initialFinancialSelection: {
          ...initialFinancialSelection.current,
          shareParticipantIds: [],
        },
        isDirty: false,
        ownerToken: ownerToken.current,
        pendingSubmission: null,
        rollbackPending: false,
        saveConflict: false,
        sharingEnabled: Boolean(initialGroup),
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

    const initialFormState: FormState = {
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
    };
    financialEditIntent.current = { ...EMPTY_FINANCIAL_INTENT };
    setIsDirty(false);
    initialFinancialSelection.current = {
      spaceId: group?.id,
      payerId: paidBy?.id,
      shareParticipantIds: splitBetween.map((participant) => participant.id),
    };
    setSharingEnabled(getExpenseSpaceKind(editingExpense) === 'shared');
    setIsRollbackPending(false);
    setHasSaveConflict(false);
    setFormStateInternal(initialFormState);
    expenseFormDraftSessions.set(submissionContextKey, {
      financialEditIntent: { ...EMPTY_FINANCIAL_INTENT },
      formState: cloneFormState(initialFormState),
      initialFinancialSelection: {
        ...initialFinancialSelection.current,
        shareParticipantIds: [
          ...initialFinancialSelection.current.shareParticipantIds,
        ],
      },
      isDirty: false,
      originalExpense: cloneExpenseSnapshot(editingExpense),
      ownerToken: ownerToken.current,
      pendingSubmission: null,
      rollbackPending: false,
      saveConflict: false,
      sharingEnabled: getExpenseSpaceKind(editingExpense) === 'shared',
    });
  }, [
    editingExpense,
    allGroups,
    groups,
    participants,
    categories,
    initialSpaceId,
    submissionContextKey,
  ]);

  useEffect(() => {
    submissionContextGeneration.current += 1;
    const contextGeneration = submissionContextGeneration.current;
    const session = expenseFormDraftSessions.get(submissionContextKey);
    if (session) {
      session.ownerToken = ownerToken.current;
      pendingSubmission.current = session.pendingSubmission;
    }
    queuedSubmission.current = null;

    return () => {
      if (submissionContextGeneration.current === contextGeneration) {
        submissionContextGeneration.current += 1;
        queuedSubmission.current = null;
      }
      const currentSession = expenseFormDraftSessions.get(submissionContextKey);
      if (currentSession?.ownerToken === ownerToken.current) {
        currentSession.ownerToken = undefined;
      }
    };
  }, [submissionContextKey]);

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
    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }
    setFormState((prev) => ({ ...prev, date: selectedDate }));
  };

  const sharingLocked = Boolean(
    editingExpense && getExpenseSpaceKind(editingExpense) === 'shared',
  );
  const financialEditingDisabled = useMemo(() => {
    if (!editingExpense || getExpenseSpaceKind(editingExpense) !== 'shared') {
      return false;
    }

    const originalAmountMinor = getExpenseAmountMinor(editingExpense);
    const originalPayments = getExpensePayments(editingExpense);
    const originalShares = getExpenseShares(editingExpense);
    const resolvedParticipantIds = new Set(
      participants.map((participant) => participant.id),
    );
    const paymentsRepresentable =
      originalPayments.length === 1 &&
      originalPayments[0]?.amountMinor === originalAmountMinor &&
      resolvedParticipantIds.has(originalPayments[0]?.participantId ?? '');
    const sharesRepresentable =
      originalShares.length > 0 &&
      originalShares.every((share) =>
        resolvedParticipantIds.has(share.participantId),
      ) &&
      allocationsMatch(
        originalShares,
        allocateEqualShares(
          originalAmountMinor,
          originalShares.map((share) => share.participantId),
        ),
      );
    return !paymentsRepresentable || !sharesRepresentable;
  }, [editingExpense, participants]);
  const financialEditingReason = financialEditingDisabled
    ? 'Custom shared allocations cannot be changed here. Other details can still be saved.'
    : undefined;
  const financialChangesRequested = useMemo(() => {
    if (!editingExpense) {
      return false;
    }
    const parsedAmount = parseDecimalToMinorUnits(
      formState.amount,
      getExpenseCurrency(editingExpense),
    );
    const amountChanged =
      parsedAmount !== null &&
      parsedAmount !== getExpenseAmountMinor(editingExpense);
    const spaceChanged =
      financialEditIntent.current.spaceTouched &&
      formState.selectedGroup?.id !== initialFinancialSelection.current.spaceId;
    const payerChanged =
      financialEditIntent.current.paymentsTouched &&
      formState.paidByParticipant?.id !==
        initialFinancialSelection.current.payerId;
    const sharesChanged =
      financialEditIntent.current.sharesTouched &&
      !participantIdsMatch(
        formState.selectedParticipants.map((participant) => participant.id),
        initialFinancialSelection.current.shareParticipantIds,
      );
    return amountChanged || spaceChanged || payerChanged || sharesChanged;
  }, [editingExpense, formState]);

  const handleSharingChange = useCallback(
    (enabled: boolean) => {
      if (sharingLocked && !enabled) {
        return;
      }
      setIsDirty(true);
      setSharingEnabled(enabled);
      updateOwnedDraftSession((session) => {
        session.isDirty = true;
        session.sharingEnabled = enabled;
      });
      if (!enabled) {
        setFormState((previous) => ({
          ...previous,
          selectedGroup: null,
          paidByParticipant: null,
          selectedParticipants: [],
        }));
      }
    },
    [setFormState, sharingLocked, updateOwnedDraftSession],
  );

  const canSubmit = useMemo(() => {
    const currency = editingExpense
      ? getExpenseCurrency(editingExpense)
      : settings.currency.toUpperCase();
    const hasRequiredValues =
      formState.title.trim().length > 0 &&
      formState.category.length > 0 &&
      parseDecimalToMinorUnits(formState.amount, currency) !== null;
    if (
      !hasRequiredValues ||
      !isDirty ||
      isSubmitting ||
      isRollbackPending ||
      hasSaveConflict ||
      (financialEditingDisabled && financialChangesRequested)
    ) {
      return false;
    }

    if (editingExpense && getExpenseSpaceKind(editingExpense) === 'shared') {
      const originalGroup = allGroups.find(
        (group) => group.id === getExpenseSpaceId(editingExpense),
      );
      if (!originalGroup || isExpenseGroupArchived(originalGroup)) {
        return false;
      }
    }

    if (!sharingEnabled) {
      return true;
    }

    if (!formState.selectedGroup) {
      return false;
    }

    const editingOriginalSharedSpace =
      editingExpense &&
      getExpenseSpaceKind(editingExpense) === 'shared' &&
      getExpenseSpaceId(editingExpense) === formState.selectedGroup.id;
    return Boolean(
      editingOriginalSharedSpace ||
      (formState.paidByParticipant &&
        formState.selectedParticipants.length > 0),
    );
  }, [
    allGroups,
    editingExpense,
    financialChangesRequested,
    financialEditingDisabled,
    formState,
    hasSaveConflict,
    isRollbackPending,
    isDirty,
    isSubmitting,
    settings.currency,
    sharingEnabled,
  ]);

  const markSaveConflict = useCallback(() => {
    queuedSubmission.current = null;
    updateOwnedDraftSession((session) => {
      session.saveConflict = true;
    });
    setHasSaveConflict(true);
    Alert.alert(
      'Save Conflict',
      'This expense changed elsewhere. Cancel and reopen it to review the latest version.',
    );
  }, [updateOwnedDraftSession]);

  // Handler for form submission (add or update)
  const handleSubmit = async () => {
    if (
      (!isDirty && !pendingSubmission.current) ||
      isRollbackPending ||
      hasSaveConflict
    ) {
      return;
    }
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

    if (sharingEnabled && !formState.selectedGroup) {
      Alert.alert(
        'Validation Error',
        'Choose a group before adding a shared expense.',
      );
      return;
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
    const isSharedExpense = editingExpense
      ? originalSpaceKind === 'shared' ||
        (sharingEnabled && spaceSelectionChanged && !!formState.selectedGroup)
      : sharingEnabled && !!formState.selectedGroup;

    if (
      editingExpense &&
      originalSpaceKind === 'shared' &&
      financialEditingDisabled &&
      (amountChanged ||
        paymentSelectionChanged ||
        shareSelectionChanged ||
        spaceSelectionChanged)
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

    const attemptToken = createUuid();
    submissionInFlightGeneration.current = contextGeneration;
    queuedSubmission.current = null;
    setIsSubmitting(true);
    updateOwnedDraftSession((session) => {
      session.activeAttemptToken = attemptToken;
    });
    let nextSubmission = preparedSubmission;
    try {
      await useUserFeatureStore.getState().ensureLocalIdentityPersisted();
      if (submissionContextGeneration.current !== contextGeneration) {
        return;
      }

      while (submissionContextGeneration.current === contextGeneration) {
        const pending = pendingSubmission.current;
        if (pending) {
          if (
            pending.serializedExpenseData ===
            nextSubmission.serializedExpenseData
          ) {
            const versionCheck = checkExpenseVersion(
              pending.expenseId,
              pending.attemptedVersion,
            );
            if (versionCheck.status === 'conflict') {
              markSaveConflict();
              return;
            }
          } else {
            const updateResult = updateExpenseIfVersion(
              {
                ...nextSubmission.expenseData,
                id: pending.expenseId,
              },
              pending.attemptedVersion,
            );
            if (updateResult.status === 'conflict') {
              markSaveConflict();
              return;
            }
            pending.serializedExpenseData =
              nextSubmission.serializedExpenseData;
            pending.attemptedVersion = updateResult.version;
            updateOwnedDraftSession((session) => {
              session.pendingSubmission = pending;
            });
          }
        } else if (isEditing && editingExpense) {
          const openingExpected = getExpenseMutationVersion(
            expenseFormDraftSessions.get(submissionContextKey)
              ?.originalExpense ?? editingExpense,
          );
          const updateResult = updateExpenseIfVersion(
            {
              ...nextSubmission.expenseData,
              id: editingExpense.id,
            },
            openingExpected,
          );
          if (updateResult.status === 'conflict') {
            markSaveConflict();
            return;
          }
          const nextPendingSubmission = {
            attemptedVersion: updateResult.version,
            expenseId: editingExpense.id,
            openingExpected,
            serializedExpenseData: nextSubmission.serializedExpenseData,
          };
          pendingSubmission.current = nextPendingSubmission;
          updateOwnedDraftSession((session) => {
            session.pendingSubmission = nextPendingSubmission;
          });
        } else {
          const expenseId = addExpenseToStore(nextSubmission.expenseData);
          const nextPendingSubmission = {
            attemptedVersion: requireExpenseMutationVersion(expenseId),
            expenseId,
            openingExpected: null,
            serializedExpenseData: nextSubmission.serializedExpenseData,
          };
          pendingSubmission.current = nextPendingSubmission;
          updateOwnedDraftSession((session) => {
            session.pendingSubmission = nextPendingSubmission;
          });
        }

        const flushedPending = pendingSubmission.current;
        if (!flushedPending) {
          throw new Error('An expense write requires a pending submission.');
        }
        await flushExpensePersistence();
        if (submissionContextGeneration.current !== contextGeneration) {
          return;
        }
        const persistedVersionCheck = checkExpenseVersion(
          flushedPending.expenseId,
          flushedPending.attemptedVersion,
        );
        if (persistedVersionCheck.status === 'conflict') {
          markSaveConflict();
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
        const completedSession =
          expenseFormDraftSessions.get(submissionContextKey);
        if (
          completedSession?.ownerToken !== ownerToken.current ||
          completedSession.activeAttemptToken !== attemptToken
        ) {
          return;
        }
        expenseFormDraftSessions.delete(submissionContextKey);
        setIsDirty(false);
        (onSaved ?? router.back)();
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
      if (
        submissionInFlightGeneration.current === contextGeneration &&
        submissionContextGeneration.current === contextGeneration
      ) {
        submissionInFlightGeneration.current = null;
        setIsSubmitting(false);
      }
      const currentSession = expenseFormDraftSessions.get(submissionContextKey);
      if (
        currentSession?.ownerToken === ownerToken.current &&
        currentSession.activeAttemptToken === attemptToken
      ) {
        currentSession.activeAttemptToken = undefined;
      }
    }
  };

  const discardChanges = async (): Promise<boolean> => {
    if (isSubmitting) {
      return false;
    }

    const session = expenseFormDraftSessions.get(submissionContextKey);
    if (!session || session.ownerToken !== ownerToken.current) {
      return true;
    }
    if (session.saveConflict) {
      expenseFormDraftSessions.delete(submissionContextKey);
      pendingSubmission.current = null;
      queuedSubmission.current = null;
      setIsDirty(false);
      setHasSaveConflict(false);
      return true;
    }
    if (!session.pendingSubmission && !session.rollbackPending) {
      expenseFormDraftSessions.delete(submissionContextKey);
      setIsDirty(false);
      setHasSaveConflict(false);
      return true;
    }

    const discardAttemptToken = createUuid();
    session.activeAttemptToken = discardAttemptToken;
    setIsSubmitting(true);
    try {
      if (!session.rollbackPending) {
        const pending = session.pendingSubmission;
        if (!pending) {
          return false;
        }
        const rollbackResult = session.originalExpense
          ? restoreExpenseSnapshot(
              cloneExpenseSnapshot(session.originalExpense),
              pending.attemptedVersion,
              pending.openingExpected,
            )
          : deleteExpenseDraftIfVersion(
              pending.expenseId,
              pending.attemptedVersion,
            );
        if (rollbackResult.status === 'conflict') {
          Alert.alert(
            'Discard Conflict',
            'This expense changed elsewhere. Review the latest version before leaving.',
          );
          return false;
        }
        session.rollbackPending = true;
        setIsRollbackPending(true);
      }

      await flushExpensePersistence();
      const currentSession = expenseFormDraftSessions.get(submissionContextKey);
      if (
        currentSession?.ownerToken !== ownerToken.current ||
        currentSession.activeAttemptToken !== discardAttemptToken
      ) {
        return false;
      }
      expenseFormDraftSessions.delete(submissionContextKey);
      pendingSubmission.current = null;
      setIsDirty(false);
      setIsRollbackPending(false);
      setHasSaveConflict(false);
      return true;
    } catch {
      if (submissionContextGeneration.current > 0) {
        Alert.alert(
          'Discard Failed',
          'The draft could not be removed from this device. Please try again.',
        );
      }
      return false;
    } finally {
      const currentSession = expenseFormDraftSessions.get(submissionContextKey);
      if (
        currentSession?.ownerToken === ownerToken.current &&
        currentSession.activeAttemptToken === discardAttemptToken
      ) {
        currentSession.activeAttemptToken = undefined;
      }
      setIsSubmitting(false);
    }
  };

  return {
    formState,
    setFormState,
    handleUpdateFormState,
    handleRemoveParticipant,
    onChangeDate,
    handleSubmit,
    discardChanges,
    handleSharingChange,
    isEditing,
    isDirty,
    hasPendingMutation,
    isRollbackPending,
    isSubmitting,
    canSubmit,
    financialEditingDisabled,
    financialEditingReason,
    sharingEnabled,
    sharingLocked,
    // Expose necessary data for modals/pickers if not handled by components
    groups,
    participants,
    categories,
  };
};
