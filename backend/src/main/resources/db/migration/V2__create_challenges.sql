CREATE TABLE challenges (
    id                       UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id                  UUID        NOT NULL REFERENCES users(id),
    start_date               DATE        NOT NULL,
    status                   VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    current_streak           INT         NOT NULL DEFAULT 0,
    personal_best_days       INT         NOT NULL DEFAULT 0,
    miss_buffer_remaining    INT         NOT NULL DEFAULT 0,
    last_state_change_reason VARCHAR(30),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenges_user_id ON challenges (user_id);
CREATE INDEX idx_challenges_status  ON challenges (status);
