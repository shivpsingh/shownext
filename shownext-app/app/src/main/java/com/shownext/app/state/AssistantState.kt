package com.shownext.app.state

sealed interface AssistantState {
    data object Disabled : AssistantState
    data object Paused : AssistantState
    data object Ready : AssistantState
    data object PanelOpen : AssistantState
    data class Highlighting(val targetId: Int) : AssistantState
}

object AssistantStateMachine {
    fun onServiceConnected(paused: Boolean): AssistantState = if (paused) AssistantState.Paused else AssistantState.Ready
    fun openPanel(state: AssistantState): AssistantState = if (state == AssistantState.Ready || state is AssistantState.Highlighting) AssistantState.PanelOpen else state
    fun highlight(state: AssistantState, targetId: Int): AssistantState = if (state == AssistantState.PanelOpen) AssistantState.Highlighting(targetId) else state
    fun onScreenChanged(state: AssistantState): AssistantState = if (state is AssistantState.Highlighting) AssistantState.Ready else state
}
