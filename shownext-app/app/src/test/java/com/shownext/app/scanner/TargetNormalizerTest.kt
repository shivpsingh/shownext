package com.shownext.app.scanner

import com.shownext.app.model.TargetCandidate
import com.shownext.app.model.TargetBounds
import org.junit.Assert.assertEquals
import org.junit.Test

class TargetNormalizerTest {
    @Test fun keepsLabeledActionableControls() {
        val result = TargetNormalizer.normalize(listOf(TargetCandidate("Install", "Button", TargetBounds(0, 0, 100, 60), true), TargetCandidate("Heading", "TextView", TargetBounds(0, 70, 100, 110), false)))
        assertEquals(listOf("Install"), result.map { it.label })
    }

    @Test fun removesExactDuplicatesAndUnusableTargets() {
        val bounds = TargetBounds(0, 0, 100, 60)
        val result = TargetNormalizer.normalize(listOf(TargetCandidate("Install", "Button", bounds, true), TargetCandidate(" install ", "Button", bounds, true), TargetCandidate("", "Button", TargetBounds(0, 0, 0, 0), true)))
        assertEquals(1, result.size)
        assertEquals("Install", result.single().label)
    }
}
