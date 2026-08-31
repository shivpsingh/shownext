package com.shownext.app

import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.graphics.BitmapFactory
import android.widget.ImageView
import android.widget.TextView
import android.widget.Button
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity
import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine

class MainActivity : AppCompatActivity() {
    private lateinit var screenshot: ImageView
    private lateinit var message: TextView
    private lateinit var analysisResult: TextView
    private lateinit var clarificationInput: EditText
    private lateinit var clarificationButton: Button
    private val analyzer: ScreenAnalyzer = if (BuildConfig.SHOW_NEXT_API_URL.isBlank()) {
        FakeScreenAnalyzer()
    } else {
        ApiScreenAnalyzer(BuildConfig.SHOW_NEXT_API_URL, BuildConfig.SHOW_NEXT_API_KEY)
    }
    private var consentInProgress = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        screenshot = findViewById(R.id.screenshotPreview)
        message = findViewById(R.id.screenshotMessage)
        analysisResult = findViewById(R.id.analysisResult)
        clarificationInput = EditText(this).apply { hint = "What are you trying to do?"; visibility = EditText.GONE }
        clarificationButton = Button(this).apply { text = "Send"; visibility = Button.GONE }
        (screenshot.parent as android.widget.LinearLayout).apply { addView(clarificationInput); addView(clarificationButton) }
        clarificationButton.setOnClickListener { submitClarification() }
        handleIncomingIntent(intent)
        findViewById<Button>(R.id.startButton).setOnClickListener { startShowNext() }
        findViewById<Button>(R.id.stopButton).setOnClickListener { stopService(Intent(this, BubbleService::class.java)); updateBubbleStatus(false) }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        if (intent != null) { setIntent(intent); handleIncomingIntent(intent) }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_SCREEN_CAPTURE) return
        consentInProgress = false
        if (resultCode == RESULT_OK && data != null) {
            Log.i(TAG, "SCREEN_CAPTURE_PERMISSION_GRANTED")
            message.text = getString(R.string.screen_capture_permission_granted)
            startService(Intent(this, BubbleService::class.java).apply {
                action = BubbleService.ACTION_CAPTURE_ONCE
                putExtra(BubbleService.EXTRA_RESULT_CODE, resultCode)
                putExtra(BubbleService.EXTRA_RESULT_DATA, data)
            })
            finish()
        } else {
            Log.i(TAG, "SCREEN_CAPTURE_PERMISSION_DENIED")
            message.text = getString(R.string.screen_capture_permission_denied)
        }
    }

    override fun onResume() { super.onResume(); updateBubbleStatus(BubbleService.isRunning) }

    private fun startShowNext() {
        if (!Settings.canDrawOverlays(this)) {
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            return
        }
        startForegroundService(Intent(this, BubbleService::class.java))
        updateBubbleStatus(true)
    }

    private fun updateBubbleStatus(active: Boolean) { findViewById<TextView>(R.id.bubbleStatus).text = getString(if (active) R.string.bubble_active else R.string.bubble_inactive) }

    private fun handleIncomingIntent(intent: Intent) {
        if (intent.action == ACTION_REQUEST_SCREEN_CAPTURE) {
            requestScreenCapturePermission()
            return
        }
        if (intent.action == ACTION_SHOW_CAPTURED_SCREEN) {
            displayCapturedScreenshot(intent.getStringExtra(EXTRA_CAPTURE_PATH))
            return
        }
        if (intent.action != Intent.ACTION_SEND || intent.type?.startsWith("image/") != true) {
            showMessage(getString(R.string.share_screenshot_prompt))
            return
        }
        val uri = sharedImageUri(intent)
        if (uri == null) { showMessage(getString(R.string.shared_image_unavailable)); return }
        try {
            contentResolver.openInputStream(uri)?.use { input ->
                if (input.read() == -1) throw IllegalArgumentException("Empty image")
            } ?: throw IllegalArgumentException("Image cannot be opened")
            screenshot.setImageURI(uri)
            screenshot.contentDescription = getString(R.string.shared_screenshot_description)
            screenshot.visibility = ImageView.VISIBLE
            message.text = getString(R.string.shared_screenshot_received)
        } catch (_: SecurityException) { showMessage(getString(R.string.shared_image_unavailable))
        } catch (_: Exception) { showMessage(getString(R.string.shared_image_unavailable)) }
    }

    private fun requestScreenCapturePermission() {
        if (consentInProgress) return
        consentInProgress = true
        val manager = getSystemService(MediaProjectionManager::class.java)
        startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_SCREEN_CAPTURE)
    }

    private fun displayCapturedScreenshot(path: String?) {
        val bitmap = path?.let(BitmapFactory::decodeFile)
        if (bitmap == null) { showMessage(getString(R.string.captured_screen_unavailable)); return }
        screenshot.setImageBitmap(bitmap)
        screenshot.contentDescription = getString(R.string.captured_screen_description)
        screenshot.visibility = ImageView.VISIBLE
        message.text = getString(R.string.captured_screen_received)
        analysisResult.visibility = TextView.VISIBLE
        analysisResult.text = getString(R.string.analysis_loading)
        Thread {
            val operation: suspend () -> ScreenAnalysis = { analyzer.analyze(bitmap) }
            operation.startCoroutine(object : Continuation<ScreenAnalysis> {
                override val context = EmptyCoroutineContext
                override fun resumeWith(result: Result<ScreenAnalysis>) {
                    result.onSuccess { analysis -> runOnUiThread {
                        analysisResult.text = getString(R.string.analysis_result, analysis.nextStep, analysis.location ?: "")
                        clarificationInput.visibility = if (analysis.needsClarification) EditText.VISIBLE else EditText.GONE
                        clarificationButton.visibility = if (analysis.needsClarification) Button.VISIBLE else Button.GONE
                        startService(Intent(this@MainActivity, BubbleService::class.java).apply {
                            action = BubbleService.ACTION_SHOW_RESULT
                            putExtra(BubbleService.EXTRA_NEXT_STEP, analysis.nextStep)
                            putExtra(BubbleService.EXTRA_LOCATION, analysis.location)
                            putExtra(BubbleService.EXTRA_WARNING, safeWarning(analysis))
                        })
                    } }.onFailure { runOnUiThread {
                        analysisResult.text = getString(R.string.analysis_error)
                    } }
                }
            })
        }.start()
        path?.let { java.io.File(it).delete() }
    }

    private fun submitClarification() {
        val text = clarificationInput.text.toString().trim()
        if (text.isEmpty()) return
        clarificationInput.visibility = EditText.GONE
        clarificationButton.visibility = Button.GONE
        analysisResult.text = getString(R.string.analysis_loading)
        val bitmap = (screenshot.drawable as? android.graphics.drawable.BitmapDrawable)?.bitmap ?: return
        Thread {
            val operation: suspend () -> ScreenAnalysis = { analyzer.analyze(bitmap, text) }
            operation.startCoroutine(object : Continuation<ScreenAnalysis> {
                override val context = EmptyCoroutineContext
                override fun resumeWith(result: Result<ScreenAnalysis>) {
                    result.onSuccess { analysis -> runOnUiThread {
                        analysisResult.text = getString(R.string.analysis_result, analysis.nextStep, analysis.location ?: "")
                        startService(Intent(this@MainActivity, BubbleService::class.java).apply {
                            action = BubbleService.ACTION_SHOW_RESULT
                            putExtra(BubbleService.EXTRA_NEXT_STEP, analysis.nextStep)
                            putExtra(BubbleService.EXTRA_LOCATION, analysis.location)
                            putExtra(BubbleService.EXTRA_WARNING, safeWarning(analysis))
                        })
                    } }.onFailure { runOnUiThread { analysisResult.text = getString(R.string.analysis_error) } }
                }
            })
        }.start()
    }

    private fun safeWarning(analysis: ScreenAnalysis): String? {
        if (!analysis.warning.isNullOrBlank()) return analysis.warning
        val text = analysis.nextStep.lowercase()
        val sensitive = listOf("payment", "transfer", "upi", "otp", "password", "pin", "delete account", "factory reset", "install apk")
        return if (sensitive.any { text.contains(it) }) getString(R.string.safety_warning) else null
    }

    private fun sharedImageUri(intent: Intent): Uri? {
        @Suppress("DEPRECATION") val direct = intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri
        return direct ?: intent.clipData?.getItemAt(0)?.uri
    }

    private fun showMessage(text: String) { screenshot.setImageDrawable(null); screenshot.visibility = ImageView.GONE; message.text = text }

    companion object {
        const val KEY_PAUSED = "paused"
        const val ACTION_PAUSE_CHANGED = "com.shownext.app.PAUSE_CHANGED"
        const val ACTION_REQUEST_SCREEN_CAPTURE = "com.shownext.app.REQUEST_SCREEN_CAPTURE"
        const val ACTION_SHOW_CAPTURED_SCREEN = "com.shownext.app.SHOW_CAPTURED_SCREEN"
        const val EXTRA_CAPTURE_PATH = "capture_path"
        private const val REQUEST_SCREEN_CAPTURE = 2001
        private const val TAG = "ShowNext"
    }
}
