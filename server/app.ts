// Platform-owned: do not edit. Add endpoints under server/routes/ and mount
// them in server/routes/index.ts.
import express, { type ErrorRequestHandler } from 'express';
import { attachRequestUser, authRoutes } from './auth';
import { routes } from './routes/index';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use(attachRequestUser);
app.use('/api/auth', authRoutes);
app.use('/api', routes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  const status =
    typeof error?.status === 'number' && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
  if (status >= 500) console.error('[api]', error);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : String(error?.message || 'Request failed'),
  });
};
app.use(handleError);

export default app;
