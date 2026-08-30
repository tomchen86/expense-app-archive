/// <reference types="jest" />
import React, { type ReactNode } from 'react';

export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
  dismiss: jest.fn(),
};

export const useRouter = () => router;
export const useLocalSearchParams = jest.fn(() => ({}));
export const useGlobalSearchParams = jest.fn(() => ({}));
export const usePathname = jest.fn(() => '/');
export const useSegments = jest.fn(() => []);
export const useNavigationContainerRef = jest.fn();
export const useNavigation = jest.fn(() => ({
  addListener: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
}));

export const Stack = {
  Screen: jest.fn(({ children }: { children?: ReactNode }) => children || null),
  Toolbar: Object.assign(
    ({ children }: { children?: ReactNode }) => children || null,
    {
      Button: ({ children, ...props }: any) =>
        React.createElement(
          'View',
          {
            accessible: true,
            accessibilityRole: 'button',
            accessibilityState: { disabled: Boolean(props.disabled) },
            ...props,
          },
          children,
        ),
      Menu: ({ children, ...props }: any) =>
        React.createElement('View', props, children),
      MenuAction: ({ children, ...props }: any) =>
        React.createElement(
          'View',
          {
            accessible: true,
            accessibilityLabel:
              typeof children === 'string' ? children : undefined,
            accessibilityRole: 'button',
            ...props,
            accessibilityState: {
              ...props.accessibilityState,
              disabled: Boolean(props.disabled),
            },
          },
          children,
        ),
    },
  ),
};

export const Tabs = {
  Screen: ({ children }: { children?: ReactNode }) => children || null,
};

export const Link = ({ children }: { children?: ReactNode }) =>
  children || null;

export const Redirect = () => null;
export const Slot = ({ children }: { children?: ReactNode }) =>
  children || null;

export default {
  router,
  useRouter,
  useLocalSearchParams,
  useGlobalSearchParams,
  usePathname,
  useSegments,
  useNavigationContainerRef,
  useNavigation,
  Stack,
  Tabs,
  Link,
  Redirect,
  Slot,
};
