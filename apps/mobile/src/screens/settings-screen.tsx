import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { useExpenseStore } from '../store/expenseStore';
import { mobileTheme } from '../theme/tokens';
import { isExpenseGroupArchived } from '../utils/groupDomain';

const SettingsScreen = () => {
  const { groups, userSettings, updateUserSettings } = useExpenseStore();
  const [name, setName] = useState(userSettings?.name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const archivedGroupCount = useMemo(
    () => groups.filter(isExpenseGroupArchived).length,
    [groups],
  );

  const handleSave = async () => {
    if (isSavingRef.current) {
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const didSave = await updateUserSettings({ name: name.trim() });
      if (!didSave) {
        Alert.alert(
          'Unable to Save Settings',
          'Your profile changed before it could be saved. Please try again.',
        );
        return;
      }
      Alert.alert('Success', 'Settings saved successfully');
    } catch {
      Alert.alert(
        'Unable to Save Settings',
        'Your settings could not be saved. Please try again.',
      );
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior='automatic'
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps='handled'
        testID='settings-scroll-view'
      >
        <View style={styles.card}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            accessibilityLabel='Your name'
            autoCapitalize='words'
            editable={!isSaving}
            onSubmitEditing={() => void handleSave()}
            placeholder='Enter your name'
            placeholderTextColor={mobileTheme.colors.textMuted}
            returnKeyType='done'
            style={styles.input}
            testID='username-input'
            value={name}
            onChangeText={setName}
          />

          <TouchableOpacity
            accessibilityRole='button'
            accessibilityLabel='Save settings'
            accessibilityState={{ busy: isSaving, disabled: isSaving }}
            disabled={isSaving}
            style={styles.saveButton}
            onPress={() => void handleSave()}
            testID='save-settings-button'
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole='button'
            style={[styles.saveButton, styles.manageCategoriesButton]}
            onPress={() => router.push('/settings/manage-categories' as Href)}
          >
            <Text style={styles.manageCategoriesButtonText}>
              Manage Categories
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityHint='Opens groups hidden from the active Groups tab'
            accessibilityLabel={`Archived groups, ${archivedGroupCount}`}
            accessibilityRole='button'
            onPress={() => router.push('/settings/archived-groups' as Href)}
            style={styles.settingsRow}
            testID='archived-groups-row'
          >
            <Text style={styles.settingsRowLabel}>Archived Groups</Text>
            <View style={styles.settingsRowAccessory}>
              <Text style={styles.settingsRowCount}>{archivedGroupCount}</Text>
              <Text accessibilityElementsHidden style={styles.chevron}>
                ›
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: mobileTheme.spacing.md,
    paddingBottom: mobileTheme.spacing.xxxl,
    backgroundColor: mobileTheme.colors.background,
  },
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radii.card,
    borderWidth: 1,
    padding: mobileTheme.spacing.xl,
    ...mobileTheme.shadows.card,
  },
  label: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: mobileTheme.spacing.sm,
  },
  input: {
    minHeight: 48,
    color: mobileTheme.colors.text,
    backgroundColor: mobileTheme.colors.surfaceElevated,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
    borderRadius: mobileTheme.radii.control,
    paddingHorizontal: mobileTheme.spacing.lg,
    marginBottom: mobileTheme.spacing.xl,
  },
  saveButton: {
    backgroundColor: mobileTheme.colors.primary,
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radii.control,
    alignItems: 'center',
  },
  manageCategoriesButton: {
    marginTop: mobileTheme.spacing.md,
    backgroundColor: mobileTheme.colors.primaryContainer,
  },
  saveButtonText: {
    color: mobileTheme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  manageCategoriesButtonText: {
    color: mobileTheme.colors.onPrimaryContainer,
    fontSize: 16,
    fontWeight: '600',
  },
  settingsRow: {
    minHeight: 52,
    marginTop: mobileTheme.spacing.md,
    paddingHorizontal: mobileTheme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: mobileTheme.radii.control,
    backgroundColor: mobileTheme.colors.surfaceVariant,
  },
  settingsRowLabel: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  settingsRowAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsRowCount: {
    color: mobileTheme.colors.textMuted,
    fontSize: 15,
  },
  chevron: {
    marginLeft: mobileTheme.spacing.sm,
    color: mobileTheme.colors.textMuted,
    fontSize: 24,
  },
});

export default SettingsScreen;
