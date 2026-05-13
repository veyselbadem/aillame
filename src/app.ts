import express from 'express';
import cors from 'cors';
import { APP_CONFIG } from './config/app.config';
import healthRoutes from './api/routes/health.routes';
import authRoutes from './api/routes/auth.routes';
import projectRoutes from './api/routes/project.routes';
import chatRoutes from './api/routes/chat.routes';
import promptRoutes from './api/routes/prompt.routes';
import modelRoutes from './api/routes/model.routes';
import runtimeRoutes from './api/routes/runtime.routes';
import safetyRoutes from './api/routes/safety.routes';
import memoryRoutes from './api/routes/memory.routes';
import integrationRoutes from './api/routes/integration.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/not-found.middleware';

const app = express();

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (APP_CONFIG.CORS_ALLOWED_ORIGINS.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/aillame', healthRoutes);
app.use('/api/aillame/auth', authRoutes);
app.use('/api/aillame/project', projectRoutes);
app.use('/api/aillame/prompt', promptRoutes);
app.use('/api/aillame/models', modelRoutes);
app.use('/api/aillame/runtime', runtimeRoutes);
app.use('/api/aillame', safetyRoutes);
app.use('/api/aillame', memoryRoutes);
app.use('/api/aillame/integration', integrationRoutes);
app.use('/api/aillame', chatRoutes);

// Error Handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
