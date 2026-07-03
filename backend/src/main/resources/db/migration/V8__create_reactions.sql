CREATE TABLE reactions (
    id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_entry_id UUID        NOT NULL REFERENCES journal_entries(id),
    user_id          UUID        NOT NULL REFERENCES users(id),
    type             VARCHAR(20) NOT NULL,
    reply_body       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (journal_entry_id, user_id)
);

CREATE INDEX idx_reactions_journal_entry_id ON reactions (journal_entry_id);
