import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { semanticColors } from '../theme/semantic-colors';
import { mobileTheme } from '../theme/tokens';
import { AdaptiveGroupedSection } from './ui/adaptive-grouped-list';
import { AdaptiveSheet } from './ui/adaptive-sheet';

interface SelectionModalProps<T> {
  visible: boolean;
  title: string;
  data: T[];
  renderItemContent: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onSelect: (item: T) => void;
  onClose: () => void;
  isSelected: (item: T) => boolean;
  multiSelect?: boolean;
  onClearSelection?: () => void;
}

function SelectionModal<T>({
  visible,
  title,
  data,
  renderItemContent,
  keyExtractor,
  onSelect,
  onClose,
  isSelected,
  multiSelect = false,
  onClearSelection,
}: SelectionModalProps<T>) {
  const handleItemPress = (item: T) => {
    onSelect(item);
    if (!multiSelect) {
      onClose();
    }
  };

  const compactRowCount = data.length + (onClearSelection ? 1 : 0);
  const sheetSizing =
    !multiSelect && compactRowCount <= 5 ? 'content' : 'resizable';

  return (
    <AdaptiveSheet
      leadingAction={
        multiSelect ? undefined : { label: 'Cancel', onPress: onClose }
      }
      onClose={onClose}
      sizing={sheetSizing}
      testID='selection-modal-content'
      title={title}
      trailingAction={
        multiSelect ? { label: 'Done', onPress: onClose } : undefined
      }
      visible={visible}
    >
      <View
        style={[
          styles.content,
          sheetSizing === 'resizable' && styles.resizableContent,
        ]}
      >
        <AdaptiveGroupedSection style={styles.listSection}>
          <FlatList
            data={data}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyExtractor={keyExtractor}
            keyboardShouldPersistTaps='handled'
            renderItem={({ item }) => {
              const selected = isSelected(item);
              return (
                <TouchableOpacity
                  accessibilityRole='button'
                  accessibilityState={{ selected }}
                  onPress={() => handleItemPress(item)}
                  style={[styles.item, selected && styles.selectedItem]}
                >
                  <View style={styles.itemContent}>
                    {renderItemContent(item)}
                  </View>
                  {selected ? (
                    <Text
                      accessibilityElementsHidden
                      importantForAccessibility='no-hide-descendants'
                      style={styles.checkmark}
                    >
                      ✓
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            }}
            style={styles.list}
          />
        </AdaptiveGroupedSection>

        {onClearSelection ? (
          <AdaptiveGroupedSection style={styles.clearSection}>
            <TouchableOpacity
              accessibilityLabel='Clear selection'
              accessibilityRole='button'
              onPress={onClearSelection}
              style={styles.clearRow}
            >
              <Text style={styles.clearText}>Clear Selection</Text>
            </TouchableOpacity>
          </AdaptiveGroupedSection>
        ) : null}
      </View>
    </AdaptiveSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingTop: mobileTheme.spacing.xl,
    paddingBottom: mobileTheme.spacing.xl,
  },
  resizableContent: {
    flex: 1,
  },
  listSection: {
    flexShrink: 1,
  },
  list: {
    flexGrow: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: mobileTheme.spacing.lg,
    backgroundColor: semanticColors.separator,
  },
  item: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
    backgroundColor: semanticColors.surface,
  },
  itemContent: {
    flex: 1,
  },
  selectedItem: {
    backgroundColor: semanticColors.fill,
  },
  checkmark: {
    marginLeft: mobileTheme.spacing.md,
    color: semanticColors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  clearSection: {
    marginTop: mobileTheme.spacing.xl,
  },
  clearRow: {
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  clearText: {
    color: semanticColors.primary,
    fontSize: 16,
  },
});

export default SelectionModal;
