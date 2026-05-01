import Profile from '../models/profile.model.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50 } = query;
    const [items, totalCount] = await Promise.all([
        Profile.find().skip(Number(skip)).limit(Number(limit)),
        Profile.countDocuments(),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Profile.findById(id);
    if (!item) throw Object.assign(new Error('Profile not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = new Profile(data);
    return item.save();
};

export const update = async (id, data) => {
    const item = await Profile.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Profile not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Profile.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Profile not found'), { status: 404 });
    return item;
};
