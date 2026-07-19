const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4000;

const roundsRouter = require('./routes/rounds.routes');
const questionsRouter = require('./routes/questions.routes');
const { handleAdminLogin } = require('./middleware/auth');

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.post('/api/admin/login', handleAdminLogin);
app.use('/api/rounds', roundsRouter);
app.use('/api/questions', questionsRouter);

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