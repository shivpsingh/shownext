package com.shownext.app.decision

data class UiElement(
    val id: Int,
    val text: String? = null,
    val contentDescription: String? = null,
    val className: String? = null,
    val clickable: Boolean = false,
    val enabled: Boolean = false,
)

data class DecisionResult(
    val elementId: Int?,
    val instruction: String,
    val confidence: Double,
) {
    fun toJson(): String {
        val id = elementId?.toString() ?: "null"
        return "{\"elementId\":$id,\"instruction\":\"${instruction.jsonEscaped()}\",\"confidence\":${"%.2f".format(java.util.Locale.US, confidence)}}"
    }
}

private fun String.jsonEscaped(): String = replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r")
