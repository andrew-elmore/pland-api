import Time from '../models/time.model.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, planId } = query;
    const filter = {};
    if (planId) filter.planId = planId;
    const [items, totalCount] = await Promise.all([
        Time.find(filter).sort({ datetime: 1 }).skip(Number(skip)).limit(Number(limit)),
        Time.countDocuments(filter),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Time.findById(id);
    if (!item) throw Object.assign(new Error('Time not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = new Time(data);
    return item.save();
};

export const update = async (id, data) => {
    const item = await Time.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Time not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Time.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Time not found'), { status: 404 });
    return item;
};
