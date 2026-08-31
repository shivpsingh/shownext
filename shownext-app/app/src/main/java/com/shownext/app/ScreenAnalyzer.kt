package com.shownext.app

import android.graphics.Bitmap
import android.util.Base64
import android.util.Log
import org.json.JSONObject
import org.json.JSONArray
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL

interface ScreenAnalyzer {
    suspend fun analyze(screenshot: Bitmap, clarification: String? = null): ScreenAnalysis
}

data class ScreenAnalysis(
    val screenSummary: String,
    val nextStep: String,
    val location: String?,
    val confidence: Double,
    val needsClarification: Boolean,
    val warning: String?
)

class FakeScreenAnalyzer : ScreenAnalyzer {
    override suspend fun analyze(screenshot: Bitmap, clarification: String?): ScreenAnalysis = ScreenAnalysis(
        "Android Settings screen", "Tap Display", "middle of the screen", 0.95, false, null
    )
}

class ApiScreenAnalyzer(
    private val endpoint: String,
    private val apiKey: String = ""
) : ScreenAnalyzer {
    override suspend fun analyze(screenshot: Bitmap, clarification: String?): ScreenAnalysis {
        Log.i(TAG, "ANALYZER_REQUEST endpoint=${endpoint.substringBefore('/', endpoint)}")
        val bytes = ByteArrayOutputStream().also { screenshot.compress(Bitmap.CompressFormat.JPEG, 85, it) }.toByteArray()
        val encoded = Base64.encodeToString(bytes, Base64.NO_WRAP)
        val openAi = endpoint.contains("api.openai.com")
        val body = if (openAi) JSONObject().apply {
            put("model", "gpt-4o-mini")
            put("response_format", JSONObject().put("type", "json_object"))
            put("messages", JSONArray().put(JSONObject().apply {
                put("role", "user")
                put("content", JSONArray()
                    .put(JSONObject().put("type", "text").put("text", PROMPT))
                    .put(JSONObject().put("type", "image_url").put("image_url", JSONObject().put("url", "data:image/jpeg;base64,$encoded"))))
            }))
        } else JSONObject().apply {
            put("imageBase64", encoded)
            put("context", clarification ?: "The user is asking what to do next on this Android screen.")
        }.toString()
        val requestBody = body.toString()
        val requestUrl = if (openAi && endpoint.trimEnd('/').endsWith("/v1")) "$endpoint/chat/completions" else endpoint
        val connection = (URL(requestUrl).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 30_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            if (apiKey.isNotBlank()) setRequestProperty("Authorization", "Bearer $apiKey")
        }
        return try {
            connection.outputStream.use { it.write(requestBody.toByteArray(Charsets.UTF_8)) }
            val response = (if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()?.use { it.readText() }.orEmpty()
            Log.i(TAG, "ANALYZER_RESPONSE status=${connection.responseCode} bytes=${response.length}")
            if (connection.responseCode !in 200..299) error("Analyzer request failed with HTTP ${connection.responseCode}")
            val json = JSONObject(response)
            if (openAi) {
                val content = json.getJSONArray("choices").getJSONObject(0).getJSONObject("message").getString("content")
                    .replace("```json", "").replace("```", "").trim()
                parseAnalysis(JSONObject(content))
            } else parseAnalysis(json)
        } catch (error: Exception) {
            Log.e(TAG, "ANALYZER_FAILED ${error.javaClass.simpleName}: ${error.message}")
            throw error
        } finally {
            connection.disconnect()
        }
    }

    private fun parseAnalysis(json: JSONObject): ScreenAnalysis {
        val value = json.optJSONObject("analysis") ?: json
        return ScreenAnalysis(
            value.getString("screenSummary"),
            value.getString("nextStep"),
            value.optString("location").takeIf { it.isNotBlank() && it != "null" },
            value.optDouble("confidence", 0.0),
            value.optBoolean("needsClarification", false),
            value.optString("warning").takeIf { it.isNotBlank() && it != "null" }
        )
    }

    companion object {
        private const val TAG = "ShowNext"
        private const val PROMPT = "You are ShowNext, an assistant for non-technical Android users. Analyze the screenshot and return exactly one safe next action using only visible information. Do not invent controls or provide multiple steps. If uncertain, ask one short clarification question. Do not recommend approving payments, entering OTPs, passwords, PINs, deleting accounts, factory resets, bypassing security warnings, installing unknown APKs, or suspicious permissions. Return valid JSON only with screenSummary, nextStep, location, confidence, needsClarification, and warning."
    }
}
