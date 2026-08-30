import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { semanticColors } from '../theme/semantic-colors';
import { mobileTheme } from '../theme/tokens';
import { formatLocalDateForDisplay } from '../utils/dateFormat';
import type { DatePickerProps } from './DatePicker.types';

const DatePicker: React.FC<DatePickerProps> = ({
  label,
  date,
  disabled = false,
  onChange,
  containerStyle,
  labelStyle,
  valueStyle,
  testID,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (disabled) {
      setShowPicker(false);
    }
  }, [disabled]);

  const handleDateValueChange = (
    event: DateTimePickerChangeEvent,
    selectedDate: Date,
  ) => {
    setShowPicker(false);
    onChange({ ...event, type: 'set' }, selectedDate);
  };

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
            display='default'
            maximumDate={new Date()}
            mode='date'
            onDismiss={() => setShowPicker(false)}
            onValueChange={handleDateValueChange}
            testID='native-date-picker'
            value={date}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: semanticColors.groupedRow,
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
});

export default DatePicker;
