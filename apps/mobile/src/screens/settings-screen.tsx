import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, type Href } from 'expo-router';

import { AdaptiveGroupedSection } from '../components/ui/adaptive-grouped-list';
import { useExpenseStore } from '../store/expenseStore';
import { semanticColors } from '../theme/semantic-colors';
import { mobileTheme } from '../theme/tokens';
import { isExpenseGroupArchived } from '../utils/groupDomain';

const SettingsScreen = () => {
  const { groups, settings, updateSettings, userSettings, updateUserSettings } =
    useExpenseStore();
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
        <Text style={styles.sectionLabel}>PROFILE</Text>
        <AdaptiveGroupedSection testID='settings-profile-section'>
          <View style={styles.profileRow}>
            <Text style={styles.rowLabel}>Your Name</Text>
            <TextInput
              accessibilityLabel='Your name'
              autoCapitalize='words'
              editable={!isSaving}
              onChangeText={setName}
              onSubmitEditing={() => void handleSave()}
              placeholder='Enter your name'
              placeholderTextColor={semanticColors.placeholder}
              returnKeyType='done'
              style={styles.input}
              testID='username-input'
              value={name}
            />
          </View>
        </AdaptiveGroupedSection>
        <Text style={styles.footerText}>
          Used to identify you in shared expenses and balances.
        </Text>

        <Text style={[styles.sectionLabel, styles.spacedSectionLabel]}>
          APPEARANCE
        </Text>
        <AdaptiveGroupedSection testID='settings-appearance-section'>
          <View style={styles.settingsRow}>
            <Text style={styles.rowLabel}>Dark Mode</Text>
            <Switch
              accessibilityLabel='Dark mode'
              accessibilityRole='switch'
              onValueChange={(enabled) =>
                updateSettings({ theme: enabled ? 'dark' : 'light' })
              }
              trackColor={{
                false: semanticColors.fill,
                true: semanticColors.primary,
              }}
              style={styles.switchControl}
              testID='dark-mode-switch'
              value={settings.theme === 'dark'}
            />
          </View>
        </AdaptiveGroupedSection>

        <Text style={[styles.sectionLabel, styles.spacedSectionLabel]}>
          APP
        </Text>
        <AdaptiveGroupedSection testID='settings-app-section'>
          <TouchableOpacity
            accessibilityHint='Opens category names and chart colors'
            accessibilityLabel='Manage categories'
            accessibilityRole='button'
            onPress={() => router.push('/settings/manage-categories' as Href)}
            style={styles.settingsRow}
          >
            <Text style={styles.rowLabel}>Manage Categories</Text>
            <Text accessibilityElementsHidden style={styles.chevron}>
              ›
            </Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            accessibilityHint='Opens groups hidden from the active Groups tab'
            accessibilityLabel={`Archived groups, ${archivedGroupCount}`}
            accessibilityRole='button'
            onPress={() => router.push('/settings/archived-groups' as Href)}
            style={styles.settingsRow}
            testID='archived-groups-row'
          >
            <Text style={styles.rowLabel}>Archived Groups</Text>
            <View style={styles.settingsRowAccessory}>
              <Text style={styles.settingsRowCount}>{archivedGroupCount}</Text>
              <Text accessibilityElementsHidden style={styles.chevron}>
                ›
              </Text>
            </View>
          </TouchableOpacity>
        </AdaptiveGroupedSection>
      </ScrollView>

      <Stack.Toolbar placement='right'>
        <Stack.Toolbar.Button
          accessibilityLabel='Save settings'
          disabled={isSaving}
          onPress={() => void handleSave()}
          variant='done'
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: semanticColors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: mobileTheme.spacing.xl,
    paddingTop: mobileTheme.spacing.lg,
    paddingBottom: mobileTheme.spacing.xxxl,
    backgroundColor: semanticColors.background,
  },
  sectionLabel: {
    marginBottom: mobileTheme.spacing.sm,
    marginLeft: mobileTheme.spacing.lg,
    color: semanticColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  spacedSectionLabel: {
    marginTop: mobileTheme.spacing.xxl,
  },
  profileRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
    backgroundColor: semanticColors.surface,
  },
  input: {
    flex: 1,
    minHeight: 48,
    marginLeft: mobileTheme.spacing.lg,
    paddingVertical: 0,
    color: semanticColors.text,
    fontSize: 16,
    textAlign: 'right',
  },
  settingsRow: {
    minHeight: 52,
    paddingHorizontal: mobileTheme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: semanticColors.surface,
  },
  switchControl: {
    alignSelf: 'center',
  },
  rowLabel: {
    color: semanticColors.text,
    fontSize: 16,
  },
  settingsRowAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsRowCount: {
    color: semanticColors.textMuted,
    fontSize: 15,
  },
  chevron: {
    marginLeft: mobileTheme.spacing.sm,
    color: semanticColors.textMuted,
    fontSize: 22,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: mobileTheme.spacing.lg,
    backgroundColor: semanticColors.separator,
  },
  footerText: {
    marginHorizontal: mobileTheme.spacing.md,
    marginTop: mobileTheme.spacing.sm,
    color: semanticColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default SettingsScreen;
