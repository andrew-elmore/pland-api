import Route from '../models/route.model.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50 } = query;
    const [items, totalCount] = await Promise.all([
        Route.find().skip(Number(skip)).limit(Number(limit)),
        Route.countDocuments(),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Route.findById(id);
    if (!item) throw Object.assign(new Error('Route not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = new Route(data);
    return item.save();
};

export const update = async (id, data) => {
    const item = await Route.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Route not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Route.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Route not found'), { status: 404 });
    return item;
};
