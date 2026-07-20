'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { getGlobalSettings, updateGlobalSettings, get, run } = require('../db/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const BRAND_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'brand');

function saveBrandLogo(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  const filename = `${crypto.randomUUID()}${extension}`;
  const destination = path.join(BRAND_UPLOAD_DIR, filename);
  fs.mkdirSync(BRAND_UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(destination, file.buffer);
  return `/uploads/brand/${filename}`;
}

router.use(requireAdmin);

router.get('/settings', (req, res) => {
  return res.json(getGlobalSettings());
});

router.put('/settings', (req, res) => {
  const patch = req.body || {};
  const updated = updateGlobalSettings(patch);
  return res.json(updated);
});

router.post('/settings/logo', upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'A logo file is required.' });
  }

  const logoUrl = saveBrandLogo(req.file);
  const updated = updateGlobalSettings({ brandLogoUrl: logoUrl });
  return res.json(updated);
});

module.exports = router;
