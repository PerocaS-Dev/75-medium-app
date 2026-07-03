package com.medium75.service

import com.medium75.model.StateChangeReason

data class StreakState(
    val currentStreak: Int,
    val personalBestDays: Int,
    val missBufferRemaining: Int,
    val lastStateChangeReason: StateChangeReason? = null
)

object StreakEngine {

    fun currentTier(streak: Int): Int = when {
        streak < 21  -> 1
        streak < 40  -> 2
        streak < 65  -> 3
        else         -> 4
    }

    fun freshBufferFor(tier: Int): Int = when (tier) {
        1    -> 0
        2, 3 -> 3
        4    -> 1
        else -> 0
    }

    fun applyDay(state: StreakState, met: Boolean): StreakState {
        val tier = currentTier(state.currentStreak)
        return if (met) {
            val newStreak = state.currentStreak + 1
            val newTier   = currentTier(newStreak)
            val newBuffer = if (newTier != tier) freshBufferFor(newTier) else state.missBufferRemaining
            StreakState(newStreak, maxOf(state.personalBestDays, newStreak), newBuffer, StateChangeReason.MET)
        } else {
            if (state.missBufferRemaining > 0) {
                state.copy(
                    missBufferRemaining     = state.missBufferRemaining - 1,
                    lastStateChangeReason   = StateChangeReason.MISS_WITHIN_BUFFER
                )
            } else {
                val (fallback, reason) = when (tier) {
                    3    -> Pair(20, StateChangeReason.FELL_BACK_TO_20)
                    4    -> Pair(40, StateChangeReason.FELL_BACK_TO_40)
                    else -> Pair(0,  StateChangeReason.RESET_TO_0)
                }
                val newTier = currentTier(fallback)
                StreakState(fallback, state.personalBestDays, freshBufferFor(newTier), reason)
            }
        }
    }
}
