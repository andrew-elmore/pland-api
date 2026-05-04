import Group from '../models/group.model.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, planId } = query;
    const filter = {};
    if (planId) filter.planId = planId;
    const [items, totalCount] = await Promise.all([
        Group.find(filter).skip(Number(skip)).limit(Number(limit)),
        Group.countDocuments(filter),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Group.findById(id);
    if (!item) throw Object.assign(new Error('Group not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = new Group(data);
    return item.save();
};

export const update = async (id, data) => {
    const item = await Group.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Group not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Group.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Group not found'), { status: 404 });
    return item;
};
