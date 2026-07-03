package com.medium75.scheduler

import com.medium75.service.DailyCloseService
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class DailyCloseScheduler(private val dailyCloseService: DailyCloseService) {

    @Scheduled(fixedRate = 60_000)
    fun run() {
        dailyCloseService.closeAllActiveChallenges()
    }
}
