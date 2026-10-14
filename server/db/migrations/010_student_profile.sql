-- MedPobeda — student profile, university, program, achievement system.
-- Additive migration: extends students table, creates new lookup/relation tables.

-- Extend students with profile fields (existing columns untouched)
ALTER TABLE students ADD COLUMN first_name TEXT;
ALTER TABLE students ADD COLUMN last_name TEXT;
ALTER TABLE students ADD COLUMN phone TEXT;
ALTER TABLE students ADD COLUMN university_id INTEGER REFERENCES universities(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN study_year INTEGER CHECK (study_year BETWEEN 1 AND 6 OR study_year IS NULL);
ALTER TABLE students ADD COLUMN program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN photo_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL;

-- Country
CREATE TABLE countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- University / Medical School
CREATE TABLE universities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_universities_country ON universities(country_id);
CREATE INDEX idx_universities_status ON universities(status);

-- Career / Program (admin-configurable, i18n-ready)
CREATE TABLE programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name_uz TEXT NOT NULL DEFAULT '',
  name_ru TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Achievements (data-driven: metric + threshold)
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name_uz TEXT NOT NULL DEFAULT '',
  name_ru TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  description_uz TEXT NOT NULL DEFAULT '',
  description_ru TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  metric TEXT NOT NULL DEFAULT '',
  threshold INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Student earned achievements
CREATE TABLE student_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, achievement_id)
);
CREATE INDEX idx_student_achievements_student ON student_achievements(student_id);

-- Seed: Uzbekistan
INSERT INTO countries (name, code, display_order) VALUES ('Uzbekistan', 'UZ', 1);

-- Seed: Uzbekistan medical universities
INSERT INTO universities (country_id, name, city, status) VALUES
  (1, 'Alfraganus University Faculty of Medicine', 'Tashkent', 'active'),
  (1, 'Andijan State Medical Institute', 'Andijan', 'active'),
  (1, 'Bukhara State Medical Institute', 'Bukhara', 'active'),
  (1, 'Fergana State University Medical Faculty', 'Fergana', 'active'),
  (1, 'Karakalpakstan Medical Institute', 'Nukus', 'active'),
  (1, 'Samarkand State Medical University', 'Samarkand', 'active'),
  (1, 'Tashkent Medical Academy', 'Tashkent', 'active'),
  (1, 'Tashkent State Medical University', 'Tashkent', 'active'),
  (1, 'Urgench Branch of Tashkent Medical Academy', 'Urgench', 'active'),
  (1, 'Zarmed University Faculty of Medicine', 'Tashkent', 'active');

-- Seed: Programs
INSERT INTO programs (slug, name_uz, name_ru, name_en, display_order) VALUES
  ('medicine', 'Tibbiyot', 'Медицина', 'Medicine', 1),
  ('dentistry', 'Stomatologiya', 'Стоматология', 'Dentistry', 2),
  ('pharmacy', 'Farmatsiya', 'Фармация', 'Pharmacy', 3);

-- Seed: Achievements
INSERT INTO achievements (slug, name_uz, name_ru, name_en, description_uz, description_ru, description_en, icon, metric, threshold, status) VALUES
  ('first_10', '10 ta savol', '10 вопросов', '10 Questions', '10 ta savolga to''g''ri javob berish', 'Ответить на 10 вопросов', 'Answer 10 questions', 'target', 'questions_answered', 10, 'active'),
  ('hundred_questions', '100 ta savol', '100 вопросов', '100 Questions', '100 ta savolga to''g''ri javob berish', 'Ответить на 100 вопросов', 'Answer 100 questions', 'star', 'questions_answered', 100, 'active'),
  ('five_hundred_questions', '500 ta savol', '500 вопросов', '500 Questions', '500 ta savolga to''g''ri javob berish', 'Ответить на 500 вопросов', 'Answer 500 questions', 'trophy', 'questions_answered', 500, 'active'),
  ('seven_day_streak', '7 kun ketma-ket', '7 дней подряд', '7 Day Streak', '7 kun ketma-ket savol yechish', 'Решать вопросы 7 дней подряд', 'Answer questions 7 days in a row', 'fire', 'streak_days', 7, 'active'),
  ('high_accuracy', '90% aniqlik', '90% точность', '90% Accuracy', '90% yoki undan yuqori aniqlik', 'Точность 90% или выше', '90% or higher accuracy', 'medal', 'accuracy', 90, 'active');
