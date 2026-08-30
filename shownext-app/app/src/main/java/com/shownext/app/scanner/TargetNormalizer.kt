package com.shownext.app.scanner

import com.shownext.app.model.DetectedTarget
import com.shownext.app.model.TargetBounds
import com.shownext.app.model.TargetCandidate

object TargetNormalizer {
    fun normalize(candidates: List<TargetCandidate>): List<DetectedTarget> {
        val result = mutableListOf<DetectedTarget>()
        val seen = mutableSetOf<String>()
        candidates.filter { it.actionable && it.label.isNotBlank() && !it.bounds.isEmpty }.forEach { candidate ->
            val key = "${candidate.label.trim().lowercase()}|${candidate.bounds.left},${candidate.bounds.top},${candidate.bounds.right},${candidate.bounds.bottom}"
            if (seen.add(key)) result += DetectedTarget(result.size, candidate.label.trim(), candidate.role, candidate.bounds.asRect())
        }
        return result
    }
}
