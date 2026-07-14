CREATE TABLE notifications (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id  UUID        NOT NULL REFERENCES users(id),
    actor_id      UUID        NOT NULL REFERENCES users(id),
    type          VARCHAR(30) NOT NULL,
    reaction_type VARCHAR(20),
    target_id     UUID,
    preview       TEXT,
    read_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient_id ON notifications (recipient_id);
CREATE INDEX idx_notifications_recipient_unread ON notifications (recipient_id) WHERE read_at IS NULL;
