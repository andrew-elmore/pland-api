import Timeslot from '../models/timeslot.model.js';
import Window from '../models/window.model.js';
import Itinerary from '../models/itinerary.model.js';
import { accessiblePlanIds } from './access.service.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, userId } = query;
    const itineraryIds = await Itinerary.distinct('_id', { planId: { $in: await accessiblePlanIds(userId) } });
    const filter = { windowId: { $in: await Window.distinct('_id', { itineraryId: { $in: itineraryIds } }) } };
    const [items, totalCount] = await Promise.all([
        Timeslot.find(filter).skip(Number(skip)).limit(Number(limit)),
        Timeslot.countDocuments(filter),
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
