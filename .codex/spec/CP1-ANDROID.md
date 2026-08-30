# ShowNext CP1 Android implementation

## Scope

CP1 demonstrates cross-app screen reading and highlighting. It is intentionally not a conversational AI, automatic clicker, backend client, or data collector.

## User flow

1. The setup activity explains the accessibility permission.
2. The user opens Android Accessibility Settings and enables ShowNext.
3. The service shows a floating bubble over unlocked third-party apps and hides it over ShowNext.
4. The bubble opens a fresh list of labeled actionable controls from the active window.
5. Selecting a row draws a bright coral border and “Tap here” label over the node.
6. The highlight is non-touchable, so the underlying app remains usable.
7. Window changes, content changes, scrolling, Pause, or a second bubble tap clear stale overlays.

## Boundaries

- Minimum SDK 26; compile/target SDK 34.
- Required emulator: Android 12/API 31. Smoke check: API 35.
- English-only copy; large text and 56dp setup controls.
- Exclude password and editable nodes, invisible nodes, unlabeled nodes, and empty bounds.
- Store only the pause preference in `SharedPreferences`; never persist or log screen data.

## Test checklist

- `TargetNormalizerTest` passes.
- Accessibility setup status updates after returning from system settings.
- Settings controls appear in the helper list.
- Highlight aligns with the selected control and does not block its tap.
- Navigation, scrolling, Pause, Resume, and service restart clear or restore overlays as specified.
