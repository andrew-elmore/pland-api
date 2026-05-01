import Step from '../models/step.model.js';
import Time from '../models/time.model.js';
import Itinerary from '../models/itinerary.model.js';

const populateTimes = (query) => query.populate('startTimeId').populate('endTimeId');

const flattenStep = (step) => {
    const obj = step.toJSON();
    obj.startTime = obj.startTimeId?.datetime ?? null;
    obj.endTime = obj.endTimeId?.datetime ?? null;
    obj.startTimeId = obj.startTimeId?.id ?? null;
    obj.endTimeId = obj.endTimeId?.id ?? null;
    return obj;
};

const getPlanId = async (itineraryId) => {
    const itinerary = await Itinerary.findById(itineraryId).select('planId');
    if (!itinerary) throw Object.assign(new Error('Itinerary not found'), { status: 404 });
    return itinerary.planId;
};

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, itineraryId } = query;
    const filter = {};
    if (itineraryId) filter.itineraryId = itineraryId;
    const [items, totalCount] = await Promise.all([
        populateTimes(Step.find(filter).skip(Number(skip)).limit(Number(limit))),
        Step.countDocuments(filter),
    ]);
    return { items: items.map(flattenStep), totalCount };
};

export const get = async (id) => {
    const item = await populateTimes(Step.findById(id));
    if (!item) throw Object.assign(new Error('Step not found'), { status: 404 });
    return flattenStep(item);
};

export const create = async (data) => {
    const { startTime, endTime, startTimeId, endTimeId, ...rest } = data;
    const planId = await getPlanId(rest.itineraryId);
    const resolvedStartTimeId = startTimeId ?? (await new Time({ planId, datetime: startTime }).save())._id;
    const resolvedEndTimeId = endTimeId ?? (await new Time({ planId, datetime: endTime }).save())._id;
    const item = new Step({ ...rest, startTimeId: resolvedStartTimeId, endTimeId: resolvedEndTimeId });
    const saved = await item.save();
    const populated = await populateTimes(Step.findById(saved._id));
    return flattenStep(populated);
};

export const update = async (id, data) => {
    const { startTime, endTime, startTimeId, endTimeId, ...rest } = data;
    const existing = await Step.findById(id);
    if (!existing) throw Object.assign(new Error('Step not found'), { status: 404 });

    if (startTimeId) {
        rest.startTimeId = startTimeId;
    } else if (startTime) {
        await Time.findByIdAndUpdate(existing.startTimeId, { datetime: startTime }, { runValidators: true });
    }

    if (endTimeId) {
        rest.endTimeId = endTimeId;
    } else if (endTime) {
        await Time.findByIdAndUpdate(existing.endTimeId, { datetime: endTime }, { runValidators: true });
    }

    const item = await populateTimes(Step.findByIdAndUpdate(id, rest, { new: true, runValidators: true }));
    if (!item) throw Object.assign(new Error('Step not found'), { status: 404 });
    return flattenStep(item);
};

export const remove = async (id) => {
    const item = await Step.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Step not found'), { status: 404 });
    return item;
};
