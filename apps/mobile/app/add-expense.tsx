import React from 'react';
import { Alert, View, StyleSheet, ScrollView } from 'react-native';
import {
  router,
  Stack,
  useLocalSearchParams,
  useNavigation,
} from 'expo-router';
import { useExpenseForm } from '../src/hooks/useExpenseForm';
import { useExpenseModals } from '../src/hooks/useExpenseModals';
import { useExpenseStore } from '../src/store/expenseStore';
import {
  resolveEditingExpense,
  resolveSingleRouteParam,
} from '../src/navigation/expense-edit-route';
import type { RouteParam } from '../src/navigation/expense-edit-route';
import { BasicInfoSection } from '../src/components/ExpenseForm/BasicInfoSection';
import { GroupSection } from '../src/components/ExpenseForm/GroupSection';
import { ExpenseModals } from '../src/components/ExpenseForm/ExpenseModals';
import { ExpenseFormHeaderActions } from '../src/components/ExpenseForm/expense-form-header-actions';
import { getExpenseCurrency } from '../src/utils/expenseDomain';
import { mobileTheme } from '../src/theme/tokens';
import { createUuid } from '../src/utils/ids';

const AddExpenseScreen = () => {
  const params = useLocalSearchParams<{
    expenseId?: RouteParam;
    draftSessionId?: RouteParam;
    groupId?: RouteParam;
  }>();
  const fallbackDraftSessionId = React.useRef(createUuid());
  const routeExpenseId = resolveSingleRouteParam(params.expenseId);
  const draftSessionId =
    resolveSingleRouteParam(params.draftSessionId) ??
    (routeExpenseId
      ? `edit:${routeExpenseId}:${fallbackDraftSessionId.current}`
      : fallbackDraftSessionId.current);
  const initialSpaceId = resolveSingleRouteParam(params.groupId);
  const editingExpense = useExpenseStore((state) =>
    resolveEditingExpense(state.expenses, params.expenseId),
  );
  const defaultCurrency = useExpenseStore((state) => state.settings.currency);
  const navigation = useNavigation();
  const allowNextRemoval = React.useRef(false);
  const handleSaved = React.useCallback(() => {
    allowNextRemoval.current = true;
    router.back();
  }, []);

  const {
    formState,
    setFormState,
    handleUpdateFormState,
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
    groups,
    participants,
    sharingEnabled,
    sharingLocked,
  } = useExpenseForm({
    draftSessionId,
    editingExpense,
    initialSpaceId,
    onSaved: handleSaved,
  });

  const {
    showCategoryModal,
    setShowCategoryModal,
    showGroupModal,
    setShowGroupModal,
    showPaidByModal,
    setShowPaidByModal,
    showSplitModal,
    setShowSplitModal,
    availableParticipants,
    categoryModalData,
    handleCategorySelect,
    handleGroupSelect,
    handleGroupClear,
    handleParticipantSelect,
    ADD_NEW_CATEGORY_ACTION,
  } = useExpenseModals({
    formState,
    participants,
    handleUpdateFormState,
    setFormState,
  });

  const currency = editingExpense
    ? getExpenseCurrency(editingExpense)
    : defaultCurrency.toUpperCase();
  const interactionDisabled = isSubmitting || isRollbackPending;
  const hasUnsavedWork = isDirty || hasPendingMutation;

  const confirmDiscard = React.useCallback(
    (removeRoute: () => void) => {
      if (isSubmitting) {
        return;
      }
      if (!hasUnsavedWork) {
        void discardChanges();
        allowNextRemoval.current = true;
        removeRoute();
        return;
      }
      Alert.alert('Discard Changes?', 'Your changes will not be saved.', [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            void discardChanges().then((discarded) => {
              if (discarded) {
                allowNextRemoval.current = true;
                removeRoute();
              }
            });
          },
        },
      ]);
    },
    [discardChanges, hasUnsavedWork, isSubmitting],
  );

  React.useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (allowNextRemoval.current) {
          return;
        }
        if (isSubmitting) {
          event.preventDefault();
          return;
        }
        if (!hasUnsavedWork) {
          void discardChanges();
          return;
        }
        event.preventDefault();
        confirmDiscard(() => navigation.dispatch(event.data.action));
      }),
    [confirmDiscard, discardChanges, hasUnsavedWork, isSubmitting, navigation],
  );

  const handleSharingToggle = (enabled: boolean) => {
    handleSharingChange(enabled);
    if (enabled) {
      setShowGroupModal(true);
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          gestureEnabled: !hasUnsavedWork && !isSubmitting,
          headerBackVisible: false,
          title: isEditing ? 'Edit Expense' : 'New Expense',
        }}
      />
      <ExpenseFormHeaderActions
        canSubmit={canSubmit}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onCancel={() => confirmDiscard(() => router.back())}
        onSubmit={handleSubmit}
      />

      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior='automatic'
        contentContainerStyle={styles.content}
        keyboardDismissMode='on-drag'
        keyboardShouldPersistTaps='handled'
        testID='expense-form-scroll-view'
      >
        <BasicInfoSection
          title={formState.title}
          amount={formState.amount}
          currency={currency}
          category={formState.category}
          caption={formState.caption}
          date={formState.date}
          financialEditingDisabled={financialEditingDisabled}
          financialEditingReason={financialEditingReason}
          interactionDisabled={interactionDisabled}
          onTitleChange={(value) => handleUpdateFormState('title', value)}
          onAmountChange={(value) => handleUpdateFormState('amount', value)}
          onCategoryPress={() => setShowCategoryModal(true)}
          onCaptionChange={(value) => handleUpdateFormState('caption', value)}
          onDateChange={onChangeDate}
        />

        <GroupSection
          sharingEnabled={sharingEnabled}
          sharingLocked={sharingLocked}
          financialControlsDisabled={financialEditingDisabled}
          interactionDisabled={interactionDisabled}
          selectedGroup={formState.selectedGroup}
          paidByParticipant={formState.paidByParticipant}
          selectedParticipants={formState.selectedParticipants}
          onSharingChange={handleSharingToggle}
          onGroupPress={() => setShowGroupModal(true)}
          onPaidByPress={() => setShowPaidByModal(true)}
          onSplitPress={() => setShowSplitModal(true)}
        />
      </ScrollView>

      <ExpenseModals
        showCategoryModal={showCategoryModal && !interactionDisabled}
        showGroupModal={showGroupModal && !interactionDisabled}
        showPaidByModal={showPaidByModal && !interactionDisabled}
        showSplitModal={showSplitModal && !interactionDisabled}
        categoryModalData={categoryModalData}
        groups={groups}
        availableParticipants={availableParticipants}
        selectedCategory={formState.category}
        selectedGroup={formState.selectedGroup}
        selectedPaidBy={formState.paidByParticipant}
        selectedParticipants={formState.selectedParticipants}
        onCategorySelect={handleCategorySelect}
        onGroupSelect={handleGroupSelect}
        onGroupClear={handleGroupClear}
        onPaidBySelect={(item) =>
          handleUpdateFormState('paidByParticipant', item)
        }
        onParticipantToggle={handleParticipantSelect}
        onCloseCategoryModal={() => setShowCategoryModal(false)}
        onCloseGroupModal={() => setShowGroupModal(false)}
        onClosePaidByModal={() => setShowPaidByModal(false)}
        onCloseSplitModal={() => setShowSplitModal(false)}
        ADD_NEW_CATEGORY_ACTION={ADD_NEW_CATEGORY_ACTION}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  content: {
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingBottom: mobileTheme.spacing.xxxl,
  },
});

export default AddExpenseScreen;
