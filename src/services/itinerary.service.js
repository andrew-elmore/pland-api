import Itinerary from '../models/itinerary.model.js';
import Step from '../models/step.model.js';
import Timeslot from '../models/timeslot.model.js';
import Window from '../models/window.model.js';
import { accessiblePlanIds, queryId } from './access.service.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, planId, userId } = query;
    const filter = { planId: { $in: await accessiblePlanIds(userId) } };
    if (planId) filter.planId.$eq = queryId(planId, 'planId');
    const [items, totalCount] = await Promise.all([
        Itinerary.find(filter).skip(Number(skip)).limit(Number(limit)),
        Itinerary.countDocuments(filter),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Itinerary.findById(id);
    if (!item) throw Object.assign(new Error('Itinerary not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const item = new Itinerary(data);
    return item.save();
};

export const update = async (id, data) => {
    const item = await Itinerary.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Itinerary not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Itinerary.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Itinerary not found'), { status: 404 });
    const windowIds = await Window.distinct('_id', { itineraryId: id });
    await Promise.all([
        Timeslot.deleteMany({ windowId: { $in: windowIds } }),
        Window.deleteMany({ _id: { $in: windowIds } }),
        Step.deleteMany({ itineraryId: id }),
    ]);
    return item;
};
