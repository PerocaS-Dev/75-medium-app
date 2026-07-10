package com.medium75.seed

import com.medium75.model.*
import com.medium75.repository.ChallengeRepository
import com.medium75.repository.DailyLogRepository
import com.medium75.repository.FriendshipRepository
import com.medium75.repository.JournalEntryRepository
import com.medium75.repository.PhotoRepository
import com.medium75.repository.ReactionRepository
import com.medium75.repository.TaskDefinitionRepository
import com.medium75.repository.UserRepository
import com.medium75.service.StreakEngine
import com.medium75.service.StreakState
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Profile
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Component
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Component
@Profile("!prod")
@ConditionalOnProperty(name = ["seed.enabled"], havingValue = "true")
class SeedRunner(
    private val userRepo: UserRepository,
    private val challengeRepo: ChallengeRepository,
    private val taskDefRepo: TaskDefinitionRepository,
    private val dailyLogRepo: DailyLogRepository,
    private val friendshipRepo: FriendshipRepository,
    private val journalRepo: JournalEntryRepository,
    private val photoRepo: PhotoRepository,
    private val reactionRepo: ReactionRepository,
    private val jdbc: JdbcTemplate,
    @Value("\${PGHOST:localhost}") private val pgHost: String,
    @Value("\${seed.main-user-email:}") private val mainUserEmail: String,
) : ApplicationRunner {

    private val bcrypt = BCryptPasswordEncoder()
    private val SEED_EMAIL_SUFFIX = "@75medium.test"
    private val today = LocalDate.now()

    data class ScenarioUser(
        val slug: String,
        val displayName: String,
        val tasks: List<String>,
        val outcomes: List<Boolean>,   // true = met, false = missed; length = days simulated
        val friendMain: Boolean = false,
        val friendPeers: Boolean = false,
    )

    private val scenarios = listOf(
        // 1. Clean runner — day 60, no misses
        ScenarioUser(
            slug = "alex",
            displayName = "Alex Chen",
            tasks = listOf("75-min workout", "Read 10 pages", "No alcohol", "Drink 1 gal water"),
            outcomes = List(60) { true },
            friendMain = true, friendPeers = true,
        ),
        // 2. Mid-buffer tier 2 — 21 MET (enters T2 with buffer 3), 2 misses (buffer → 1), 7 MET → streak 28, buffer 1
        ScenarioUser(
            slug = "blake",
            displayName = "Blake Rivera",
            tasks = listOf("Morning run", "Cold shower", "No junk food"),
            outcomes = List(21) { true } + listOf(false, false) + List(7) { true },
            friendMain = false, friendPeers = true,
        ),
        // 3. Mid-buffer tier 3 — 40 MET, 2 misses, 10 MET → streak 50, buffer 1
        ScenarioUser(
            slug = "casey",
            displayName = "Casey O'Brien",
            tasks = listOf("Gym session", "Journaling", "No sugar"),
            outcomes = List(40) { true } + listOf(false, false) + List(10) { true },
            friendMain = false, friendPeers = true,
        ),
        // 4. Fell back T4→40 — 65 MET, 1 miss (buffer spent), 1 miss (falls to 40), 3 MET → streak 43
        ScenarioUser(
            slug = "dana",
            displayName = "Dana Mokoena",
            tasks = listOf("45-min cardio", "Meditate", "No alcohol", "Diet"),
            outcomes = List(65) { true } + listOf(false, false) + List(3) { true },
            friendMain = true, friendPeers = true,
        ),
        // 5. Fell back T3→20 — 40 MET, 3 misses (buffer exhausted → falls to 20), 5 MET → streak 25
        ScenarioUser(
            slug = "evan",
            displayName = "Evan Patel",
            tasks = listOf("Morning walk", "Read 20 pages"),
            outcomes = List(40) { true } + listOf(false, false, false, false) + List(5) { true },
            friendMain = false, friendPeers = true,
        ),
        // 6. T1 reset to 0, rebuilding — 12 MET, 1 miss (reset), 8 MET → streak 8
        ScenarioUser(
            slug = "fiona",
            displayName = "Fiona Nakamura",
            tasks = listOf("Workout", "Healthy eating", "Sleep by 10pm"),
            outcomes = List(12) { true } + listOf(false) + List(8) { true },
            friendMain = true, friendPeers = false,
        ),
        // 7. T4, buffer 1 intact — 68 straight MET
        ScenarioUser(
            slug = "grace",
            displayName = "Grace Okonkwo",
            tasks = listOf("Strength training", "No processed food", "Read 10 pages", "2L water"),
            outcomes = List(68) { true },
            friendMain = true, friendPeers = false,
        ),
        // 8. T4, buffer spent — 65 MET, 1 miss, 5 MET → streak 70, buffer 0
        ScenarioUser(
            slug = "hiro",
            displayName = "Hiro Santos",
            tasks = listOf("Run 5k", "Journaling", "No alcohol"),
            outcomes = List(65) { true } + listOf(false) + List(5) { true },
            friendMain = false, friendPeers = false,
        ),
        // 9. Completed — 75 straight MET
        ScenarioUser(
            slug = "iris",
            displayName = "Iris Volkov",
            tasks = listOf("90-min workout", "Read 10 pages", "Diet", "No alcohol", "2L water"),
            outcomes = List(75) { true },
            friendMain = true, friendPeers = false,
        ),
        // 10. Early, clean — 15 MET
        ScenarioUser(
            slug = "jordan",
            displayName = "Jordan Kim",
            tasks = listOf("Morning yoga", "Healthy meals"),
            outcomes = List(15) { true },
            friendMain = false, friendPeers = false,
        ),
    )

    // ── Journal + photo content ────────────────────────────────────────────────
    // audience FRIENDS = public-to-circle (shows in friends' feeds);
    // audience SELF = private (must never appear in a friend's feed).

    data class SeedJournal(
        val audience: AudienceType,
        val hoursAgo: Long,
        val body: String,
        val likes: Int = 0,      // reactions from other seed users
        val comments: Int = 0,   // of those likes, how many carry a reply
    )

    data class SeedPhoto(
        val audience: AudienceType,
        val hoursAgo: Long,
        val caption: String? = null,
    )

    data class SeedContent(
        val journals: List<SeedJournal> = emptyList(),
        val photos: List<SeedPhoto> = emptyList(),
    )

    private val F = AudienceType.FRIENDS
    private val S = AudienceType.SELF

    private val content: Map<String, SeedContent> = mapOf(
        "alex" to SeedContent(
            journals = listOf(
                SeedJournal(F, 5, "Day 60. The 5am alarm barely registers anymore — it's just what mornings are now.", likes = 7, comments = 3),
                SeedJournal(F, 30, "Two months in. Started this to lose weight; staying for who it's making me.", likes = 5, comments = 1),
                SeedJournal(S, 12, "Private: knee twinged on the run today. Watch it, don't be a hero."),
            ),
            photos = listOf(
                SeedPhoto(F, 6, "Sunrise from the trail"),
                SeedPhoto(S, 20, "Progress photo — week 8"),
            ),
        ),
        "blake" to SeedContent(
            journals = listOf(
                SeedJournal(F, 2, "Cold shower still hurts every single morning. Doing it anyway.", likes = 4, comments = 2),
                SeedJournal(S, 40, "Private: the two misses last week still bug me. Buffer saved me though."),
            ),
            photos = listOf(SeedPhoto(F, 3, "Post-run, legs jelly")),
        ),
        "casey" to SeedContent(
            journals = listOf(
                SeedJournal(F, 8, "Fifty days. The journaling task is the one I almost skipped — now it's the one I need most.", likes = 6, comments = 1),
                SeedJournal(S, 26, "Private: sugar cravings brutal today. Won."),
            ),
            photos = listOf(SeedPhoto(F, 9, null)),
        ),
        "dana" to SeedContent(
            journals = listOf(
                SeedJournal(F, 4, "Fell back to 40 and I'm not going to pretend it didn't sting. Back on the horse.", likes = 8, comments = 4),
                SeedJournal(F, 48, "The meditation minutes are the quietest part of my day now.", likes = 3),
                SeedJournal(S, 15, "Private: honestly considered quitting Tuesday. Didn't tell anyone. Glad I stayed."),
            ),
            photos = listOf(
                SeedPhoto(F, 5, "Cardio done before sunrise"),
                SeedPhoto(S, 30, "Private progress shot"),
            ),
        ),
        "evan" to SeedContent(
            journals = listOf(
                SeedJournal(F, 10, "Reset to 20 after a rough patch. Twenty is still twenty more than zero.", likes = 5, comments = 2),
                SeedJournal(S, 22, "Private: the walks are keeping my head straight more than my body."),
            ),
            photos = listOf(SeedPhoto(F, 11, "Morning walk")),
        ),
        "fiona" to SeedContent(
            journals = listOf(
                SeedJournal(F, 3, "Rebuilding from day 8 after a reset. No shame in the restart.", likes = 6, comments = 2),
                SeedJournal(S, 18, "Private: sleep-by-10 is the hardest task by far."),
            ),
            photos = listOf(
                SeedPhoto(F, 7, "Back at it"),
                SeedPhoto(S, 26, "Private — kitchen prep"),
            ),
        ),
        "grace" to SeedContent(
            journals = listOf(
                SeedJournal(F, 6, "Day 68. Buffer still untouched. Tier 4 feels different — every day counts double now.", likes = 9, comments = 3),
                SeedJournal(F, 50, "Strength numbers up across the board. The consistency compounds.", likes = 4, comments = 1),
                SeedJournal(S, 14, "Private: nervous about the last stretch. Don't want to blow it now."),
            ),
            photos = listOf(
                SeedPhoto(F, 4, "Lift day"),
                SeedPhoto(S, 28, "Progress — week 9"),
            ),
        ),
        "hiro" to SeedContent(
            journals = listOf(
                SeedJournal(F, 16, "Day 70. Spent my one buffer and it's zero-tolerance from here.", likes = 5, comments = 1),
                SeedJournal(S, 34, "Private: 5k time dropped again. Keeping that to myself for now."),
            ),
            photos = listOf(SeedPhoto(F, 17, "5k done")),
        ),
        "iris" to SeedContent(
            journals = listOf(
                SeedJournal(F, 1, "Seventy-five. Done. It didn't fix everything — it fixed the part that decides whether I show up.", likes = 12, comments = 5),
                SeedJournal(S, 20, "Private: cried a little finishing this. Won't put that in the public one."),
            ),
            photos = listOf(
                SeedPhoto(F, 2, "Day 75 — finished"),
                SeedPhoto(S, 24, "Private — the whole journey"),
            ),
        ),
        "jordan" to SeedContent(
            journals = listOf(
                SeedJournal(F, 9, "Two weeks in. Still figuring out the rhythm but showing up.", likes = 3),
                SeedJournal(S, 28, "Private: yoga at dawn is not my natural state. Growing though."),
            ),
            photos = listOf(SeedPhoto(F, 10, "Morning flow")),
        ),
    )

    // Collected during seeding, resolved after all users exist.
    private data class ReactionTarget(val entryId: UUID, val authorId: UUID, val likes: Int, val comments: Int)
    private val reactionTargets = mutableListOf<ReactionTarget>()
    private val seededUserIds = mutableListOf<UUID>()
    private var journalCount = 0
    private var photoCount = 0

    override fun run(args: ApplicationArguments) {
        guardAgainstProd()

        println("\n════════════════════════════════════════════════════════")
        println("  75 Medium — Seed Runner")
        println("════════════════════════════════════════════════════════")

        clearExistingSeeds()

        val seededUsers = mutableListOf<Pair<ScenarioUser, User>>()
        val finalStates = mutableListOf<Triple<ScenarioUser, User, StreakState>>()

        for (scenario in scenarios) {
            val (user, finalState) = seedUser(scenario)
            seededUsers.add(scenario to user)
            finalStates.add(Triple(scenario, user, finalState))
            println("  ✓ Seeded ${scenario.displayName}")
        }

        wireUpFriendships(seededUsers)
        seedReactions()

        println("  Seeded $journalCount journal entries and $photoCount photos (public + private)")

        printSummaryTable(finalStates)
        println("════════════════════════════════════════════════════════\n")
    }

    private fun guardAgainstProd() {
        val host = pgHost.lowercase()
        if (host != "localhost" && host != "127.0.0.1" && !host.startsWith("::1")) {
            error("SeedRunner: PGHOST='$pgHost' does not look like localhost. Refusing to seed a non-local database.")
        }
    }

    private fun clearExistingSeeds() {
        val count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE email LIKE ?", Int::class.java, "%$SEED_EMAIL_SUFFIX"
        ) ?: 0
        if (count == 0) return

        // Delete in FK-safe order via raw SQL.
        // Reactions first — both those authored by seed users and those on seed users' entries.
        jdbc.update("""
            DELETE FROM reactions
            WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)
               OR journal_entry_id IN (
                    SELECT e.id FROM journal_entries e
                    JOIN users u ON u.id = e.user_id
                    WHERE u.email LIKE ?
               )
        """, "%$SEED_EMAIL_SUFFIX", "%$SEED_EMAIL_SUFFIX")

        jdbc.update("""
            DELETE FROM journal_entries
            WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)
        """, "%$SEED_EMAIL_SUFFIX")

        jdbc.update("""
            DELETE FROM photos
            WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)
        """, "%$SEED_EMAIL_SUFFIX")

        jdbc.update("""
            DELETE FROM daily_task_checks
            WHERE daily_log_id IN (
                SELECT dl.id FROM daily_logs dl
                JOIN challenges c ON c.id = dl.challenge_id
                JOIN users u ON u.id = c.user_id
                WHERE u.email LIKE ?
            )
        """, "%$SEED_EMAIL_SUFFIX")

        jdbc.update("""
            DELETE FROM daily_logs
            WHERE challenge_id IN (
                SELECT c.id FROM challenges c
                JOIN users u ON u.id = c.user_id
                WHERE u.email LIKE ?
            )
        """, "%$SEED_EMAIL_SUFFIX")

        jdbc.update("""
            DELETE FROM task_definitions
            WHERE challenge_id IN (
                SELECT c.id FROM challenges c
                JOIN users u ON u.id = c.user_id
                WHERE u.email LIKE ?
            )
        """, "%$SEED_EMAIL_SUFFIX")

        jdbc.update("""
            DELETE FROM challenges
            WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)
        """, "%$SEED_EMAIL_SUFFIX")

        jdbc.update("""
            DELETE FROM friendships
            WHERE requester_id IN (SELECT id FROM users WHERE email LIKE ?)
               OR addressee_id  IN (SELECT id FROM users WHERE email LIKE ?)
        """, "%$SEED_EMAIL_SUFFIX", "%$SEED_EMAIL_SUFFIX")

        jdbc.update("DELETE FROM users WHERE email LIKE ?", "%$SEED_EMAIL_SUFFIX")

        println("  Cleared $count existing seed user(s)")
    }

    private fun seedUser(scenario: ScenarioUser): Pair<User, StreakState> {
        val numDays = scenario.outcomes.size
        val startDate = today.minusDays(numDays.toLong())

        val user = userRepo.save(User(
            email        = "seed+${scenario.slug}$SEED_EMAIL_SUFFIX",
            passwordHash = bcrypt.encode("seed1234")!!,
            displayName  = scenario.displayName,
            timeZone     = "UTC",
            popiaConsentAt = Instant.now().minusSeconds(86400L * numDays),
        ))

        val challenge = challengeRepo.save(Challenge(
            userId    = user.id,
            startDate = startDate,
            status    = ChallengeStatus.ACTIVE,
        ))

        val tasks = scenario.tasks.mapIndexed { i, label ->
            taskDefRepo.save(TaskDefinition(
                challengeId = challenge.id,
                label       = label,
                sortOrder   = i,
                locked      = true,
            ))
        }
        val taskCount = tasks.size

        // Drive the engine day by day
        var state = StreakState(currentStreak = 0, bestStreak = 0, missBufferRemaining = 0)
        for ((i, met) in scenario.outcomes.withIndex()) {
            val logDate = startDate.plusDays(i.toLong())
            dailyLogRepo.save(DailyLog(
                challengeId          = challenge.id,
                logDate              = logDate,
                status               = if (met) DailyLogStatus.MET else DailyLogStatus.NOT_MET,
                tasksCompletedCount  = if (met) taskCount else 0,
                tasksTotalCount      = taskCount,
            ))
            state = StreakEngine.applyDay(state, met)
        }

        // Persist final state back to the challenge row
        challenge.currentStreak       = state.currentStreak
        challenge.bestStreak          = state.bestStreak
        challenge.missBufferRemaining = state.missBufferRemaining
        challenge.lastStateChangeReason = state.lastStateChangeReason
        challenge.updatedAt           = Instant.now()
        if (state.currentStreak >= 75) challenge.status = ChallengeStatus.COMPLETED
        challengeRepo.save(challenge)

        seedContentFor(scenario.slug, user.id)
        seededUserIds.add(user.id)

        return user to state
    }

    private fun seedContentFor(slug: String, userId: UUID) {
        val c = content[slug] ?: return

        for (j in c.journals) {
            val ts = Instant.now().minusSeconds(j.hoursAgo * 3600)
            val entry = journalRepo.save(JournalEntry(
                userId       = userId,
                body         = j.body,
                entryDate    = today.minusDays(j.hoursAgo / 24),
                audienceType = j.audience,
                createdAt    = ts,
                updatedAt    = ts,
            ))
            journalCount++
            if (j.audience == F && j.likes > 0) {
                reactionTargets.add(ReactionTarget(entry.id, userId, j.likes, j.comments))
            }
        }

        for (p in c.photos) {
            val ts = Instant.now().minusSeconds(p.hoursAgo * 3600)
            photoRepo.save(Photo(
                userId       = userId,
                objectKey    = "seed/$slug/${UUID.randomUUID()}.jpg",
                contentType  = "image/jpeg",
                caption      = p.caption,
                audienceType = p.audience,
                createdAt    = ts,
                updatedAt    = ts,
            ))
            photoCount++
        }
    }

    /** Add LIKE reactions (some with a reply) to public journal entries, from other seed users. */
    private fun seedReactions() {
        var total = 0
        for (t in reactionTargets) {
            val reactors = seededUserIds.filter { it != t.authorId }.take(t.likes)
            reactors.forEachIndexed { i, reactorId ->
                val ts = Instant.now().minusSeconds((i + 1) * 1800L)
                reactionRepo.save(Reaction(
                    journalEntryId = t.entryId,
                    userId         = reactorId,
                    type           = ReactionType.LIKE,
                    replyBody      = if (i < t.comments) SAMPLE_REPLIES[i % SAMPLE_REPLIES.size] else null,
                    createdAt      = ts,
                    updatedAt      = ts,
                ))
                total++
            }
        }
        if (total > 0) println("  Seeded $total reactions on public journal entries")
    }

    private val SAMPLE_REPLIES = listOf(
        "This is the good stuff. Keep going.",
        "Needed to read this today.",
        "Proud of you — for real.",
        "Same. The mornings get easier, promise.",
        "Showing up is the whole thing.",
    )

    private fun wireUpFriendships(seededUsers: List<Pair<ScenarioUser, User>>) {
        // Main user ↔ seed users marked friendMain=true
        val mainUser = if (mainUserEmail.isNotBlank()) userRepo.findByEmail(mainUserEmail) else null
        if (mainUser != null) {
            seededUsers.filter { it.first.friendMain }.forEach { (_, seedUser) ->
                makeFriendship(mainUser.id, seedUser.id)
            }
            println("  Linked ${seededUsers.count { it.first.friendMain }} seed users as friends of $mainUserEmail")
        } else {
            println("  (seed.main-user-email not set — skipping main-user friendships)")
        }

        // Peer friendships among friendPeers=true users
        val peers = seededUsers.filter { it.first.friendPeers }.map { it.second }
        for (i in peers.indices) {
            for (j in i + 1 until peers.size) {
                makeFriendship(peers[i].id, peers[j].id)
            }
        }
        println("  Wired ${peers.size * (peers.size - 1) / 2} peer friendships")
    }

    private fun makeFriendship(aId: UUID, bId: UUID) {
        if (friendshipRepo.findBetween(aId, bId) != null) return
        friendshipRepo.save(Friendship(
            requesterId = aId,
            addresseeId = bId,
            status      = FriendshipStatus.ACCEPTED,
        ))
    }

    private fun printSummaryTable(results: List<Triple<ScenarioUser, User, StreakState>>) {
        println("\n  ┌─────────────────────┬────────┬──────┬────────┬──────┬───────────────────────┬───────────┐")
        println("  │ Name                │ Streak │ Tier │ Buffer │ Best │ Last Reason           │ Fell back │")
        println("  ├─────────────────────┼────────┼──────┼────────┼──────┼───────────────────────┼───────────┤")
        for ((scenario, _, state) in results) {
            val tier = StreakEngine.currentTier(state.currentStreak)
            val fell = when (state.lastStateChangeReason) {
                StateChangeReason.FELL_BACK_TO_20 -> "→ 20"
                StateChangeReason.FELL_BACK_TO_40 -> "→ 40"
                StateChangeReason.RESET_TO_0      -> "→ 0"
                else                               -> "—"
            }
            // Find the worst reason in outcomes to detect historical fallbacks
            val hadFallback = scenario.outcomes.let {
                // re-replay to find if any fallback happened (state only has last reason)
                var s = StreakState(0, 0, 0)
                var fell2 = "—"
                for (met in it) {
                    s = StreakEngine.applyDay(s, met)
                    when (s.lastStateChangeReason) {
                        StateChangeReason.FELL_BACK_TO_20 -> fell2 = "→ 20"
                        StateChangeReason.FELL_BACK_TO_40 -> fell2 = "→ 40"
                        StateChangeReason.RESET_TO_0      -> fell2 = "→ 0"
                        else -> {}
                    }
                }
                fell2
            }
            println("  │ ${scenario.displayName.padEnd(19)} │ ${state.currentStreak.toString().padStart(6)} │    $tier │ ${state.missBufferRemaining.toString().padStart(6)} │ ${state.bestStreak.toString().padStart(4)} │ ${(state.lastStateChangeReason?.name ?: "—").padEnd(21)} │ ${hadFallback.padEnd(9)} │")
        }
        println("  └─────────────────────┴────────┴──────┴────────┴──────┴───────────────────────┴───────────┘")
    }
}
