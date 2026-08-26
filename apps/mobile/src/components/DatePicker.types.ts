import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { TextStyle, ViewStyle } from 'react-native';

export interface DatePickerProps {
  label: string;
  date: Date;
  disabled?: boolean;
  onChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  valueStyle?: TextStyle;
  testID?: string;
}
