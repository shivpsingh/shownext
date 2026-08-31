package com.shownext.app.scanner

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo
import com.shownext.app.model.DetectedTarget
import com.shownext.app.model.TargetBounds
import com.shownext.app.model.TargetCandidate

class AccessibilityTargetScanner {
    fun scan(root: AccessibilityNodeInfo?): List<DetectedTarget> {
        if (root == null) return emptyList()
        val candidates = mutableListOf<TargetCandidate>()
        visit(root, candidates)
        return TargetNormalizer.normalize(candidates)
    }

    private fun visit(node: AccessibilityNodeInfo, candidates: MutableList<TargetCandidate>) {
        val bounds = Rect().also(node::getBoundsInScreen)
        val sensitive = node.isPassword || node.isEditable
        val label = if (sensitive) "" else listOfNotNull(node.text?.toString(), node.contentDescription?.toString(), node.hintText?.toString()).firstOrNull { it.isNotBlank() }.orEmpty()
        val role = node.className?.toString()?.substringAfterLast('.') ?: "Control"
        val actionable = !sensitive && (node.isClickable || node.isLongClickable || node.isScrollable || role in setOf("Switch", "CheckBox", "RadioButton", "SeekBar", "Spinner", "Button"))
        candidates += TargetCandidate(label, role, TargetBounds(bounds.left, bounds.top, bounds.right, bounds.bottom), actionable)
        for (index in 0 until node.childCount) node.getChild(index)?.let { child -> visit(child, candidates) }
    }
}
