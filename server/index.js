import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db.js';

import authRoutes from './routes/auth.js';
import drivesRoutes from './routes/drives.js';
import verifyRoutes from './routes/verify.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize SQLite Tables & Seed Data
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/drives', drivesRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/admin', adminRoutes);

// Keep missing API endpoints as JSON responses instead of falling through to the SPA HTML.
app.use('/api', (req, res) => {
  return res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Serve static frontend assets if built
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Fallback for single page app routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Placement System API</title></head>
        <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
          <h2>Placement Drive WhatsApp Group Management API</h2>
          <p>Server is running on port ${PORT}. Client is running in dev server mode.</p>
        </body>
        </html>
      `);
    }
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing server or set a different PORT before starting this one.`);
    process.exit(1);
  }

  throw error;
});
