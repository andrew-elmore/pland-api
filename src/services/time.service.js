import Time from '../models/time.model.js';
import Route from '../models/route.model.js';
import * as routeService from './route.service.js';

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
    console.log(':~: cascade', JSON.stringify({ timeId, newDatetime, dependentCount: dependents.length, dependentIds: dependents.map(d => ({ id: d._id, label: d.label, routeId: d.routeId })) }));
    for (const dep of dependents) {
        let computed;
        if (dep.routeId) {
            const route = await Route.findById(dep.routeId);
            console.log(':~: cascade route-dependent', JSON.stringify({ depId: dep._id, routeId: dep.routeId, routeFound: !!route }));
            if (route) {
                try {
                    const routeResult = await routeService.calculate({
                        originLocationId: route.originLocationId,
                        destinationLocationId: route.destinationLocationId,
                        travelMode: route.travelMode,
                        transitModes: route.transitModes,
                        datetime: newDatetime,
                        timeMode: route.timeMode,
                    });
                    route.durationSeconds = routeResult.durationSeconds;
                    route.distanceMeters = routeResult.distanceMeters;
                    route.overviewPolyline = routeResult.overviewPolyline;
                    route.fare = routeResult.fare;
                    route.steps = routeResult.steps;
                    if (routeResult.departureTime) route.departureTime = routeResult.departureTime;
                    if (routeResult.arrivalTime) route.arrivalTime = routeResult.arrivalTime;
                    await route.save();
                    const pad = dep.offsetSeconds || 0;
                    if (route.timeMode === 'depart_at' && routeResult.arrivalTime) {
                        computed = new Date(routeResult.arrivalTime.getTime() + pad * 1000);
                    } else if (route.timeMode === 'arrive_by' && routeResult.departureTime) {
                        computed = new Date(routeResult.departureTime.getTime() - pad * 1000);
                    } else {
                        const sign = route.timeMode === 'depart_at' ? 1 : -1;
                        computed = new Date(newDatetime.getTime() + sign * (routeResult.durationSeconds + pad) * 1000);
                    }
                } catch (err) {
                    console.error('Route recalculation failed during cascade, using existing duration:', err.message);
                    computed = await computeDependentDatetime(dep, newDatetime);
                }
            } else {
                computed = await computeDependentDatetime(dep, newDatetime);
            }
        } else {
            computed = await computeDependentDatetime(dep, newDatetime);
        }
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
    console.log(':~: time.update called', JSON.stringify({ id, data: { ...data, datetime: data.datetime || undefined } }));
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
        console.log(':~: time.update computed datetime', JSON.stringify({ datetime: data.datetime }));
    }
    const item = await Time.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Time not found'), { status: 404 });
    console.log(':~: time.update saved', JSON.stringify({ id: item._id, label: item.label, datetime: item.datetime, routeId: item.routeId, parentTimeId: item.parentTimeId }));
    if (item.routeId && item.parentTimeId && !data.parentTimeId) {
        console.log(':~: time.update recomputing route-dependent time');
        const parent = await Time.findById(item.parentTimeId);
        if (parent) {
            const computed = await computeDependentDatetime(item, parent.datetime);
            item.datetime = computed;
            await item.save();
            console.log(':~: time.update recomputed', JSON.stringify({ newDatetime: computed }));
        }
    }
    console.log(':~: time.update calling cascadeTimeUpdate');
    await cascadeTimeUpdate(item._id, item.datetime);
    return item;
};

export const remove = async (id) => {
    const item = await Time.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Time not found'), { status: 404 });
    await Time.updateMany({ parentTimeId: id }, { $set: { parentTimeId: null, offsetSeconds: 0, routeId: null } });
    return item;
};
