import Participant from '../models/participant.model.js';
import User from '../models/user.model.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, planId } = query;
    const filter = {};
    if (planId) filter.planId = planId;
    const [items, totalCount] = await Promise.all([
        Participant.find(filter).skip(Number(skip)).limit(Number(limit)),
        Participant.countDocuments(filter),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Participant.findById(id);
    if (!item) throw Object.assign(new Error('Participant not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const user = await User.findOne({ email: data.email });
    if (user) {
        data.userId = user._id;
    }
    const item = new Participant(data);
    return item.save();
};

export const update = async (id, data) => {
    const item = await Participant.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Participant not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Participant.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Participant not found'), { status: 404 });
    return item;
};

export const linkUserByEmail = async (email, userId) => {
    await Participant.updateMany(
        { email, userId: null },
        { userId },
    );
};
