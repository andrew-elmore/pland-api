import Time from '../models/time.model.js';
import Route from '../models/route.model.js';

const computeDependentDatetime = async (dep, parentDatetime) => {
    if (dep.routeId) {
        const route = await Route.findById(dep.routeId);
        if (!route) return parentDatetime;
        const sign = route.timeMode === 'depart_at' ? 1 : -1;
        return new Date(parentDatetime.getTime() + sign * (route.durationSeconds + (dep.offsetSeconds || 0)) * 1000);
    }
    return new Date(parentDatetime.getTime() + dep.offsetSeconds * 1000);
};

export const cascadeTimeUpdate = async (timeId, newDatetime) => {
    const dependents = await Time.find({ parentTimeId: timeId });
    for (const dep of dependents) {
        const computed = await computeDependentDatetime(dep, newDatetime);
        dep.datetime = computed;
        await dep.save();
        await cascadeTimeUpdate(dep._id, computed);
    }
};

export const recalculateForRoute = async (routeId) => {
    const dependents = await Time.find({ routeId });
    for (const dep of dependents) {
        if (!dep.parentTimeId) continue;
        const parent = await Time.findById(dep.parentTimeId);
        if (!parent) continue;
        const computed = await computeDependentDatetime(dep, parent.datetime);
        dep.datetime = computed;
        await dep.save();
        await cascadeTimeUpdate(dep._id, computed);
    }
};

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, planId } = query;
    const filter = {};
    if (planId) filter.planId = planId;
    const [items, totalCount] = await Promise.all([
        Time.find(filter).sort({ datetime: 1 }).skip(Number(skip)).limit(Number(limit)),
        Time.countDocuments(filter),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Time.findById(id);
    if (!item) throw Object.assign(new Error('Time not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    if (data.parentTimeId && !data.datetime) {
        const parent = await Time.findById(data.parentTimeId);
        if (!parent) throw Object.assign(new Error('Parent time not found'), { status: 404 });
        if (data.routeId) {
            const route = await Route.findById(data.routeId);
            if (!route) throw Object.assign(new Error('Route not found'), { status: 404 });
            const sign = route.timeMode === 'depart_at' ? 1 : -1;
            data.datetime = new Date(parent.datetime.getTime() + sign * route.durationSeconds * 1000);
        } else {
            data.datetime = new Date(parent.datetime.getTime() + (data.offsetSeconds || 0) * 1000);
        }
    }
    const item = new Time(data);
    return item.save();
};

export const update = async (id, data) => {
    if (data.parentTimeId) {
        const parent = await Time.findById(data.parentTimeId);
        if (!parent) throw Object.assign(new Error('Parent time not found'), { status: 404 });
        if (data.routeId) {
            const route = await Route.findById(data.routeId);
            if (route) {
                const sign = route.timeMode === 'depart_at' ? 1 : -1;
                data.datetime = new Date(parent.datetime.getTime() + sign * (route.durationSeconds + (data.offsetSeconds || 0)) * 1000);
            }
        } else if (!data.datetime) {
            data.datetime = new Date(parent.datetime.getTime() + (data.offsetSeconds || 0) * 1000);
        }
    }
    const item = await Time.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Time not found'), { status: 404 });
    if (item.routeId && item.parentTimeId && !data.parentTimeId) {
        const parent = await Time.findById(item.parentTimeId);
        if (parent) {
            const computed = await computeDependentDatetime(item, parent.datetime);
            item.datetime = computed;
            await item.save();
        }
    }
    await cascadeTimeUpdate(item._id, item.datetime);
    return item;
};

export const remove = async (id) => {
    const item = await Time.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Time not found'), { status: 404 });
    await Time.updateMany({ parentTimeId: id }, { $set: { parentTimeId: null, offsetSeconds: 0, routeId: null } });
    return item;
};
