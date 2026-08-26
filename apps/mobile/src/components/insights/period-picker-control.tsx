import React from 'react';

import type { PeriodPickerControlProps } from './period-picker-control.types';
import PeriodPickerTrigger from './period-picker-trigger';

const PeriodPickerControl = ({
  displayPeriodText,
  onOpen,
}: PeriodPickerControlProps) => (
  <PeriodPickerTrigger displayPeriodText={displayPeriodText} onOpen={onOpen} />
);

export default PeriodPickerControl;
