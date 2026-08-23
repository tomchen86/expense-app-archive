import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { useExpenseStore } from '../../src/store/expenseStore';
import { ScreenHeading } from '../../src/components/ui/screen-heading';
import { mobileTheme } from '../../src/theme/tokens';

const SettingsScreen = () => {
  const { userSettings, updateUserSettings } = useExpenseStore();
  const [name, setName] = useState(userSettings?.name ?? '');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    updateUserSettings({ name: name.trim() });
    Alert.alert('Success', 'Settings saved successfully');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps='handled'
        testID='settings-scroll-view'
      >
        <ScreenHeading
          title='Settings'
          subtitle='Personalise your expense space.'
        />

        <View style={styles.card}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            accessibilityLabel='Your name'
            autoCapitalize='words'
            onSubmitEditing={handleSave}
            placeholder='Enter your name'
            placeholderTextColor={mobileTheme.colors.textMuted}
            returnKeyType='done'
            style={styles.input}
            value={name}
            onChangeText={setName}
          />

          <TouchableOpacity
            accessibilityRole='button'
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole='button'
            style={[styles.saveButton, styles.manageCategoriesButton]}
            onPress={() => router.push('/manage-categories')}
          >
            <Text style={styles.manageCategoriesButtonText}>
              Manage Categories
            </Text>
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
});

export default SettingsScreen;
