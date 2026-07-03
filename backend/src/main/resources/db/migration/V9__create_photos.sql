CREATE TABLE photos (
    id            UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID         NOT NULL REFERENCES users(id),
    object_key    VARCHAR(500) NOT NULL,
    content_type  VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
    caption       TEXT,
    audience_type VARCHAR(20)  NOT NULL DEFAULT 'SELF',
    audience_id   UUID,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_user_id ON photos (user_id);
