CREATE TABLE request_limits (key TEXT PRIMARY KEY, bucket INTEGER NOT NULL, count INTEGER NOT NULL);
CREATE INDEX request_limit_cleanup ON request_limits(bucket);
