import Location from '../models/location.model.js';
import Route from '../models/route.model.js';
import { accessiblePlanIds, queryId } from './access.service.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, planId, userId } = query;
    const filter = { planId: { $in: await accessiblePlanIds(userId) } };
    if (planId) filter.planId.$eq = queryId(planId, 'planId');
    const [items, totalCount] = await Promise.all([
        Location.find(filter).skip(Number(skip)).limit(Number(limit)),
        Location.countDocuments(filter),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Location.findById(id);
    if (!item) throw Object.assign(new Error('Location not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = new Location(data);
    return item.save();
};

export const update = async (id, data) => {
    const item = await Location.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Location not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Location.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Location not found'), { status: 404 });
    await Route.deleteMany({ originLocationId: id });
    return item;
};
