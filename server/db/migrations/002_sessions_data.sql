-- MedPobeda — 002: sessions payload storage.
-- express-session needs a serialized payload column on the sessions table.
ALTER TABLE sessions ADD COLUMN data TEXT NOT NULL DEFAULT '';