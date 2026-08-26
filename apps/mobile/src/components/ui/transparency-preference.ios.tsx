import React from 'react';
import { AccessibilityInfo } from 'react-native';

interface TransparencyPreferenceProviderProps {
  children: React.ReactNode;
  reduceTransparency: boolean;
}

const TransparencyPreferenceContext = React.createContext(false);

export const TransparencyPreferenceProvider = ({
  children,
  reduceTransparency,
}: TransparencyPreferenceProviderProps) => (
  <TransparencyPreferenceContext.Provider value={reduceTransparency}>
    {children}
  </TransparencyPreferenceContext.Provider>
);

export const useReduceTransparencyPreference = () =>
  React.useContext(TransparencyPreferenceContext);

export const useResolvedTransparencyPreference = () => {
  const [reduceTransparency, setReduceTransparency] = React.useState<
    boolean | null
  >(null);

  React.useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((isEnabled) => {
        if (isMounted) {
          setReduceTransparency(isEnabled);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReduceTransparency(true);
        }
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return reduceTransparency;
};
