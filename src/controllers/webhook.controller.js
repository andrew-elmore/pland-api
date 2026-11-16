import { verifyWebhook } from '@clerk/express/webhooks';
import * as webhookService from '../services/webhook.service.js';
import env from '../config/env.js';

export const clerk = async (req, res, next) => {
    try {
        const event = await verifyWebhook(req, { signingSecret: env.clerkWebhookSigningSecret }).catch(() => {
            throw Object.assign(new Error('Webhook verification failed'), { status: 400 });
        });
        await webhookService.handleClerkEvent(event);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};
