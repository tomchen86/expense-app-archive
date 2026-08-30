# Mobile Visual Language

The canonical surface hierarchy and adapter boundaries are defined in
[Mobile Surface and Material System](./mobile-surface-material-system.md).

## Intent

The mobile app should feel native to its host platform while preserving one
shared feature composition. Platform differences belong in semantic UI
adapters, not in feature screens.

```text
Feature screen
    -> semantic UI contract
        -> iOS adapter: native navigation, grouped surfaces, page sheets
        -> Android adapter: Material surfaces and dialogs (deferred)
```

## Mood

- Calm, trustworthy, and financial without looking like a bank dashboard.
- Content-first. Glass is reserved for navigation and transient controls.
- Shared expenses use a restrained system-blue tint; green is not used for
  ordinary spending totals.
- Destructive actions are unmistakable but never decorative.

## Semantic color roles

UI code consumes roles rather than literal color values.

| Role        | iOS source                              | Use                               |
| ----------- | --------------------------------------- | --------------------------------- |
| Background  | `systemGroupedBackgroundColor`          | Grouped screens and forms         |
| Surface     | `systemMaterial`                        | Cards and custom grouped sections |
| Fallback    | `secondarySystemGroupedBackgroundColor` | Reduce Transparency               |
| Primary     | `systemBlueColor`                       | Navigation actions and selection  |
| Destructive | `systemRedColor`                        | Delete, remove, destructive swipe |
| Text        | `labelColor`                            | Primary content                   |
| Muted text  | `secondaryLabelColor`                   | Metadata and helper copy          |
| Separator   | `separatorColor`                        | Hairline row boundaries           |

The expense-category palette is data visualization, not UI chrome. Category
colors may include coral or pink, but those colors must never be reused for a
Delete or Remove action. Conversely, the destructive role must not be used for
chart data.

## Platform behavior

### iOS

- Use native Stack navigation for titles, back behavior, menus, and modal tasks.
- Root tab screens may use collapsing large titles. Pushed detail/settings
  screens use compact navigation titles and do not repeat the title in content.
- Prefer native grouped Form/List. Custom grouped sections use one system
  standard-material surface with a 14-point section radius, transparent rows,
  separators, and no standalone Card shadow.
- Add/edit tasks use a native form sheet with Cancel and Add/Save navigation
  actions. Cancel/Close/Edit use the native plain hierarchy; Add/Create/Save/
  Done use native prominent hierarchy. Native sheet actions never receive an
  additional app-owned shadow. Compact creation tasks may fit content; long
  forms use the large system detent.
- Swipe actions use the semantic destructive color and a minimum 44-point
  target.
- Liquid Glass is limited to navigation, the central add action, menus, and
  other transient controls. Content Cards use standard material; rows inside a
  system sheet remain transparent.

### Android

Android keeps the same semantic contracts but maps them to Material components,
colors, elevation, and ripple. Android visual migration and validation are
intentionally deferred.

## Geometry and spacing

- Interactive targets: at least 44 x 44 points on iOS.
- Grouped rows: 52-56 points minimum height.
- Grouped section radius: 14 points with a continuous iOS curve.
- Cards that encode product meaning may use the 20-point card radius.
- Content material uses only a subtle neutral Card shadow and system separator
  hairline where a uniform canvas would otherwise erase its edge. Floating
  controls may retain the stronger adapter shadow hierarchy, but native sheet
  and toolbar controls rely only on system-owned depth.

## Enforcement

- Feature and screen files must not introduce literal UI colors.
- Literal category/chart colors live only in the data-palette module.
- Platform-native colors live only in semantic color adapters.
- New platform behavior uses a semantic component contract before adding
  `.ios` or `.android` implementations.
