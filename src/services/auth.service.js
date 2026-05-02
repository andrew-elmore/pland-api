import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Profile from '../models/profile.model.js';
import { linkUserByEmail } from './participant.service.js';
import env from '../config/env.js';

const generateToken = (userId) => {
    return jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
};

export const register = async ({ email, password, firstName, lastName }) => {
    const existing = await User.findOne({ email });
    if (existing) throw Object.assign(new Error('Email already in use'), { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await new User({ email, passwordHash }).save();

    const profile = await new Profile({
        userId: user._id,
        firstName: firstName || '',
        lastName: lastName || '',
    }).save();

    user.profileId = profile._id;
    await user.save();

    await linkUserByEmail(email, user._id);

    const token = generateToken(user._id);
    const userJson = user.toJSON();
    delete userJson.passwordHash;
    return { token, user: userJson, profile };
};

export const login = async ({ email, password }) => {
    const user = await User.findOne({ email });
    if (!user) throw Object.assign(new Error('Invalid email or password'), { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw Object.assign(new Error('Invalid email or password'), { status: 401 });

    const profile = await Profile.findOne({ userId: user._id });
    const token = generateToken(user._id);
    const userJson = user.toJSON();
    delete userJson.passwordHash;
    return { token, user: userJson, profile };
};

export const me = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    const profile = await Profile.findOne({ userId: user._id });
    const userJson = user.toJSON();
    delete userJson.passwordHash;
    return { user: userJson, profile };
};
