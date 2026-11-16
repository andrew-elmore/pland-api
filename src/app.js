import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import webhookRoutes from './routes/webhook.routes.js';
import { identify } from './middleware/auth.js';
import { validateRequest } from './middleware/validateRequest.js';
import { errorHandler } from './middleware/errorHandler.js';
import env from './config/env.js';

const app = express();

app.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store').json({ status: 'ok' });
});

app.use(cors({ origin: env.corsOrigin }));

app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
app.use(validateRequest);
app.use(identify);

app.use('/api', routes);

app.use(errorHandler);

export default app;
