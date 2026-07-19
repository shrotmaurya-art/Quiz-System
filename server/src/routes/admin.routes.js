'use strict';

const express = require('express');
const { getGlobalSettings, updateGlobalSettings } = require('../db/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/settings', (req, res) => {
  return res.json(getGlobalSettings());
});

router.put('/settings', (req, res) => {
  const patch = req.body || {};
  const updated = updateGlobalSettings(patch);
  return res.json(updated);
});

module.exports = router;
