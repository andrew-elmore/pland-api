import { clerkMiddleware, getAuth } from '@clerk/express';
import env from '../config/env.js';
import clerkClient from '../config/clerk.js';

const DEV_USER_HEADER = 'x-dev-user';

const fallbackFirstName = (firstName, username, email) =>
    firstName || username || email.split('@')[0] || 'User';

const unauthorized = (message) => Object.assign(new Error(message), { status: 401 });

const devIdentify = (req, res, next) => {
    const header = req.headers[DEV_USER_HEADER];
    if (!header) {
        req.devUser = null;
        return next();
    }
    try {
        req.devUser = JSON.parse(decodeURIComponent(header));
    } catch (err) {
        throw unauthorized('Invalid dev user header');
    }
    next();
};

/**
 * Resolves the caller's identity for every request. In clerk mode this is Clerk's
 * middleware, which verifies the bearer session token sent by the UI. In dev mode
 * the identity comes from the X-Dev-User header (never allowed in production).
 */
export const identify = env.authMode === 'dev'
    ? devIdentify
    : clerkMiddleware({
        clerkClient,
        publishableKey: env.clerkPublishableKey,
        secretKey: env.clerkSecretKey,
        authorizedParties: [env.corsOrigin],
    });

export const authenticate = (req, res, next) => {
    const userId = env.authMode === 'dev' ? req.devUser?.id : getAuth(req).userId;
    if (!userId) throw unauthorized('Authentication required');
    req.user = { id: userId };
    next();
};

/**
 * Loads the signed-in user's account details (Clerk user, or the dev identity in dev mode).
 * @param {import('express').Request} req A request that has passed `authenticate`.
 * @returns {Promise<{ id: string, email: string, firstName: string, lastName: string }>}
 */
export const currentAccount = async (req) => {
    if (env.authMode === 'dev') {
        const { email = '', firstName = '', lastName = '', username = '' } = req.devUser;
        return { id: req.user.id, email, firstName: fallbackFirstName(firstName, username, email), lastName };
    }
    const user = await clerkClient.users.getUser(req.user.id);
    const email = user.primaryEmailAddress?.emailAddress ?? '';
    return {
        id: user.id,
        email,
        firstName: fallbackFirstName(user.firstName, user.username, email),
        lastName: user.lastName ?? '',
    };
};
