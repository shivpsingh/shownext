package com.shownext.app.model

import android.graphics.Rect

data class DetectedTarget(
    val id: Int,
    val label: String,
    val role: String,
    val bounds: Rect,
)

data class TargetBounds(val left: Int, val top: Int, val right: Int, val bottom: Int) {
    val isEmpty get() = left >= right || top >= bottom
    fun asRect() = Rect(left, top, right, bottom)
}

data class TargetCandidate(val label: String, val role: String, val bounds: TargetBounds, val actionable: Boolean)
