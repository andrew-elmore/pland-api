import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        throw Object.assign(new Error('Authentication required'), { status: 401 });
    }
    try {
        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, env.jwtSecret);
        req.user = { id: decoded.userId };
        next();
    } catch (err) {
        throw Object.assign(new Error('Invalid or expired token'), { status: 401 });
    }
};
