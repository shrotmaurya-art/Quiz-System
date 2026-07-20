CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logoUrl TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  isActive INTEGER NOT NULL DEFAULT 1,
  joinToken TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  candidateIds TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  winnerCandidateId TEXT
);

CREATE TABLE IF NOT EXISTS match_scores (
  matchId TEXT NOT NULL,
  candidateId TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (matchId, candidateId),
  FOREIGN KEY (matchId) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (candidateId) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS global_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  defaultTimeLimitSeconds INTEGER NOT NULL DEFAULT 30,
  defaultGapEnabled INTEGER NOT NULL DEFAULT 1,
  defaultGapSeconds INTEGER NOT NULL DEFAULT 10,
  schoolName TEXT NOT NULL DEFAULT 'Quiz Competition',
  brandLogoUrl TEXT,
  brandColor TEXT
);

CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  answerMode TEXT NOT NULL CHECK (answerMode IN ('MCQ', 'OPEN')),
  pointsPerQuestion INTEGER NOT NULL DEFAULT 10,
  timeLimitSeconds INTEGER,
  gapEnabled INTEGER,
  gapSeconds INTEGER,
  instructions TEXT,
  matchId TEXT,
  FOREIGN KEY (matchId) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  roundId TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  text TEXT NOT NULL,
  mediaType TEXT NOT NULL DEFAULT 'none' CHECK (mediaType IN ('none', 'image', 'video')),
  mediaUrl TEXT,
  options TEXT NOT NULL DEFAULT '[]',
  correctOptionKey TEXT,
  pointsOverride INTEGER,
  timeLimitOverrideSeconds INTEGER,
  gapEnabledOverride INTEGER,
  gapSecondsOverride INTEGER,
  FOREIGN KEY (roundId) REFERENCES rounds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  phase TEXT NOT NULL DEFAULT 'IDLE',
  currentRoundId TEXT,
  currentQuestionId TEXT,
  timerStartedAt INTEGER,
  gapStartedAt INTEGER,
  timeLimitSeconds INTEGER NOT NULL DEFAULT 30,
  gapEnabled INTEGER NOT NULL DEFAULT 1,
  gapSeconds INTEGER NOT NULL DEFAULT 10,
  locks TEXT NOT NULL DEFAULT '{}',
  judgements TEXT NOT NULL DEFAULT '{}',
  winnerCandidateId TEXT,
  resultsRevealed INTEGER NOT NULL DEFAULT 0,
  matchId TEXT,
  FOREIGN KEY (currentRoundId) REFERENCES rounds(id),
  FOREIGN KEY (currentQuestionId) REFERENCES questions(id),
  FOREIGN KEY (matchId) REFERENCES matches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS score_log (
  id TEXT PRIMARY KEY,
  questionId TEXT NOT NULL,
  candidateId TEXT NOT NULL,
  pointsChange INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('timed_ranking_win', 'manual_adjustment', 'question_replay_reversal')),
  timestamp INTEGER NOT NULL,
  matchId TEXT,
  FOREIGN KEY (questionId) REFERENCES questions(id),
  FOREIGN KEY (candidateId) REFERENCES candidates(id),
  FOREIGN KEY (matchId) REFERENCES matches(id) ON DELETE CASCADE
);
