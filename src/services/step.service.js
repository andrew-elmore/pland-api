import Step from '../models/step.model.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50 } = query;
    const [items, totalCount] = await Promise.all([
        Step.find().skip(Number(skip)).limit(Number(limit)),
        Step.countDocuments(),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Step.findById(id);
    if (!item) throw Object.assign(new Error('Step not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = new Step(data);
    return item.save();
};

export const update = async (id, data) => {
    const item = await Step.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Step not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Step.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Step not found'), { status: 404 });
    return item;
};
