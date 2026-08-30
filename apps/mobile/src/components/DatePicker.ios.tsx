import { StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';

import { semanticColors } from '../theme/semantic-colors';
import { mobileTheme } from '../theme/tokens';
import { formatLocalDateForDisplay } from '../utils/dateFormat';
import type { DatePickerProps } from './DatePicker.types';

const DatePicker = ({
  label,
  date,
  disabled = false,
  onChange,
  containerStyle,
  labelStyle,
  testID,
}: DatePickerProps) => {
  const handleDateValueChange = (
    event: DateTimePickerChangeEvent,
    selectedDate: Date,
  ) => {
    onChange({ ...event, type: 'set' }, selectedDate);
  };

  return (
    <View
      accessibilityState={{ disabled }}
      style={[styles.container, containerStyle]}
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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: mobileTheme.spacing.lg,
    paddingRight: mobileTheme.spacing.lg,
    backgroundColor: semanticColors.groupedRow,
  },
  compactPicker: {
    minHeight: 44,
  },
  label: {
    color: semanticColors.text,
    fontSize: 16,
  },
});

export default DatePicker;
