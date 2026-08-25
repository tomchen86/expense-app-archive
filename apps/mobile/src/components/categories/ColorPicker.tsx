import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { CATEGORY_COLOR_OPTIONS } from '../../theme/category-palette';
import { semanticColors } from '../../theme/semantic-colors';

export const DEFAULT_COLORS = CATEGORY_COLOR_OPTIONS;

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  colors?: readonly string[];
  label?: string | null;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorSelect,
  colors = DEFAULT_COLORS,
  label = 'Select Color:',
}) => {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.colorGrid}>
        {colors.map((color) => (
          <TouchableOpacity
            key={color}
            accessibilityLabel={`Select color ${color}`}
            accessibilityRole='button'
            accessibilityState={{ selected: selectedColor === color }}
            hitSlop={2}
            onPress={() => onColorSelect(color)}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              selectedColor === color && styles.selectedColorOption,
            ]}
          />
        ))}
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
});

export default ColorPicker;
