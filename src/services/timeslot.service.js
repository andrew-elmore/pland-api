import Timeslot from '../models/timeslot.model.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50 } = query;
    const [items, totalCount] = await Promise.all([
        Timeslot.find().skip(Number(skip)).limit(Number(limit)),
        Timeslot.countDocuments(),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Timeslot.findById(id);
    if (!item) throw Object.assign(new Error('Timeslot not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = new Timeslot(data);
    return item.save();
};

export const update = async (id, data) => {
    const item = await Timeslot.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Timeslot not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Timeslot.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Timeslot not found'), { status: 404 });
    return item;
};
