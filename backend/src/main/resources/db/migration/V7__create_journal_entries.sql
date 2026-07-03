CREATE TABLE journal_entries (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID        NOT NULL REFERENCES users(id),
    body          TEXT        NOT NULL,
    entry_date    DATE        NOT NULL,
    audience_type VARCHAR(20) NOT NULL DEFAULT 'SELF',
    audience_id   UUID,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_entries_user_id    ON journal_entries (user_id);
CREATE INDEX idx_journal_entries_entry_date ON journal_entries (entry_date);
