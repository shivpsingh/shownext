package com.shownext.app.model

import android.graphics.Rect

data class DetectedTarget(
    val id: Int,
    val label: String,
    val role: String,
    val bounds: Rect,
)

data class TargetCandidate(val label: String, val role: String, val bounds: Rect, val actionable: Boolean)
