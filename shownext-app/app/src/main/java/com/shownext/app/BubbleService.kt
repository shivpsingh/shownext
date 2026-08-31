package com.shownext.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import android.widget.LinearLayout
import android.widget.Button
import android.widget.ImageView
import android.speech.tts.TextToSpeech
import java.util.Locale
import androidx.core.app.NotificationCompat
import android.os.Handler
import android.os.Looper
import android.content.pm.ServiceInfo

class BubbleService : Service() {
    private lateinit var windowManager: WindowManager
    private var bubble: View? = null
    private var params: WindowManager.LayoutParams? = null
    private var resultCard: View? = null
    private var textToSpeech: TextToSpeech? = null
    private var ttsReady = false

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification())
        }
        textToSpeech = TextToSpeech(this) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (ttsReady) textToSpeech?.language = Locale.getDefault()
        }
        showBubble()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_CAPTURE_ONCE) {
            val resultData = intent.getParcelableExtra<Intent>(EXTRA_RESULT_DATA)
            if (resultData != null) captureOnce(intent.getIntExtra(EXTRA_RESULT_CODE, -1), resultData)
        }
        if (intent?.action == ACTION_SHOW_RESULT) {
            showResult(intent.getStringExtra(EXTRA_NEXT_STEP).orEmpty(), intent.getStringExtra(EXTRA_LOCATION), intent.getStringExtra(EXTRA_WARNING))
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        resultCard?.let { runCatching { windowManager.removeView(it) } }
        resultCard = null
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null
        bubble?.let { runCatching { windowManager.removeView(it) } }
        bubble = null
        isRunning = false
        super.onDestroy()
    }

    private fun showBubble() {
        val view = ImageView(this).apply {
            setImageResource(R.drawable.show_next_icon)
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            elevation = 10f
            contentDescription = "ShowNext help bubble"
            setOnClickListener {
                Log.d(TAG, "SHOW_NEXT_BUBBLE_TAPPED")
                startActivity(Intent(this@BubbleService, MainActivity::class.java).apply {
                    action = MainActivity.ACTION_REQUEST_SCREEN_CAPTURE
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                })
            }
            setOnTouchListener(DragTouchListener())
        }
        val size = (56 * resources.displayMetrics.density).toInt()
        params = WindowManager.LayoutParams(size, size, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.END; x = (20 * resources.displayMetrics.density).toInt(); y = (320 * resources.displayMetrics.density).toInt() }
        bubble = view
        windowManager.addView(view, params)
    }

    private fun notification(): Notification {
        val channelId = "shownext_bubble"
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) manager.createNotificationChannel(NotificationChannel(channelId, "ShowNext helper", NotificationManager.IMPORTANCE_LOW))
        return NotificationCompat.Builder(this, channelId).setSmallIcon(android.R.drawable.ic_menu_help).setContentTitle(getString(R.string.bubble_notification_title)).setContentText(getString(R.string.bubble_notification_text)).setOngoing(true).build()
    }

    private fun captureOnce(resultCode: Int, resultData: Intent) {
        val manager = getSystemService(MediaProjectionManager::class.java)
        val projection = runCatching { manager.getMediaProjection(resultCode, resultData) }.getOrNull()
        if (projection == null) { Log.e(TAG, "SCREEN_CAPTURE_FAILED"); return }

        projection.registerCallback(object : MediaProjection.Callback() {
            override fun onStop() {
                Log.d(TAG, "MediaProjection stopped")
            }
        }, Handler(Looper.getMainLooper()))

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
        }
        val metrics = resources.displayMetrics
        val width = metrics.widthPixels
        val height = metrics.heightPixels
        val reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        var display: android.hardware.display.VirtualDisplay? = null
        reader.setOnImageAvailableListener({ source ->
            val image = source.acquireLatestImage() ?: return@setOnImageAvailableListener
            try {
                val plane = image.planes[0]
                val pixelStride = plane.pixelStride
                val rowStride = plane.rowStride
                val rowPadding = rowStride - pixelStride * width
                val raw = Bitmap.createBitmap(width + rowPadding / pixelStride, height, Bitmap.Config.ARGB_8888)
                raw.copyPixelsFromBuffer(plane.buffer)
                val bitmap = Bitmap.createBitmap(raw, 0, 0, width, height)
                raw.recycle()
                saveCapturedScreen(bitmap)
                bitmap.recycle()
            } finally {
                image.close()
                reader.close()
                display?.release()
                projection.stop()
            }
        }, Handler(Looper.getMainLooper()))
        display = projection.createVirtualDisplay("ShowNextCapture", width, height, metrics.densityDpi, DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, reader.surface, null, null)
    }

    private fun saveCapturedScreen(bitmap: Bitmap) {
        val file = java.io.File(cacheDir, "shownext-capture.png")
        runCatching { file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) } }.onSuccess {
            Log.i(TAG, "SCREEN_CAPTURE_SUCCEEDED")
            startActivity(Intent(this, MainActivity::class.java).apply { action = MainActivity.ACTION_SHOW_CAPTURED_SCREEN; putExtra(MainActivity.EXTRA_CAPTURE_PATH, file.absolutePath); addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP) })
        }.onFailure { Log.e(TAG, "SCREEN_CAPTURE_FAILED", it) }
    }

    private fun showResult(nextStep: String, location: String?, warning: String? = null) {
        resultCard?.let { runCatching { windowManager.removeView(it) } }
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 22, 28, 18)
            background = GradientDrawable().apply {
                cornerRadius = 20f
                setColor(Color.WHITE)
                setStroke(2, Color.rgb(50, 103, 232))
            }
            elevation = 14f
        }
        card.addView(TextView(this).apply {
            text = "ShowNext"
            textSize = 14f
            setTextColor(Color.rgb(50, 103, 232))
        })
        card.addView(TextView(this).apply {
            text = warning ?: nextStep
            textSize = 22f
            setTextColor(if (warning != null) Color.rgb(170, 45, 35) else Color.rgb(25, 35, 55))
            setPadding(0, 8, 0, 0)
        })
        if (!location.isNullOrBlank()) card.addView(TextView(this).apply {
            text = location
            textSize = 14f
            setTextColor(Color.DKGRAY)
            setPadding(0, 4, 0, 8)
        })
        val spokenText = warning ?: if (location.isNullOrBlank()) "$nextStep." else "$nextStep on the $location."
        speak(spokenText)
        card.addView(Button(this).apply {
            text = "Speak again"
            setOnClickListener { speak(spokenText) }
        })
        card.addView(Button(this).apply {
            text = "Close"
            setOnClickListener { resultCard?.let { view -> runCatching { windowManager.removeView(view) } }; resultCard = null }
        })
        val width = (280 * resources.displayMetrics.density).toInt()
        val cardParams = WindowManager.LayoutParams(
            width,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = (20 * resources.displayMetrics.density).toInt()
            y = (390 * resources.displayMetrics.density).toInt()
        }
        resultCard = card
        windowManager.addView(card, cardParams)
    }

    private fun speak(text: String) {
        if (ttsReady) textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "shownext-result")
    }

    private inner class DragTouchListener : View.OnTouchListener {
        private var downX = 0f
        private var downY = 0f
        private var moved = false
        override fun onTouch(view: View, event: MotionEvent): Boolean {
            val layout = params ?: return false
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> { downX = event.rawX; downY = event.rawY; moved = false }
                MotionEvent.ACTION_MOVE -> { val dx = event.rawX - downX; val dy = event.rawY - downY; if (kotlin.math.abs(dx) > 5 || kotlin.math.abs(dy) > 5) moved = true; layout.x = (layout.x - dx).toInt(); layout.y = (layout.y + dy).toInt(); downX = event.rawX; downY = event.rawY; windowManager.updateViewLayout(view, layout) }
                MotionEvent.ACTION_UP -> if (!moved) view.performClick()
            }
            return true
        }
    }

    companion object {
        private const val TAG = "ShowNext"
        private const val NOTIFICATION_ID = 1001
        const val ACTION_CAPTURE_ONCE = "com.shownext.app.CAPTURE_ONCE"
        const val EXTRA_RESULT_CODE = "result_code"
        const val EXTRA_RESULT_DATA = "result_data"
        const val ACTION_SHOW_RESULT = "com.shownext.app.SHOW_RESULT"
        const val EXTRA_NEXT_STEP = "next_step"
        const val EXTRA_LOCATION = "location"
        const val EXTRA_WARNING = "warning"
        @Volatile var isRunning: Boolean = false
    }
}
