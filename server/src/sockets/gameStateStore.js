'use strict';

const { get, run } = require('../db/db');

function getGameState() {
  const row = get('SELECT * FROM game_state WHERE id = 1');
  if (!row) return null;
  return {
    ...row,
    locks: JSON.parse(row.locks),
    judgements: JSON.parse(row.judgements),
    gapEnabled: Boolean(row.gapEnabled),
    resultsRevealed: Boolean(row.resultsRevealed),
  };
}

function saveGameState(state) {
  run(
    `INSERT OR REPLACE INTO game_state (
      id, phase, currentRoundId, currentQuestionId, timerStartedAt,
      timeLimitSeconds, gapEnabled, gapSeconds, locks, judgements,
      winnerCandidateId, resultsRevealed
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      state.phase,
      state.currentRoundId,
      state.currentQuestionId,
      state.timerStartedAt,
      state.timeLimitSeconds,
      Number(state.gapEnabled),
      state.gapSeconds,
      JSON.stringify(state.locks),
      JSON.stringify(state.judgements),
      state.winnerCandidateId,
      Number(state.resultsRevealed),
    ]
  );
}

function resolveTimeLimitSeconds(question, round, globalSettings) {
  if (question && question.timeLimitOverrideSeconds != null) {
    return question.timeLimitOverrideSeconds;
  }
  if (round && round.timeLimitSeconds != null) {
    return round.timeLimitSeconds;
  }
  return globalSettings.defaultTimeLimitSeconds;
}

function resolveGapEnabled(question, round, globalSettings) {
  if (question && question.gapEnabledOverride != null) {
    return Boolean(question.gapEnabledOverride);
  }
  if (round && round.gapEnabled != null) {
    return Boolean(round.gapEnabled);
  }
  return Boolean(globalSettings.defaultGapEnabled);
}

function resolveGapSeconds(question, round, globalSettings) {
  if (question && question.gapSecondsOverride != null) {
    return question.gapSecondsOverride;
  }
  if (round && round.gapSeconds != null) {
    return round.gapSeconds;
  }
  return globalSettings.defaultGapSeconds;
}

module.exports = {
  getGameState,
  saveGameState,
  resolveTimeLimitSeconds,
  resolveGapEnabled,
  resolveGapSeconds,
};
