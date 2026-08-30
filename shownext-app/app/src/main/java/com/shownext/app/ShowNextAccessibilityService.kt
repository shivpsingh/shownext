package com.shownext.app

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Rect
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.shownext.app.model.DetectedTarget
import com.shownext.app.scanner.AccessibilityTargetScanner

class ShowNextAccessibilityService : AccessibilityService() {
    private lateinit var windowManager: WindowManager
    private val scanner = AccessibilityTargetScanner()
    private var bubble: TextView? = null
    private var panel: View? = null
    private var highlight: View? = null
    private val preferenceListener = android.content.SharedPreferences.OnSharedPreferenceChangeListener { _, key -> if (key == MainActivity.KEY_PAUSED) refreshBubble() }
    private val pauseReceiver = object : BroadcastReceiver() { override fun onReceive(context: Context?, intent: Intent?) { if (intent?.action == MainActivity.ACTION_PAUSE_CHANGED) refreshBubble() } }

    override fun onServiceConnected() {
        super.onServiceConnected()
        serviceInfo = serviceInfo.apply { eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or AccessibilityEvent.TYPE_VIEW_SCROLLED; feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC; flags = flags or AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS }
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        getSharedPreferences("shownext", Context.MODE_PRIVATE).registerOnSharedPreferenceChangeListener(preferenceListener)
        ContextCompat.registerReceiver(this, pauseReceiver, IntentFilter(MainActivity.ACTION_PAUSE_CHANGED), ContextCompat.RECEIVER_NOT_EXPORTED)
        refreshBubble()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        if (event.packageName?.toString() == packageName) { remove(bubble); bubble = null; clearHighlight(); return }
        if (!isPaused()) showBubble()
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED || event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) clearHighlight()
    }

    override fun onInterrupt() = Unit

    override fun onDestroy() { getSharedPreferences("shownext", Context.MODE_PRIVATE).unregisterOnSharedPreferenceChangeListener(preferenceListener); unregisterReceiver(pauseReceiver); remove(bubble); remove(panel); remove(highlight); super.onDestroy() }

    private fun showBubble() {
        if (bubble != null) return
        bubble = TextView(this).apply { text = "✦"; textSize = 25f; gravity = Gravity.CENTER; setTextColor(Color.WHITE); setBackgroundColor(Color.rgb(50, 103, 232)); elevation = 12f; setOnClickListener { openPanel() }; setOnTouchListener(DragListener(this) { updateBubblePosition() }) }
        windowManager.addView(bubble, bubbleParams())
    }

    private fun openPanel() {
        clearHighlight(); val targets = scanner.scan(rootInActiveWindow); val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(28, 22, 28, 22); setBackgroundColor(Color.WHITE) }
        val title = TextView(this).apply { text = if (targets.isEmpty()) "No usable controls found" else "What would you like help with?"; textSize = 20f; setTextColor(Color.DKGRAY); setPadding(0, 0, 0, 16) }; list.addView(title)
        targets.forEach { target -> list.addView(targetRow(target, list)) }
        val close = TextView(this).apply { text = "Close"; textSize = 17f; setTextColor(Color.rgb(35, 75, 181)); setPadding(0, 18, 0, 8); setOnClickListener { remove(panel); panel = null } }; list.addView(close)
        panel = list; windowManager.addView(panel, panelParams())
    }

    private fun targetRow(target: DetectedTarget, parent: View): TextView = TextView(this).apply { text = target.label; textSize = 19f; setTextColor(Color.rgb(23, 34, 53)); setPadding(0, 15, 0, 15); minHeight = 56; setOnClickListener { remove(panel); panel = null; showHighlight(target) } }

    private fun showHighlight(target: DetectedTarget) {
        val view = object : View(this) { override fun onDraw(canvas: android.graphics.Canvas) { super.onDraw(canvas); val paint = android.graphics.Paint(1).apply { color = Color.rgb(255, 114, 94); style = android.graphics.Paint.Style.STROKE; strokeWidth = 6f }; canvas.drawRoundRect(android.graphics.RectF(target.bounds), 14f, 14f, paint); paint.style = android.graphics.Paint.Style.FILL; canvas.drawText("Tap here", target.bounds.left.toFloat(), (target.bounds.top - 14).coerceAtLeast(38).toFloat(), paint) } }
        highlight = view; windowManager.addView(view, highlightParams())
    }

    private fun clearHighlight() { remove(highlight); highlight = null }
    private fun refreshBubble() { if (isPaused()) { remove(bubble); bubble = null; remove(panel); panel = null; clearHighlight() } else if (rootInActiveWindow?.packageName?.toString() != packageName) showBubble() }
    private fun remove(view: View?) { if (view != null) runCatching { windowManager.removeView(view) } }
    private fun isPaused() = getSharedPreferences("shownext", Context.MODE_PRIVATE).getBoolean(MainActivity.KEY_PAUSED, false)
    private fun bubbleParams() = WindowManager.LayoutParams(64, 64, WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.END; x = 22; y = 340 }
    private fun panelParams() = WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, PixelFormat.TRANSLUCENT).apply { gravity = Gravity.BOTTOM; y = 0 }
    private fun highlightParams() = WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE, PixelFormat.TRANSLUCENT)
    private fun updateBubblePosition() { bubble?.let { windowManager.updateViewLayout(it, bubbleParams().apply { y = (it.translationY + 340).toInt() }) } }

    private class DragListener(private val view: View, private val moved: () -> Unit) : View.OnTouchListener { private var downY = 0f; override fun onTouch(v: View, event: MotionEvent): Boolean { if (event.action == MotionEvent.ACTION_DOWN) downY = event.rawY; if (event.action == MotionEvent.ACTION_MOVE) { view.translationY = event.rawY - downY; moved() }; return event.action != MotionEvent.ACTION_UP || kotlin.math.abs(view.translationY) > 4 } }
}
