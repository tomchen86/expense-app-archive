import React, { useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';

import { AdaptiveSheetSection } from '../src/components/ui/adaptive-sheet-section';
import { useExpenseStore } from '../src/store/expenseStore';
import { semanticColors } from '../src/theme/semantic-colors';
import { mobileTheme } from '../src/theme/tokens';

const closeNewGroupRoute = () => {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/history');
};

const NewGroupScreen = () => {
  const addGroup = useExpenseStore((state) => state.addGroup);
  const [groupName, setGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const trimmedGroupName = groupName.trim();
  const canSubmit = trimmedGroupName.length > 0 && !isSubmitting;

  const finishSubmitting = () => {
    isSubmittingRef.current = false;
    setIsSubmitting(false);
  };

  const handleCreate = async () => {
    if (isSubmittingRef.current || !trimmedGroupName) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await addGroup(trimmedGroupName);
      finishSubmitting();
      closeNewGroupRoute();
    } catch {
      finishSubmitting();
      Alert.alert(
        'Unable to Create Group',
        'Your group could not be saved. Please try again.',
      );
    }
  };

  return (
    <View collapsable={false} style={styles.screen} testID='new-group-screen'>
      <Stack.Screen
        options={{
          contentStyle: { backgroundColor: semanticColors.sheetBackground },
          gestureEnabled: !isSubmitting,
          title: 'New Group',
        }}
      />
      <Stack.Toolbar placement='left'>
        <Stack.Toolbar.Button
          accessibilityLabel='Cancel'
          disabled={isSubmitting}
          onPress={closeNewGroupRoute}
          variant='plain'
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement='right'>
        <Stack.Toolbar.Button
          accessibilityLabel='Create'
          disabled={!canSubmit}
          onPress={() => void handleCreate()}
          variant='prominent'
        >
          Create
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <ScrollView
        automaticallyAdjustKeyboardInsets={false}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior='automatic'
        keyboardShouldPersistTaps='handled'
        testID='new-group-content'
      >
        <Text accessibilityRole='header' style={styles.sectionLabel}>
          GROUP DETAILS
        </Text>
        <AdaptiveSheetSection style={styles.section}>
          <View style={styles.nameRow}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              accessibilityLabel='Group name'
              autoCapitalize='words'
              autoCorrect={false}
              autoFocus
              editable={!isSubmitting}
              onChangeText={setGroupName}
              onSubmitEditing={() => void handleCreate()}
              placeholder='Group name'
              placeholderTextColor={semanticColors.placeholder}
              returnKeyType='done'
              style={styles.input}
              testID='group-name-input'
              value={groupName}
            />
          </View>
        </AdaptiveSheetSection>
        <Text style={styles.helperText}>
          Members can be added after the group is created.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: semanticColors.sheetBackground,
  },
  content: {
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: mobileTheme.spacing.lg,
    paddingBottom: mobileTheme.spacing.xxl,
  },
  sectionLabel: {
    marginBottom: mobileTheme.spacing.sm,
    marginHorizontal: mobileTheme.spacing.lg,
    color: semanticColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  section: {
    minHeight: 54,
  },
  nameRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  label: {
    color: semanticColors.text,
    fontSize: 17,
  },
  input: {
    minHeight: 44,
    flex: 1,
    marginLeft: mobileTheme.spacing.lg,
    color: semanticColors.text,
    fontSize: 17,
    textAlign: 'right',
  },
  helperText: {
    marginTop: mobileTheme.spacing.sm,
    marginHorizontal: mobileTheme.spacing.lg,
    color: semanticColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default NewGroupScreen;
