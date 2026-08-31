# ShowNext Android — Checkpoints 7–9

The Android MVP now includes the floating helper bubble, one-shot screen capture, a configurable HTTP analyzer, a result overlay, TextToSpeech, clarification input, and conservative safety warnings. It does not use AccessibilityService.

## Test on a physical Android device

1. Open `shownext-app/` in Android Studio.
2. Run the `app` configuration on a connected Android phone.
3. Tap **Start ShowNext**.
4. If Android opens the overlay-permission screen, enable **Allow display over other apps** and return to ShowNext.
5. Switch to Android Settings or another app. Confirm the small blue ShowNext bubble remains visible.
6. Drag the bubble to a different position.
7. Tap the bubble, then inspect Logcat filtered by `ShowNext`.
8. Confirm the log line is exactly `SHOW_NEXT_BUBBLE_TAPPED`.
9. Return to ShowNext and tap **Stop ShowNext**. Confirm the bubble disappears.
10. Start ShowNext again, switch to Android Settings, and tap the bubble.
11. Accept Android’s screen-capture consent dialog. ShowNext briefly closes so the underlying app can be captured.
12. Wait for ShowNext to reopen. Confirm the captured Settings screen is visible in the preview.
13. Filter Logcat by `ShowNext` and confirm both `SCREEN_CAPTURE_PERMISSION_GRANTED` and `SCREEN_CAPTURE_SUCCEEDED`.
14. Confirm the capture is one-shot: the app does not continuously update the preview, and the bubble remains available for another tap.
15. Repeat and deny the consent dialog. Confirm `SCREEN_CAPTURE_PERMISSION_DENIED` appears and no success log is written.
16. Accept capture again and wait for the result below the preview. Confirm it shows `Next step: Tap Display` and `middle of the screen`.
17. Confirm a small ShowNext card appears over the current app with `Tap Display`, the location, and a **Close** button. Confirm the underlying app remains usable outside the card.
18. Confirm the instruction is spoken once. Tap **Speak again** and confirm it is spoken again. Stop ShowNext and confirm the service cleans up its speech engine.
19. To use a real analyzer, add these Gradle properties when building (keep them out of source control): `SHOW_NEXT_API_URL=https://your-endpoint` and optionally `SHOW_NEXT_API_KEY=...`.
20. The endpoint receives JSON with `imageBase64` and `context`, and must return JSON containing `screenSummary`, `nextStep`, `location`, `confidence`, `needsClarification`, and `warning` (or the same fields nested under `analysis`).

The bubble is owned by a foreground service and is shown with `TYPE_APPLICATION_OVERLAY`. Android displays an ongoing low-priority notification while it is active.

The MediaProjection result is forwarded to the foreground service for one capture. The service closes the `Image`, releases the `ImageReader` and `VirtualDisplay`, stops MediaProjection, and deletes the temporary PNG after displaying it. No capture token is stored or reused.

## Build checks

```bash
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew test assembleDebug
```

Without `SHOW_NEXT_API_URL`, the app deliberately uses `FakeScreenAnalyzer` so the local demo remains usable. With the URL configured, the real response replaces the fake result; malformed or failed responses show a friendly error instead of raw JSON.

If the analyzer returns `needsClarification: true`, the app shows a question field and sends the reply with the same screenshot. Warnings are shown in red and spoken instead of a normal tap instruction; common sensitive-action words are also guarded locally.
