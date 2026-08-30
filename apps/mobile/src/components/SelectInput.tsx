import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { semanticColors } from '../theme/semantic-colors';
import { mobileTheme } from '../theme/tokens';

interface SelectInputProps {
  label: string;
  selectedValue: string | null | undefined;
  placeholder?: string;
  onPress: () => void;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  valueStyle?: TextStyle;
  testID?: string;
}

const SelectInput: React.FC<SelectInputProps> = ({
  label,
  selectedValue,
  placeholder = 'Select...',
  onPress,
  containerStyle,
  labelStyle,
  valueStyle,
  testID,
}) => {
  const displayValue = selectedValue || placeholder;
  const isPlaceholder = !selectedValue;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <TouchableOpacity
        accessibilityLabel={`${label}, ${displayValue}`}
        accessibilityRole='button'
        onPress={onPress}
        style={styles.touchable}
        testID={testID}
      >
        <Text
          style={[
            styles.valueText,
            isPlaceholder && styles.placeholderText,
            valueStyle,
          ]}
        >
          {displayValue}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: mobileTheme.spacing.lg,
  },
  label: {
    fontSize: 16,
    marginBottom: mobileTheme.spacing.xs,
    color: semanticColors.text,
    fontWeight: '500',
  },
  touchable: {
    borderWidth: 1,
    borderColor: semanticColors.separator,
    borderRadius: mobileTheme.radii.control,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    backgroundColor: semanticColors.surface,
    minHeight: 44,
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 16,
    color: semanticColors.text,
  },
  placeholderText: {
    color: semanticColors.placeholder,
  },
});

export default SelectInput;
