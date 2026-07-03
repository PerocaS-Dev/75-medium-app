CREATE TABLE daily_task_checks (
    id                   UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    daily_log_id         UUID        NOT NULL REFERENCES daily_logs(id),
    task_definition_id   UUID        NOT NULL REFERENCES task_definitions(id),
    checked_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (daily_log_id, task_definition_id)
);

CREATE INDEX idx_daily_task_checks_log_id  ON daily_task_checks (daily_log_id);
CREATE INDEX idx_daily_task_checks_task_id ON daily_task_checks (task_definition_id);
