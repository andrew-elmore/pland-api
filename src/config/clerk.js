import { createClerkClient } from '@clerk/express';
import env from './env.js';

const clerkClient = createClerkClient({
    publishableKey: env.clerkPublishableKey,
    secretKey: env.clerkSecretKey,
});

export default clerkClient;
