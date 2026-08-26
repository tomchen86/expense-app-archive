import React from 'react';

interface TransparencyPreferenceProviderProps {
  children: React.ReactNode;
  reduceTransparency: boolean;
}

export const TransparencyPreferenceProvider = ({
  children,
}: TransparencyPreferenceProviderProps) => <>{children}</>;

export const useReduceTransparencyPreference = () => false;

export const useResolvedTransparencyPreference = () => false;
