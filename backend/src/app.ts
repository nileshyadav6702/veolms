import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { swaggerSpec } from './config/swagger';
import authRoutes from './routes/auth.routes';
import courseRoutes from './routes/course.routes';
import lessonRoutes from './routes/lesson.routes';
import uploadRoutes from './routes/upload.routes';
import paymentRoutes from './routes/payment.routes';
import enrollmentRoutes from './routes/enrollment.routes';
import progressRoutes from './routes/progress.routes';
import adminRoutes from './routes/admin.routes';
import aiChatRoutes from './routes/aiChat.routes';
import noteRoutes from './routes/note.routes';
import reviewRoutes from './routes/review.routes';
import certificateRoutes from './routes/certificate.routes';

export const app = express();


// Trust reverse proxy (Render, AWS, Heroku, etc.)
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (
        config.NODE_ENV === 'development' &&
        (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))
      ) {
        return callback(null, true)
      }
      if (origin === config.FRONTEND_URL || origin.endsWith('.vercel.app')) {
        return callback(null, true)
      }
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)

// Capture raw body for Razorpay webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

app.use(globalLimiter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Swagger API Docs (dev only) ────────────────────────────────────────────
if (config.NODE_ENV !== 'production') {
  const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
    customSiteTitle: 'VeoLMS API Docs',
    customCss: `
      .swagger-ui .topbar { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
      .swagger-ui .info h2.title { color: #6366f1; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      tryItOutEnabled: true,
    },
  };
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai-chats', aiChatRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/certificates', certificateRoutes);

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if ((err as unknown as Record<string, unknown>).type === 'entity.parse.failed') {
    res.status(400).json({ success: false, message: 'Invalid JSON body' });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});
