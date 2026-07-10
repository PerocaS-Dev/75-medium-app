CREATE TABLE photo_reactions (
    id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    photo_id   UUID        NOT NULL REFERENCES photos(id),
    user_id    UUID        NOT NULL REFERENCES users(id),
    type       VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (photo_id, user_id)
);

CREATE INDEX idx_photo_reactions_photo_id ON photo_reactions (photo_id);
