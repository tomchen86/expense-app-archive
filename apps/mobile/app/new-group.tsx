import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';

import { AdaptiveGroupedSection } from '../src/components/ui/adaptive-grouped-list';
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
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          contentStyle: { backgroundColor: semanticColors.background },
          gestureEnabled: !isSubmitting,
          title: 'New Group',
        }}
      />
      <Stack.Toolbar placement='left'>
        <Stack.Toolbar.Button
          accessibilityLabel='Cancel'
          disabled={isSubmitting}
          onPress={closeNewGroupRoute}
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement='right'>
        <Stack.Toolbar.Button
          accessibilityLabel='Create'
          disabled={!canSubmit}
          onPress={() => void handleCreate()}
        >
          Create
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <View style={styles.content}>
        <Text accessibilityRole='header' style={styles.sectionLabel}>
          GROUP DETAILS
        </Text>
        <AdaptiveGroupedSection style={styles.section}>
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
        </AdaptiveGroupedSection>
        <Text style={styles.helperText}>
          Members can be added after the group is created.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors.background,
  },
  content: {
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: 72,
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
