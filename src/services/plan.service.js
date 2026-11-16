import Plan from '../models/plan.model.js';
import Participant from '../models/participant.model.js';
import Group from '../models/group.model.js';
import Itinerary from '../models/itinerary.model.js';
import Location from '../models/location.model.js';
import Role from '../models/role.model.js';
import Route from '../models/route.model.js';
import Step from '../models/step.model.js';
import Time from '../models/time.model.js';
import Timeslot from '../models/timeslot.model.js';
import Window from '../models/window.model.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, ownerId } = query;
    const filter = {};
    if (ownerId) filter.ownerId = ownerId;
    const [items, totalCount] = await Promise.all([
        Plan.find(filter).skip(Number(skip)).limit(Number(limit)),
        Plan.countDocuments(filter),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Plan.findById(id);
    if (!item) throw Object.assign(new Error('Plan not found'), { status: 404 });
    return item;
};

export const create = async (data, owner) => {
    const item = new Plan({ ...data, ownerId: owner.id });
    const admin = new Participant({
        planId: item._id,
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        role: 'admin',
        userId: owner.id,
    });

    await Promise.all([item.validate(), admin.validate()]);
    await item.save();
    try {
        await admin.save();
    } catch (err) {
        await Plan.deleteOne({ _id: item._id });
        throw err;
    }

    return item;
};

export const update = async (id, data) => {
    const { ownerId, ...changes } = data;
    const item = await Plan.findByIdAndUpdate(id, changes, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Plan not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Plan.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Plan not found'), { status: 404 });
    const [itineraryIds, locationIds] = await Promise.all([
        Itinerary.distinct('_id', { planId: id }),
        Location.distinct('_id', { planId: id }),
    ]);
    const windowIds = await Window.distinct('_id', { itineraryId: { $in: itineraryIds } });
    await Promise.all([
        Timeslot.deleteMany({ windowId: { $in: windowIds } }),
        Window.deleteMany({ _id: { $in: windowIds } }),
        Step.deleteMany({ itineraryId: { $in: itineraryIds } }),
        Route.deleteMany({ originLocationId: { $in: locationIds } }),
        ...[Group, Itinerary, Location, Participant, Role, Time].map((model) => model.deleteMany({ planId: id })),
    ]);
    return item;
};
