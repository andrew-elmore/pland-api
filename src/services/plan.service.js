import Plan from '../models/plan.model.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50 } = query;
    const [items, totalCount] = await Promise.all([
        Plan.find().skip(Number(skip)).limit(Number(limit)),
        Plan.countDocuments(),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Plan.findById(id);
    if (!item) throw Object.assign(new Error('Plan not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = new Plan(data);
    return item.save();
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
