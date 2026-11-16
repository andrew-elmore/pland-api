import Profile from '../models/profile.model.js';
import { hasForbiddenKey } from './access.service.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, userId } = query;
    const filter = { userId };
    const [items, totalCount] = await Promise.all([
        Profile.find(filter).skip(Number(skip)).limit(Number(limit)),
        Profile.countDocuments(filter),
    ]);
    return { items, totalCount };
};

export const get = async (id, userId) => {
    const item = await Profile.findOne({ _id: id, userId });
    if (!item) throw Object.assign(new Error('Profile not found'), { status: 404 });
    return item;
};

export const create = async (data, userId) => {
    if (hasForbiddenKey(data)) throw Object.assign(new Error('Invalid field name'), { status: 400 });
    const item = new Profile({ ...data, userId });
    return item.save();
};

export const update = async (id, data, userId) => {
    if (hasForbiddenKey(data)) throw Object.assign(new Error('Invalid field name'), { status: 400 });
    const item = await Profile.findOneAndUpdate({ _id: id, userId }, { ...data, userId }, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Profile not found'), { status: 404 });
    return item;
};

export const remove = async (id, userId) => {
    const item = await Profile.findOneAndDelete({ _id: id, userId });
    if (!item) throw Object.assign(new Error('Profile not found'), { status: 404 });
    return item;
};
