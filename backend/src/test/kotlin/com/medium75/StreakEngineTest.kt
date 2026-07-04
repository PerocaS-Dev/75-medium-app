package com.medium75

import com.medium75.model.StateChangeReason
import com.medium75.service.StreakEngine
import com.medium75.service.StreakState
import kotlin.test.Test
import kotlin.test.assertEquals

class StreakEngineTest {

    private fun fresh() = StreakState(0, 0, 0)

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun applyDays(state: StreakState, days: List<Boolean>): StreakState =
        days.fold(state) { s, met -> StreakEngine.applyDay(s, met) }

    private fun allMet(n: Int) = List(n) { true }

    // ── tier detection ───────────────────────────────────────────────────────

    @Test fun `tier boundaries`() {
        assertEquals(1, StreakEngine.currentTier(0))
        assertEquals(1, StreakEngine.currentTier(20))
        assertEquals(2, StreakEngine.currentTier(21))
        assertEquals(2, StreakEngine.currentTier(39))
        assertEquals(3, StreakEngine.currentTier(40))
        assertEquals(3, StreakEngine.currentTier(64))
        assertEquals(4, StreakEngine.currentTier(65))
        assertEquals(4, StreakEngine.currentTier(75))
    }

    // ── perfect run ──────────────────────────────────────────────────────────

    @Test fun `perfect 75-day run reaches day 75`() {
        val result = applyDays(fresh(), allMet(75))
        assertEquals(75, result.currentStreak)
        assertEquals(75, result.bestStreak)
        assertEquals(StateChangeReason.MET, result.lastStateChangeReason)
    }

    // ── tier 1 (zero tolerance) ──────────────────────────────────────────────

    @Test fun `tier 1 miss resets to 0`() {
        val at10 = applyDays(fresh(), allMet(10))
        val result = StreakEngine.applyDay(at10, false)
        assertEquals(0, result.currentStreak)
        assertEquals(StateChangeReason.RESET_TO_0, result.lastStateChangeReason)
    }

    @Test fun `personal best survives tier 1 reset`() {
        val at15 = applyDays(fresh(), allMet(15))
        val result = StreakEngine.applyDay(at15, false)
        assertEquals(15, result.bestStreak)
        assertEquals(0, result.currentStreak)
    }

    // ── tier 2 buffer ────────────────────────────────────────────────────────

    @Test fun `entering tier 2 grants buffer of 3`() {
        val at21 = applyDays(fresh(), allMet(21))
        assertEquals(2, StreakEngine.currentTier(21))
        assertEquals(3, at21.missBufferRemaining)
    }

    @Test fun `tier 2 buffer absorbs 3 misses, 4th resets to 0`() {
        var s = applyDays(fresh(), allMet(21))
        assertEquals(3, s.missBufferRemaining)

        s = StreakEngine.applyDay(s, false)
        assertEquals(StateChangeReason.MISS_WITHIN_BUFFER, s.lastStateChangeReason)
        assertEquals(2, s.missBufferRemaining)
        assertEquals(21, s.currentStreak)

        s = StreakEngine.applyDay(s, false)
        assertEquals(1, s.missBufferRemaining)

        s = StreakEngine.applyDay(s, false)
        assertEquals(0, s.missBufferRemaining)

        // 4th miss — buffer exhausted → reset
        s = StreakEngine.applyDay(s, false)
        assertEquals(0, s.currentStreak)
        assertEquals(StateChangeReason.RESET_TO_0, s.lastStateChangeReason)
    }

    @Test fun `unused tier 2 buffer does not carry into tier 3`() {
        // reach tier 2 with 1 miss used (2 remaining), then advance to tier 3
        var s = applyDays(fresh(), allMet(21))
        s = StreakEngine.applyDay(s, false)    // use 1 buffer slot
        assertEquals(2, s.missBufferRemaining)
        s = applyDays(s, allMet(19))           // advance to day 40 → tier 3
        assertEquals(3, StreakEngine.currentTier(s.currentStreak))
        assertEquals(3, s.missBufferRemaining) // fresh buffer for tier 3, not carried-over 2
    }

    // ── tier 3 fall-back ─────────────────────────────────────────────────────

    @Test fun `tier 3 buffer exhausted falls back to day 20`() {
        var s = applyDays(fresh(), allMet(40))
        assertEquals(3, s.missBufferRemaining)
        repeat(3) { s = StreakEngine.applyDay(s, false) } // use all 3
        s = StreakEngine.applyDay(s, false)               // 4th miss → fall-back
        assertEquals(20, s.currentStreak)
        assertEquals(StateChangeReason.FELL_BACK_TO_20, s.lastStateChangeReason)
        assertEquals(0, s.missBufferRemaining)            // now in tier 1
    }

    @Test fun `personal best survives tier 3 fall-back`() {
        var s = applyDays(fresh(), allMet(55))
        val pb = s.bestStreak
        repeat(4) { s = StreakEngine.applyDay(s, false) }
        assertEquals(pb, s.bestStreak)
        assertEquals(20, s.currentStreak)
    }

    // ── tier 4 fall-back ─────────────────────────────────────────────────────

    @Test fun `entering tier 4 grants buffer of 1`() {
        val at65 = applyDays(fresh(), allMet(65))
        assertEquals(4, StreakEngine.currentTier(65))
        assertEquals(1, at65.missBufferRemaining)
    }

    @Test fun `tier 4 buffer absorbs 1 miss, 2nd falls back to day 40`() {
        var s = applyDays(fresh(), allMet(65))
        s = StreakEngine.applyDay(s, false)
        assertEquals(StateChangeReason.MISS_WITHIN_BUFFER, s.lastStateChangeReason)
        assertEquals(65, s.currentStreak)

        s = StreakEngine.applyDay(s, false)
        assertEquals(40, s.currentStreak)
        assertEquals(StateChangeReason.FELL_BACK_TO_40, s.lastStateChangeReason)
        assertEquals(3, s.missBufferRemaining) // now in tier 3 → fresh buffer
    }

    // ── recursive fall-back ──────────────────────────────────────────────────

    @Test fun `recursive fall-back tier4 to tier3 to tier1`() {
        // Reach tier 4, fall back to 40, then exhaust tier 3 buffer to fall to 20
        var s = applyDays(fresh(), allMet(65))
        repeat(2) { s = StreakEngine.applyDay(s, false) }
        assertEquals(40, s.currentStreak)
        assertEquals(3, s.missBufferRemaining)

        repeat(4) { s = StreakEngine.applyDay(s, false) }
        assertEquals(20, s.currentStreak)
        assertEquals(StateChangeReason.FELL_BACK_TO_20, s.lastStateChangeReason)
        assertEquals(0, s.missBufferRemaining) // tier 1 — zero tolerance again
    }

    // ── met days after fall-back re-enter tier correctly ─────────────────────

    @Test fun `after fall-back to day 20, day 21 grants tier 2 buffer`() {
        var s = applyDays(fresh(), allMet(40))
        repeat(4) { s = StreakEngine.applyDay(s, false) } // fall back to 20
        assertEquals(20, s.currentStreak)

        s = StreakEngine.applyDay(s, true) // day 21 → crosses into tier 2
        assertEquals(21, s.currentStreak)
        assertEquals(3, s.missBufferRemaining)
        assertEquals(StateChangeReason.MET, s.lastStateChangeReason)
    }

    // ── full 75-day run with buffer usage ────────────────────────────────────

    @Test fun `complete run with one miss per tier, all absorbed`() {
        var s = fresh()
        s = applyDays(s, allMet(21))        // enter tier 2 (0→21)
        s = StreakEngine.applyDay(s, false) // use 1 of 3 buffer
        s = applyDays(s, allMet(19))        // 21→40, enter tier 3 (fresh buffer)
        s = StreakEngine.applyDay(s, false) // use 1 of 3 buffer
        s = applyDays(s, allMet(25))        // 40→65, enter tier 4 (fresh buffer 1)
        s = StreakEngine.applyDay(s, false) // use 1 of 1 buffer
        s = applyDays(s, allMet(10))        // 65→75
        assertEquals(75, s.currentStreak)
        assertEquals(75, s.bestStreak)
    }
}
