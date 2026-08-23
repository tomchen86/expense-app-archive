import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import type { ExpenseCategory, ExpenseGroup, Participant } from '../../types';

export interface BasicInfoSectionProps {
  title: string;
  amount: string;
  currency: string;
  category: ExpenseCategory;
  caption: string;
  date: Date;
  financialEditingDisabled?: boolean;
  financialEditingReason?: string;
  interactionDisabled?: boolean;
  onTitleChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onCategoryPress: () => void;
  onCaptionChange: (value: string) => void;
  onDateChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
}

export interface GroupSectionProps {
  sharingEnabled: boolean;
  sharingLocked?: boolean;
  financialControlsDisabled?: boolean;
  interactionDisabled?: boolean;
  selectedGroup: ExpenseGroup | null;
  paidByParticipant: Participant | null;
  selectedParticipants: Participant[];
  onSharingChange: (enabled: boolean) => void;
  onGroupPress: () => void;
  onPaidByPress: () => void;
  onSplitPress: () => void;
}
