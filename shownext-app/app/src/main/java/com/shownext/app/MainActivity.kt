package com.shownext.app

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private val preferences by lazy { getSharedPreferences("shownext", Context.MODE_PRIVATE) }
    private lateinit var status: TextView
    private lateinit var pauseButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        status = findViewById(R.id.serviceStatus)
        pauseButton = findViewById(R.id.pauseButton)
        findViewById<Button>(R.id.accessibilityButton).setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
        pauseButton.setOnClickListener { preferences.edit().putBoolean(KEY_PAUSED, !isPaused()).apply(); sendBroadcast(Intent(ACTION_PAUSE_CHANGED)); updateUi() }
    }

    override fun onResume() { super.onResume(); updateUi() }

    private fun updateUi() {
        val enabled = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES).orEmpty().contains(ComponentName(this, ShowNextAccessibilityService::class.java).flattenToString())
        status.text = if (enabled) getString(R.string.service_enabled) else getString(R.string.service_disabled)
        status.setBackgroundColor(getColor(if (enabled) R.color.shownext_mint else R.color.shownext_coral))
        pauseButton.text = getString(if (isPaused()) R.string.resume_assistant else R.string.pause_assistant)
    }

    private fun isPaused() = preferences.getBoolean(KEY_PAUSED, false)
    companion object { const val KEY_PAUSED = "paused"; const val ACTION_PAUSE_CHANGED = "com.shownext.app.PAUSE_CHANGED" }
}
