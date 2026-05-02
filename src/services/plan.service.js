import Plan from '../models/plan.model.js';
import Participant from '../models/participant.model.js';
import User from '../models/user.model.js';
import Profile from '../models/profile.model.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, ownerId } = query;
    const filter = {};
    if (ownerId) filter.ownerId = ownerId;
    const [items, totalCount] = await Promise.all([
        Plan.find(filter).skip(Number(skip)).limit(Number(limit)),
        Plan.countDocuments(filter),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Plan.findById(id);
    if (!item) throw Object.assign(new Error('Plan not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = await new Plan(data).save();

    const user = await User.findById(data.ownerId);
    const profile = await Profile.findOne({ userId: data.ownerId });

    await new Participant({
        planId: item._id,
        firstName: profile?.firstName ?? '',
        lastName: profile?.lastName ?? '',
        email: user.email,
        role: 'admin',
        userId: data.ownerId,
    }).save();

    return item;
};

export const update = async (id, data) => {
    const item = await Plan.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Plan not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Plan.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Plan not found'), { status: 404 });
    return item;
};
