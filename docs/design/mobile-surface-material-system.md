# Mobile Surface and Material System

## Decision

The mobile UI is system-first. It does not reject solid surfaces; it rejects
drawing a second app-owned surface system when the platform already provides
the correct material.

> **Adopted principle:** Let the system decide first. Use standard material only
> when content needs additional hierarchy, and reserve Liquid Glass for
> functional controls.

Feature layout and behavior remain shared. Platform-specific visual treatment
belongs in narrow semantic adapters.

```text
Feature screen
    -> semantic UI contract
        -> iOS adapter: system materials and native presentation
        -> Android adapter: Material tonal surfaces (deferred)
```

## Surface hierarchy

```text
Layer 3  Navigation and controls
         Native Liquid Glass

Layer 2  Modal and sheet shell
         System-owned draggable sheet material
         -> content rows remain transparent

Layer 1  Content cards and grouped sections
         System standard material

Layer 0  Canvas
         System grouped background
```

One visual region gets one material layer. Do not put a GlassView or another
material card inside a system glass sheet merely to create a row background.

## Semantic roles

| Role             | iOS source                            | Use                                        |
| ---------------- | ------------------------------------- | ------------------------------------------ |
| Canvas           | systemGroupedBackgroundColor          | Screen and form background                 |
| Content material | systemMaterial                        | Cards and custom grouped sections          |
| Solid fallback   | secondarySystemGroupedBackgroundColor | Reduce Transparency or unavailable effects |
| Primary          | systemBlueColor                       | Navigation, selection, and links           |
| Destructive      | systemRedColor                        | Delete, remove, and destructive swipe      |
| Text             | labelColor                            | Primary content                            |
| Muted text       | secondaryLabelColor                   | Metadata and helper copy                   |
| Separator        | separatorColor                        | Hairline row boundaries                    |
| Selection        | secondarySystemFillColor              | Selected or pressed row state              |

Category colors are data, not UI chrome. They may not redefine Primary or
Destructive. UI code must consume semantic roles instead of literal colors.

## The three surface adapters

### AdaptiveCardSurface

Use for independent content cards on Expenses, Groups, Details, and Insights,
and for React Native grouped sections that cannot yet use a native Form.

```text
iOS
    -> system standard material (systemMaterial)

Shared Group card
    -> the same material plus a very light systemBlue tint

Reduce Transparency or effect failure
    -> secondarySystemGroupedBackgroundColor

Android
    -> Material tonal surface; Android migration remains deferred
```

This adapter must not import GlassView or delegate to AdaptiveActionSurface. A
Card is content hierarchy, not floating chrome. Because systemMaterial can
visually merge into a uniform grouped canvas, the outer frame uses a system
separator hairline and a restrained neutral shadow. The inner material surface
owns continuous-corner clipping. Do not clip the outer frame: doing so removes
the shadow together with the material overflow.

This edge treatment is a legibility affordance, not a second decorative
material. It must remain much quieter than a floating action control and must
not introduce a blue shadow or an opaque app-owned Card fill.

`AdaptiveCardSurface` owns its geometry through two variants:

```text
card
    -> 20pt continuous radius
    -> restrained neutral shadow
    -> independent content on a canvas

section
    -> 14pt continuous radius
    -> system separator hairline, no Card shadow
    -> grouped Form or Settings rows
```

Callers may provide spacing and layout, but must not override radius,
`overflow`, border, or shadow. The outer frame never clips; the matching inner
material layer clips at the same variant radius.

### AdaptiveSheetSection

Use inside Period, Category, Group, Members, and other native sheets.

```text
System sheet shell
    -> transparent section
        -> row
        -> separator
        -> optional selected-row fill
```

It must not create another glass or standard-material card. A light system fill
is allowed only for a temporary state such as selection, press, or disabled
feedback.

### AdaptiveActionSurface

Use only for controls that float above content or express an active operation:

- the central add button;
- floating toolbar actions;
- picker triggers and menus;
- a custom segmented-control selection thumb.

On supported iOS versions this is the Liquid Glass adapter. Old iOS and Reduce
Transparency use the semantic solid fallback. Feature screens must not import
expo-glass-effect directly.

### Sheet action hierarchy

Every `AdaptiveSheetAction` must explicitly declare `variant: "plain"` or
`variant: "prominent"`. The iOS adapter renders a native SwiftUI Button using
the system `glass` or `glassProminent` style. It must not wrap that Button in
`AdaptiveActionSurface` and must not add an app-owned shadow; the system sheet
and native Button own their highlights, refraction, press response, and edge
depth.

Route-level form sheets use the equivalent Expo Router toolbar `variant`.

| Task state              | Leading action | Trailing action                  |
| ----------------------- | -------------- | -------------------------------- |
| New Group               | Cancel, plain  | Create, prominent                |
| New Expense             | Cancel, plain  | Add, prominent                   |
| Edit Expense            | Cancel, plain  | Save, prominent                  |
| Category create or edit | Cancel, plain  | Add/Save, prominent              |
| Period Picker           | Cancel, plain  | Done, prominent                  |
| Members, viewing        | Close, plain   | Edit, plain                      |
| Members, editing        | Cancel, plain  | Done, prominent                  |
| Single selection        | Cancel, plain  | None; selection closes the sheet |
| Read-only information   | Close, plain   | None                             |

Delete and Remove remain `systemRed` content or menu actions. They are never a
prominent glass navigation action.

## Screen mapping

| Area                             | Required treatment                                                       |
| -------------------------------- | ------------------------------------------------------------------------ |
| App background                   | System grouped background                                                |
| Expense Card                     | Standard material                                                        |
| Group Card                       | Standard material with restrained systemBlue tint                        |
| Expense or Group detail sections | Standard material                                                        |
| Insights summary and chart       | Standard material; chart center and background stay transparent          |
| Custom form section              | One standard-material section, not one surface per row                   |
| Settings                         | Prefer native grouped Form/List; otherwise one standard-material section |
| Sheet shell                      | System-owned native draggable presentation                               |
| Sheet rows                       | Transparent with separators and selection fill                           |
| Sheet actions                    | Native plain/prominent hierarchy; no app-owned action shadow             |
| Toolbar and Tab Bar              | Native platform material or Liquid Glass                                 |
| Central add button               | Neutral Liquid Glass; do not tint it blue                                |
| Period Picker                    | Native SwiftUI Picker inside a single system sheet                       |

“System-owned native sheet” describes the presentation boundary, not one
specific routing API. Expo Router formSheet and the SwiftUI-backed Expo
BottomSheet are both valid when the system owns detents, drag behavior, and
material. Route-level tasks such as New Group and New/Edit Expense use
formSheet. Local selection tasks such as Period use the SwiftUI-backed native
BottomSheet because their draft selection and callback remain in the invoking
screen. `surface="system"` means the React Native content is transparent and
the adapter does not override SwiftUI's presentation background.

Compact creation tasks use explicit compact and expanded system detents rather
than `fitToContents` around a ScrollView. This keeps the sheet draggable and
prevents either clipped form content or a nearly empty full-height page.

### Native form-sheet layout contract

Native form sheets need one stable React Native content root. On React Native
0.82 and newer, enable
`featureFlags.experiment.synchronousScreenUpdatesEnabled` before creating the
root navigator. React Native Screens otherwise uses the legacy absolute screen
layout, which can leave a flex form body at zero height even though the native
toolbar and sheet shell are visible.

Transparent form-sheet roots must opt out of Fabric view flattening with
`collapsable={false}`. Keep the ScrollView and its form content beneath that one
root instead of exposing several toolbar/configuration nodes as sibling native
views. A flattened root can make React Native Screens report too many form-sheet
subviews and render only the glass shell.

Use automatic content inset adjustment, then normal first-section spacing. Do
not encode a navigation-bar height such as a 72pt top spacer. The inset belongs
to the native presentation; the remaining 16pt spacing belongs to the form
layout.

## Forms and Settings

System components take priority over material adapters.

```text
Native Form or List can express the interaction
    -> use it and accept the system-selected surface

React Native composition is still required
    -> wrap the whole section in AdaptiveCardSurface

Never
    -> hard-code white or dark-gray row backgrounds
    -> give every row its own GlassView
    -> add a heavy border or floating-control shadow to imitate material
```

Rows remain transparent within their section. Use separators for grouping and
system fill for transient selection. Controls such as Switch, Date Picker, and
Menu keep their native appearance.

## Accessibility, appearance, and fallback

- Follow the app's System, Light, or Dark appearance preference.
- Source the iOS canvas, surfaces, labels, secondary labels, fills, separators,
  success, and destructive roles from PlatformColor. Hand-authored dynamic
  values remain only for restrained product tints and data visualization.
- When Reduce Transparency is enabled, replace content material with the solid
  semantic Surface and replace Liquid Glass controls with their solid adapter.
- Resolve Reduce Transparency once above navigation, then share the result with
  Card and control adapters. Do not query AccessibilityInfo or register a native
  listener per list item. Content waits for that initial preference so a long
  list does not flash from solid rows to material rows.
- Preserve at least 44 x 44 points for interactive targets.
- Never rely on tint alone to identify a Group expense; retain the Group label.
- Keep text and exact chart values outside decorative chart accessibility.

## Review checklist

Before adding or changing a surface, verify:

1. Is this content, a sheet container, or an operation?
2. Does a native Form, List, Menu, Picker, or navigation component already own
   the presentation?
3. Is there exactly one material layer in the visual region?
4. Does a content Card use AdaptiveCardSurface, never AdaptiveActionSurface?
5. Are Sheet rows transparent and separated without a nested material?
6. Are blue and red sourced only from system semantic colors?
7. Does Reduce Transparency produce a readable solid fallback?
8. Does a Card edge remain visible without becoming stronger than navigation?
9. Does a grouped section use the section variant without caller-owned clipping?
10. Does the sheet leave its presentation background to the native container?
11. Is Reduce Transparency resolved once above the list rather than per item?
12. Is Android behavior still isolated behind the same semantic contract?
13. Does a route formSheet have one non-collapsible native content root?
14. Is synchronous screen sizing enabled before the root navigator is created?

## Decision traceability

### R1

**使用者原話（最高原則）**

> 改成這樣

**背景：** The adopted reference separates canvas, content material, native
sheet material, and Liquid Glass controls.

**計畫影響：** Content cards use standard material; sheet rows stay
transparent; Liquid Glass remains functional rather than decorative.

### R2

**使用者原話（最高原則）**

> 並寫一套類似這個長度的文件之後可以參考

**背景：** Repeated visual changes exposed the need for a durable adapter and
surface decision reference.

**計畫影響：** This document is the review baseline for future mobile surface
work and records both implementation boundaries and acceptance checks.

## References

- [Apple Human Interface Guidelines: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Expo BlurView](https://docs.expo.dev/versions/latest/sdk/blur-view/)
- [Expo Router: Stack](https://docs.expo.dev/router/advanced/stack/)
- [React Native Screens: synchronous form-sheet sizing](https://github.com/software-mansion/react-native-screens/pull/3454)
