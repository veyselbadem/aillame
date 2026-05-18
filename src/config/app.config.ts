import dotenv from 'dotenv';

dotenv.config({ override: true });

export const APP_CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  VERSION: '1.0.0',
  SERVICE_NAME: 'aillame',
  CORS_ALLOWED_ORIGINS: [
    'http://localhost:1420',
    'http://127.0.0.1:1420',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
};
