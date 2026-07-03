CREATE TABLE daily_logs (
    id                    UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id          UUID        NOT NULL REFERENCES challenges(id),
    log_date              DATE        NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    tasks_completed_count INT         NOT NULL DEFAULT 0,
    tasks_total_count     INT         NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (challenge_id, log_date)
);

CREATE INDEX idx_daily_logs_challenge_id ON daily_logs (challenge_id);
CREATE INDEX idx_daily_logs_date         ON daily_logs (log_date);
