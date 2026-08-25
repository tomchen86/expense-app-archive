import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { semanticColors } from '../theme/semantic-colors';
import { mobileTheme } from '../theme/tokens';
import { formatLocalDateForDisplay } from '../utils/dateFormat';

interface DatePickerProps {
  label: string;
  date: Date;
  disabled?: boolean;
  onChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  valueStyle?: TextStyle;
  testID?: string;
  // Add other DateTimePicker props if needed (e.g., minimumDate, maximumDate)
}

const DatePicker: React.FC<DatePickerProps> = ({
  label,
  date,
  disabled = false,
  onChange,
  containerStyle,
  labelStyle,
  valueStyle,
  testID,
  ...rest // Pass down other DateTimePicker props
}) => {
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (disabled) {
      setShowPicker(false);
    }
  }, [disabled]);

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    onChange(event, selectedDate);
  };

  const renderIOSConfirmationButton = () => (
    <TouchableOpacity
      accessibilityLabel='Done choosing date'
      accessibilityRole='button'
      onPress={() => setShowPicker(false)}
      style={styles.iosDoneButton}
    >
      <Text style={styles.iosDoneButtonText}>Done</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        accessibilityLabel={`${label}, ${formatLocalDateForDisplay(date)}`}
        accessibilityRole='button'
        accessibilityState={{ disabled, expanded: showPicker }}
        disabled={disabled}
        onPress={() => setShowPicker(true)}
        style={styles.touchable}
        testID={testID}
      >
        <Text style={[styles.label, labelStyle]}>{label}</Text>
        <View style={styles.valueContainer}>
          <Text style={[styles.valueText, valueStyle]}>
            {formatLocalDateForDisplay(date)}
          </Text>
          <Text accessibilityElementsHidden style={styles.chevron}>
            ›
          </Text>
        </View>
      </TouchableOpacity>

      {showPicker && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={new Date()}
            mode='date'
            onChange={handleDateChange}
            testID='native-date-picker'
            value={date}
            {...rest}
          />
          {Platform.OS === 'ios' && renderIOSConfirmationButton()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: semanticColors.surface,
  },
  touchable: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  label: {
    color: semanticColors.text,
    fontSize: 16,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: mobileTheme.spacing.lg,
  },
  valueText: {
    fontSize: 16,
    color: semanticColors.textMuted,
  },
  chevron: {
    color: semanticColors.textMuted,
    fontSize: 24,
    marginLeft: mobileTheme.spacing.sm,
  },
  pickerContainer: {
    borderTopColor: semanticColors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: mobileTheme.spacing.md,
  },
  iosDoneButton: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing.lg,
  },
  iosDoneButtonText: {
    color: semanticColors.primary,
    fontWeight: '700',
  },
});

export default DatePicker;
