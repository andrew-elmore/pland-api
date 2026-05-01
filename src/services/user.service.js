import User from '../models/user.model.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50 } = query;
    const [items, totalCount] = await Promise.all([
        User.find().skip(Number(skip)).limit(Number(limit)),
        User.countDocuments(),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await User.findById(id);
    if (!item) throw Object.assign(new Error('User not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = new User(data);
    return item.save();
};

export const update = async (id, data) => {
    const item = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('User not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await User.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('User not found'), { status: 404 });
    return item;
};
