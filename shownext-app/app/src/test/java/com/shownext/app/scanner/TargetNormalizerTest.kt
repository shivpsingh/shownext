package com.shownext.app.scanner

import android.graphics.Rect
import com.shownext.app.model.TargetCandidate
import org.junit.Assert.assertEquals
import org.junit.Test

class TargetNormalizerTest {
    @Test fun keepsLabeledActionableControls() {
        val result = TargetNormalizer.normalize(listOf(TargetCandidate("Install", "Button", Rect(0, 0, 100, 60), true), TargetCandidate("Heading", "TextView", Rect(0, 70, 100, 110), false)))
        assertEquals(listOf("Install"), result.map { it.label })
    }

    @Test fun removesExactDuplicatesAndUnusableTargets() {
        val bounds = Rect(0, 0, 100, 60)
        val result = TargetNormalizer.normalize(listOf(TargetCandidate("Install", "Button", bounds, true), TargetCandidate(" install ", "Button", bounds, true), TargetCandidate("", "Button", Rect(), true)))
        assertEquals(1, result.size)
        assertEquals("Install", result.single().label)
    }
}
