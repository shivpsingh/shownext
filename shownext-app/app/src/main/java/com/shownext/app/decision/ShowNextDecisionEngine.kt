package com.shownext.app.decision

class ShowNextDecisionEngine {
    fun choose(goal: String, currentPackage: String, elements: List<UiElement>): DecisionResult {
        if (goal.isBlank() || isUnsafeGoal(goal)) return uncertain()
        val candidates = elements.filter { it.clickable && it.enabled && !isSensitiveElement(it) }
        if (candidates.isEmpty()) return uncertain()

        val goalWords = intentWords(goal)
        val scored = candidates.map { element -> element to score(goalWords, element) }.sortedByDescending { it.second }
        val best = scored.first()
        val second = scored.getOrNull(1)?.second ?: 0.0
        val confidence = confidence(best.second, second, goalWords, currentPackage)
        if (confidence < MIN_CONFIDENCE || best.second <= 0.0) return uncertain()
        return DecisionResult(best.first.id, "Tap ${labelOf(best.first)}", confidence)
    }

    private fun score(goalWords: Set<String>, element: UiElement): Double {
        val labelWords = normalizedWords(listOfNotNull(element.text, element.contentDescription).joinToString(" "))
        if (labelWords.isEmpty()) return 0.0
        val overlap = goalWords.intersect(labelWords).size.toDouble()
        val phraseBonus = if (goalWords.any { it in labelWords }) 0.20 else 0.0
        val roleBonus = roleScore(goalWords, element.className, labelWords)
        return overlap + phraseBonus + roleBonus
    }

    private fun roleScore(goalWords: Set<String>, className: String?, labelWords: Set<String>): Double {
        val role = className.orEmpty().lowercase()
        val settingsGoal = goalWords.any { it in setOf("bigger", "smaller", "size", "large", "text", "font") }
        return when {
            settingsGoal && "display" in labelWords -> 0.80
            goalWords.any { it in setOf("install", "download", "app") } && role.contains("button") -> 0.15
            else -> 0.0
        }
    }

    private fun confidence(best: Double, second: Double, goalWords: Set<String>, currentPackage: String): Double {
        val margin = (best - second).coerceAtLeast(0.0)
        val base = when {
            best >= 1.8 && margin >= 1.5 -> 0.96
            best >= 1.8 && margin >= 0.5 -> 0.88
            best >= 1.0 && margin >= 0.25 -> 0.78
            else -> 0.55
        }
        return if (currentPackage.isBlank() || goalWords.isEmpty()) (base - 0.05).coerceAtLeast(0.0) else base
    }

    private fun labelOf(element: UiElement): String = listOfNotNull(element.text, element.contentDescription).firstOrNull { it.isNotBlank() }?.trim()?.take(48) ?: "this option"
    private fun normalizedWords(value: String): Set<String> = value.lowercase().split(WORD_SPLIT).map { it.trim() }.filter { it.length > 1 && it !in STOP_WORDS }.toSet()
    private fun intentWords(goal: String): Set<String> = normalizedWords(goal).toMutableSet().apply {
        if (contains("text") || contains("font") || contains("bigger") || contains("smaller") || contains("size")) add("display")
        if (contains("download") || contains("install") || contains("add")) add("install")
    }
    private fun isSensitiveElement(element: UiElement): Boolean { val value = listOfNotNull(element.text, element.contentDescription, element.className).joinToString(" ").lowercase(); return value.contains("password") || value.contains("otp") || value.contains("verification code") || value.contains("payment") || value.contains("delete account") || value.contains("factory reset") }
    private fun isUnsafeGoal(goal: String): Boolean { val value = goal.lowercase(); return UNSAFE_GOAL_PATTERNS.any { value.contains(it) } }
    private fun uncertain() = DecisionResult(null, "I’m not sure what to tap on this screen.", 0.42)

    companion object {
        private const val MIN_CONFIDENCE = 0.75
        private val WORD_SPLIT = Regex("[^a-z0-9]+")
        private val STOP_WORDS = setOf("the", "a", "an", "to", "on", "in", "my", "me", "is", "how", "do", "i", "want", "please", "can", "with", "for")
        private val UNSAFE_GOAL_PATTERNS = setOf("password", "passcode", "otp", "verification code", "one-time code", "pay ", "payment", "send money", "transfer money", "delete account", "factory reset", "bypass security", "ignore security warning")
    }
}
