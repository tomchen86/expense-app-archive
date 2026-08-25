import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import {
  CATEGORY_COLOR_OPTIONS,
  normalizeCategoryColor,
} from '../../theme/category-palette';
import { semanticColors } from '../../theme/semantic-colors';

export const DEFAULT_COLORS = CATEGORY_COLOR_OPTIONS;

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  colors?: readonly string[];
  label?: string | null;
  unavailableColors?: readonly string[];
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorSelect,
  colors = DEFAULT_COLORS,
  label = 'Select Color:',
  unavailableColors = [],
}) => {
  const normalizedUnavailableColors = new Set(
    unavailableColors.map(normalizeCategoryColor),
  );

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.colorGrid}>
        {colors.map((color) => {
          const unavailable = normalizedUnavailableColors.has(
            normalizeCategoryColor(color),
          );
          const selected =
            normalizeCategoryColor(selectedColor) ===
            normalizeCategoryColor(color);

          return (
            <TouchableOpacity
              key={color}
              accessibilityLabel={
                unavailable
                  ? `Color ${color} already in use`
                  : `Select color ${color}`
              }
              accessibilityRole='button'
              accessibilityState={{ disabled: unavailable, selected }}
              disabled={unavailable}
              hitSlop={2}
              onPress={() => {
                if (!unavailable) {
                  onColorSelect(color);
                }
              }}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                unavailable && styles.unavailableColorOption,
                selected && styles.selectedColorOption,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: semanticColors.text,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: semanticColors.primary,
    borderWidth: 3,
  },
  unavailableColorOption: {
    opacity: 0.22,
  },
});

export default ColorPicker;
