CREATE TABLE task_definitions (
    id           UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id UUID         NOT NULL REFERENCES challenges(id),
    label        VARCHAR(255) NOT NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    locked       BOOLEAN      NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_definitions_challenge_id ON task_definitions (challenge_id);
