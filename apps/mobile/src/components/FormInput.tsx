import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  KeyboardTypeOptions,
} from 'react-native';
import { semanticColors } from '../theme/semantic-colors';
import { mobileTheme } from '../theme/tokens';

interface FormInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  numberOfLines?: number;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  numberOfLines,
  ...rest
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        placeholder={placeholder}
        placeholderTextColor={semanticColors.placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...rest}
      />
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
  input: {
    borderWidth: 1,
    borderColor: semanticColors.separator,
    borderRadius: mobileTheme.radii.control,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    fontSize: 16,
    backgroundColor: semanticColors.surface,
    color: semanticColors.text,
    minHeight: 44,
  },
  multilineInput: {
    height: 100,
  },
});

export default FormInput;
