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
  DateTimePickerChangeEvent,
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

  const handleDateValueChange = (
    event: DateTimePickerChangeEvent,
    selectedDate: Date,
  ) => {
    setShowPicker(false);
    onChange({ ...event, type: 'set' }, selectedDate);
  };

  if (Platform.OS === 'ios') {
    return (
      <View
        accessibilityState={{ disabled }}
        style={[styles.container, styles.compactRow, containerStyle]}
        testID={testID}
      >
        <Text style={[styles.label, labelStyle]}>{label}</Text>
        <DateTimePicker
          accessibilityLabel={`${label}, ${formatLocalDateForDisplay(date)}`}
          disabled={disabled}
          display='compact'
          maximumDate={new Date()}
          mode='date'
          onValueChange={handleDateValueChange}
          style={styles.compactPicker}
          testID='native-date-picker'
          value={date}
          {...rest}
        />
      </View>
    );
  }

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
            {...rest}
          />
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
  compactRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: mobileTheme.spacing.lg,
    paddingRight: mobileTheme.spacing.lg,
  },
  compactPicker: {
    minHeight: 44,
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
