import Window from '../models/window.model.js';
import Timeslot from '../models/timeslot.model.js';
import Itinerary from '../models/itinerary.model.js';
import { accessiblePlanIds } from './access.service.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, userId } = query;
    const filter = { itineraryId: { $in: await Itinerary.distinct('_id', { planId: { $in: await accessiblePlanIds(userId) } }) } };
    const [items, totalCount] = await Promise.all([
        Window.find(filter).skip(Number(skip)).limit(Number(limit)),
        Window.countDocuments(filter),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Window.findById(id);
    if (!item) throw Object.assign(new Error('Window not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = new Window(data);
    return item.save();
};

export const update = async (id, data) => {
    const item = await Window.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Window not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Window.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Window not found'), { status: 404 });
    await Timeslot.deleteMany({ windowId: id });
    return item;
};
