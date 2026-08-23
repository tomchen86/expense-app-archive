import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';

import InsightsChartMenu from '../insights/insights-chart-menu.ios';
import InsightsChartMenuFallback from '../insights/insights-chart-menu-fallback';

const mockAlert = jest.fn();

jest.mock('react-native', () => ({
  Alert: { alert: mockAlert },
  StyleSheet: {
    flatten: (style: unknown) => style,
  },
}));

describe('InsightsChartMenu iOS adapter', () => {
  beforeEach(() => {
    (Alert as unknown as { alert: jest.Mock }).alert = mockAlert;
    mockAlert.mockClear();
  });

  it('uses a chart toolbar icon and marks the persisted selection', () => {
    const onChange = jest.fn();
    const screen = render(
      <InsightsChartMenu onChange={onChange} preference='donut' />,
    );

    const menu = screen.getByLabelText('Chart visualization');
    expect(menu.props.icon).toBe('chart.bar.xaxis');
    expect(screen.getByRole('button', { name: 'Auto' }).props.isOn).toBe(false);
    expect(screen.getByRole('button', { name: 'Donut' }).props.isOn).toBe(true);
    expect(screen.getByRole('button', { name: 'Bar' }).props.isOn).toBe(false);

    fireEvent.press(screen.getByRole('button', { name: 'Bar' }));
    expect(onChange).toHaveBeenCalledWith('bar');
  });

  it('keeps an accessible native-alert fallback behind the platform adapter', () => {
    const onChange = jest.fn();
    const screen = render(
      <InsightsChartMenuFallback onChange={onChange} preference='auto' />,
    );

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Chart visualization, auto selected',
      }),
    );

    expect(mockAlert).toHaveBeenCalledWith(
      'Chart visualization',
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ text: 'Auto, selected' }),
        expect.objectContaining({ text: 'Donut' }),
        expect.objectContaining({ text: 'Bar' }),
      ]),
    );
    const actions = mockAlert.mock.calls[0][2];
    actions.find((action: { text: string }) => action.text === 'Bar').onPress();
    expect(onChange).toHaveBeenCalledWith('bar');
  });
});
