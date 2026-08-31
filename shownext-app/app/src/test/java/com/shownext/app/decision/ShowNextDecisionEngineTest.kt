package com.shownext.app.decision

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ShowNextDecisionEngineTest {
    private val engine = ShowNextDecisionEngine()

    @Test fun choosesDisplayForTextSizeGoal() {
        val result = engine.choose("Make the text bigger", "com.android.settings", listOf(
            UiElement(1, text = "Network & internet", clickable = true, enabled = true),
            UiElement(4, text = "Display", clickable = true, enabled = true),
        ))
        assertEquals(4, result.elementId)
        assertEquals("Tap Display", result.instruction)
        assertTrue(result.confidence >= .75)
    }

    @Test fun ignoresDisabledAndNonClickableElements() {
        val result = engine.choose("open apps", "com.android.settings", listOf(UiElement(1, text = "Apps", clickable = false, enabled = true), UiElement(2, text = "Apps", clickable = true, enabled = false)))
        assertNull(result.elementId)
    }

    @Test fun refusesSensitiveGoals() {
        val result = engine.choose("Enter my password", "com.android.settings", listOf(UiElement(8, text = "Password", clickable = true, enabled = true)))
        assertNull(result.elementId)
        assertEquals(0.42, result.confidence, 0.001)
    }

    @Test fun refusesLowConfidenceGuess() {
        val result = engine.choose("do something", "com.example.app", listOf(UiElement(2, text = "Continue", clickable = true, enabled = true), UiElement(3, text = "Cancel", clickable = true, enabled = true)))
        assertNull(result.elementId)
    }

    @Test fun outputIsValidSingleActionJson() {
        val json = engine.choose("make the text bigger", "com.android.settings", listOf(UiElement(4, text = "Display", clickable = true, enabled = true))).toJson()
        assertEquals("{\"elementId\":4,\"instruction\":\"Tap Display\",\"confidence\":0.96}", json)
    }
}
