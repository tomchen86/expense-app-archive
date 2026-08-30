const normalize = (value: number) => Math.max(0, value);

export interface FloatingActionOffsetContext {
  nativeTabsContentInsetApplied?: boolean;
}

const addInsetAndGap = (bottomInset: number, visualGap: number) =>
  normalize(bottomInset) + normalize(visualGap);

export const resolveIOSFloatingActionOffset = (
  bottomInset: number,
  visualGap: number,
) => normalize(bottomInset) + normalize(visualGap);

export const resolveAndroidFloatingActionOffset = (
  bottomInset: number,
  visualGap: number,
  nativeTabsContentInsetApplied: boolean,
) =>
  nativeTabsContentInsetApplied
    ? normalize(visualGap)
    : addInsetAndGap(bottomInset, visualGap);

export const resolveFallbackFloatingActionOffset = (
  bottomInset: number,
  visualGap: number,
) => addInsetAndGap(bottomInset, visualGap);
