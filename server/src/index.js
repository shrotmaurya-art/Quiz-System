const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running — try http://localhost:${PORT}/api/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill whatever's holding it (see PID via 'netstat -ano | findstr :${PORT}') and try again.`);
  } else {
    console.error('Failed to start server:', err);
  }
  process.exit(1);
});