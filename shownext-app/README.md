# ShowNext Android CP1

CP1 is a native Kotlin + Views Android prototype. It uses an `AccessibilityService` to read the active window’s labeled actionable controls and a `TYPE_ACCESSIBILITY_OVERLAY` to show a helper bubble, bottom target list, and pass-through highlight.

## Run in Android Studio

Open this directory as its own Android Studio project. Use an Android 12/API 31 emulator for the required check (API 35 is a smoke check). The module compiles with `minSdk 26`, `targetSdk 34`, and application ID `com.shownext.app`.

1. Build and install the `app` configuration.
2. Launch ShowNext and tap **Open Accessibility Settings**.
3. Enable **ShowNext assistant**, return to Android Settings, and tap the blue bubble.
4. Choose a labeled Settings control. The coral border and “Tap here” label should point to it, while touches pass through to Settings.
5. Return to ShowNext to Pause or Resume the helper.

Screen labels and bounds are held in memory only. Password and editable text nodes are excluded. CP1 does not click controls, call a server, or use AI inference.

## Automated tests

`TargetNormalizerTest` covers actionable filtering, label cleanup, duplicate removal, and empty bounds. The full Android service overlay still requires emulator verification because Android’s accessibility settings and cross-app windows cannot be reliably reproduced by local JVM tests.
