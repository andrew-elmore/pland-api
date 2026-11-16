import dotenv from 'dotenv';

dotenv.config();

const AUTH_MODES = ['clerk', 'dev'];

const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pland',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    authMode: process.env.AUTH_MODE || 'clerk',
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
    clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
    clerkWebhookSigningSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET || '',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
};

if (!AUTH_MODES.includes(env.authMode)) {
    throw new Error(`Invalid AUTH_MODE "${env.authMode}". Expected "clerk" or "dev".`);
}

if (env.authMode === 'dev' && env.nodeEnv === 'production') {
    throw new Error('AUTH_MODE=dev is forbidden when NODE_ENV=production.');
}

if (env.authMode === 'clerk' && (!env.clerkPublishableKey || !env.clerkSecretKey)) {
    throw new Error('CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are required when AUTH_MODE=clerk.');
}

export default env;
