import Step from '../models/step.model.js';
import Time from '../models/time.model.js';
import Route from '../models/route.model.js';
import Location from '../models/location.model.js';
import Itinerary from '../models/itinerary.model.js';
import * as routeService from './route.service.js';
import * as timeService from './time.service.js';

const populateRefs = (query) => query.populate('startTimeId').populate('endTimeId').populate('routeId');

const flattenStep = (step) => {
    const obj = step.toJSON();
    obj.startTime = obj.startTimeId?.datetime ?? null;
    obj.endTime = obj.endTimeId?.datetime ?? null;
    obj.startTimeId = obj.startTimeId?.id ?? null;
    obj.endTimeId = obj.endTimeId?.id ?? null;
    if (obj.routeId && typeof obj.routeId === 'object') {
        obj.route = obj.routeId;
        obj.routeId = obj.routeId.id ?? null;
    } else {
        obj.route = null;
    }
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
        populateRefs(Step.find(filter).skip(Number(skip)).limit(Number(limit))),
        Step.countDocuments(filter),
    ]);
    return { items: items.map(flattenStep), totalCount };
};

export const get = async (id) => {
    const item = await populateRefs(Step.findById(id));
    if (!item) throw Object.assign(new Error('Step not found'), { status: 404 });
    return flattenStep(item);
};

export const create = async (data) => {
    const { startTime, endTime, startTimeId, endTimeId, originLocationId, destinationLocationId, travelMode, transitModes, timeId, timeMode, paddingSeconds, routeData, ...rest } = data;
    const planId = await getPlanId(rest.itineraryId);

    if (originLocationId && destinationLocationId && travelMode) {
        const selectedTime = await Time.findById(timeId);
        if (!selectedTime) throw Object.assign(new Error('Time not found'), { status: 404 });

        const routeResult = routeData
            ? { ...routeData, departureTime: routeData.departureTime ? new Date(routeData.departureTime) : null, arrivalTime: routeData.arrivalTime ? new Date(routeData.arrivalTime) : null }
            : await routeService.calculate({ originLocationId, destinationLocationId, travelMode, transitModes, datetime: selectedTime.datetime, timeMode });
        const route = await new Route({
            originLocationId,
            destinationLocationId,
            travelMode,
            timeMode,
            transitModes: transitModes || [],
            durationSeconds: routeResult.durationSeconds,
            distanceMeters: routeResult.distanceMeters,
            overviewPolyline: routeResult.overviewPolyline,
            fare: routeResult.fare || null,
            steps: routeResult.steps,
        }).save();

        const destination = await Location.findById(destinationLocationId);
        const destName = destination?.name || 'destination';

        const pad = paddingSeconds || 0;
        let resolvedStartTimeId;
        let resolvedEndTimeId;
        if (timeMode === 'depart_at') {
            resolvedStartTimeId = timeId;
            const arrivalDatetime = routeResult.arrivalTime
                ? new Date(routeResult.arrivalTime.getTime() + pad * 1000)
                : new Date(selectedTime.datetime.getTime() + (routeResult.durationSeconds + pad) * 1000);
            const arrivalTime = await new Time({ planId, datetime: arrivalDatetime, parentTimeId: timeId, routeId: route._id, offsetSeconds: pad, label: `Arrive at ${destName}` }).save();
            resolvedEndTimeId = arrivalTime._id;
        } else {
            resolvedEndTimeId = timeId;
            const departureDatetime = routeResult.departureTime
                ? new Date(routeResult.departureTime.getTime() - pad * 1000)
                : new Date(selectedTime.datetime.getTime() - (routeResult.durationSeconds + pad) * 1000);
            const departureTime = await new Time({ planId, datetime: departureDatetime, parentTimeId: timeId, routeId: route._id, offsetSeconds: pad, label: `Leave for ${destName}` }).save();
            resolvedStartTimeId = departureTime._id;
        }

        const item = new Step({ ...rest, startTimeId: resolvedStartTimeId, endTimeId: resolvedEndTimeId, routeId: route._id });
        const saved = await item.save();
        const populated = await populateRefs(Step.findById(saved._id));
        return flattenStep(populated);
    }

    const resolvedStartTimeId = startTimeId ?? (await new Time({ planId, datetime: startTime }).save())._id;
    const resolvedEndTimeId = endTimeId ?? (await new Time({ planId, datetime: endTime }).save())._id;
    const item = new Step({ ...rest, startTimeId: resolvedStartTimeId, endTimeId: resolvedEndTimeId });
    const saved = await item.save();
    const populated = await populateRefs(Step.findById(saved._id));
    return flattenStep(populated);
};

export const createWithDuration = async (data) => {
    const { durationSeconds, endTimeLabel, startTimeLabel, ...rest } = data;
    const planId = await getPlanId(rest.itineraryId);

    if (rest.startTimeId && !rest.endTimeId) {
        const parentTime = await Time.findById(rest.startTimeId);
        if (!parentTime) throw Object.assign(new Error('Start time not found'), { status: 404 });
        const endDatetime = new Date(parentTime.datetime.getTime() + durationSeconds * 1000);
        const endTime = await new Time({
            planId,
            datetime: endDatetime,
            parentTimeId: rest.startTimeId,
            offsetSeconds: durationSeconds,
            label: endTimeLabel || `${rest.name} End`,
        }).save();
        rest.endTimeId = endTime._id;
    } else if (rest.endTimeId && !rest.startTimeId) {
        const parentTime = await Time.findById(rest.endTimeId);
        if (!parentTime) throw Object.assign(new Error('End time not found'), { status: 404 });
        const startDatetime = new Date(parentTime.datetime.getTime() - durationSeconds * 1000);
        const startTime = await new Time({
            planId,
            datetime: startDatetime,
            parentTimeId: rest.endTimeId,
            offsetSeconds: -durationSeconds,
            label: startTimeLabel || `${rest.name} Start`,
        }).save();
        rest.startTimeId = startTime._id;
    }

    const item = new Step({ ...rest });
    const saved = await item.save();
    const populated = await populateRefs(Step.findById(saved._id));
    return flattenStep(populated);
};

export const createWithTravel = async (data) => {
    const { itineraryId, direction, routeStep, normalStep } = data;
    const planId = await getPlanId(itineraryId);

    const selectedTime = await Time.findById(routeStep.timeId);
    if (!selectedTime) throw Object.assign(new Error('Time not found'), { status: 404 });

    const routeResult = routeStep.routeData
        ? { ...routeStep.routeData, departureTime: routeStep.routeData.departureTime ? new Date(routeStep.routeData.departureTime) : null, arrivalTime: routeStep.routeData.arrivalTime ? new Date(routeStep.routeData.arrivalTime) : null }
        : await routeService.calculate({ originLocationId: routeStep.originLocationId, destinationLocationId: routeStep.destinationLocationId, travelMode: routeStep.travelMode, transitModes: routeStep.transitModes, datetime: selectedTime.datetime, timeMode: routeStep.timeMode });

    const route = await new Route({
        originLocationId: routeStep.originLocationId,
        destinationLocationId: routeStep.destinationLocationId,
        travelMode: routeStep.travelMode,
        timeMode: routeStep.timeMode,
        transitModes: routeStep.transitModes || [],
        durationSeconds: routeResult.durationSeconds,
        distanceMeters: routeResult.distanceMeters,
        overviewPolyline: routeResult.overviewPolyline,
        fare: routeResult.fare || null,
        steps: routeResult.steps,
    }).save();

    const destination = await Location.findById(routeStep.destinationLocationId);
    const destName = destination?.name || 'destination';
    const pad = routeStep.paddingSeconds || 0;

    let routeStepStartTimeId, routeStepEndTimeId;
    if (routeStep.timeMode === 'depart_at') {
        routeStepStartTimeId = routeStep.timeId;
        const arrivalDatetime = routeResult.arrivalTime
            ? new Date(routeResult.arrivalTime.getTime() + pad * 1000)
            : new Date(selectedTime.datetime.getTime() + (routeResult.durationSeconds + pad) * 1000);
        const arrivalTime = await new Time({ planId, datetime: arrivalDatetime, parentTimeId: routeStep.timeId, routeId: route._id, offsetSeconds: pad, label: `Arrive at ${destName}` }).save();
        routeStepEndTimeId = arrivalTime._id;
    } else {
        routeStepEndTimeId = routeStep.timeId;
        const departureDatetime = routeResult.departureTime
            ? new Date(routeResult.departureTime.getTime() - pad * 1000)
            : new Date(selectedTime.datetime.getTime() - (routeResult.durationSeconds + pad) * 1000);
        const departureTime = await new Time({ planId, datetime: departureDatetime, parentTimeId: routeStep.timeId, routeId: route._id, offsetSeconds: pad, label: `Leave for ${destName}` }).save();
        routeStepStartTimeId = departureTime._id;
    }

    const origin = await Location.findById(routeStep.originLocationId);
    const originName = origin?.name || 'origin';
    const routeStepName = `${originName} → ${destName}`;

    const savedRouteStep = await new Step({
        itineraryId,
        name: routeStepName,
        startTimeId: routeStepStartTimeId,
        endTimeId: routeStepEndTimeId,
        participantIds: routeStep.participantIds || [],
        routeId: route._id,
    }).save();

    let anchorTimeId;
    if (direction === 'after') {
        anchorTimeId = routeStepEndTimeId;
    } else {
        anchorTimeId = routeStepStartTimeId;
    }

    const anchorTime = await Time.findById(anchorTimeId);
    let normalStepStartTimeId, normalStepEndTimeId;
    if (direction === 'after') {
        normalStepStartTimeId = anchorTimeId;
        const endDatetime = new Date(anchorTime.datetime.getTime() + normalStep.durationSeconds * 1000);
        const endTime = await new Time({
            planId,
            datetime: endDatetime,
            parentTimeId: anchorTimeId,
            offsetSeconds: normalStep.durationSeconds,
            label: normalStep.durationTimeLabel || `${normalStep.name} End`,
        }).save();
        normalStepEndTimeId = endTime._id;
    } else {
        normalStepEndTimeId = anchorTimeId;
        const startDatetime = new Date(anchorTime.datetime.getTime() - normalStep.durationSeconds * 1000);
        const startTime = await new Time({
            planId,
            datetime: startDatetime,
            parentTimeId: anchorTimeId,
            offsetSeconds: -normalStep.durationSeconds,
            label: normalStep.durationTimeLabel || `${normalStep.name} Start`,
        }).save();
        normalStepStartTimeId = startTime._id;
    }

    const savedNormalStep = await new Step({
        itineraryId,
        name: normalStep.name,
        startTimeId: normalStepStartTimeId,
        endTimeId: normalStepEndTimeId,
        participantIds: normalStep.participantIds || [],
        locationId: normalStep.locationId,
    }).save();

    const [populatedRouteStep, populatedNormalStep] = await Promise.all([
        populateRefs(Step.findById(savedRouteStep._id)),
        populateRefs(Step.findById(savedNormalStep._id)),
    ]);

    return {
        routeStep: flattenStep(populatedRouteStep),
        normalStep: flattenStep(populatedNormalStep),
    };
};

export const update = async (id, data) => {
    const { startTime, endTime, startTimeId, endTimeId, originLocationId, destinationLocationId, travelMode, transitModes, timeId, timeMode, paddingSeconds, routeData, ...rest } = data;
    const existing = await Step.findById(id);
    if (!existing) throw Object.assign(new Error('Step not found'), { status: 404 });

    if (originLocationId && destinationLocationId && travelMode) {
        const planId = await getPlanId(existing.itineraryId);
        const selectedTime = await Time.findById(timeId);
        if (!selectedTime) throw Object.assign(new Error('Time not found'), { status: 404 });

        const routeResult = routeData
            ? { ...routeData, departureTime: routeData.departureTime ? new Date(routeData.departureTime) : null, arrivalTime: routeData.arrivalTime ? new Date(routeData.arrivalTime) : null }
            : await routeService.calculate({ originLocationId, destinationLocationId, travelMode, transitModes, datetime: selectedTime.datetime, timeMode });

        const routeFields = {
            originLocationId,
            destinationLocationId,
            travelMode,
            timeMode,
            transitModes: transitModes || [],
            durationSeconds: routeResult.durationSeconds,
            distanceMeters: routeResult.distanceMeters,
            overviewPolyline: routeResult.overviewPolyline,
            fare: routeResult.fare || null,
            steps: routeResult.steps,
        };

        let routeRef;
        if (existing.routeId) {
            routeRef = await Route.findByIdAndUpdate(existing.routeId, routeFields, { new: true, runValidators: true });
        } else {
            routeRef = await new Route(routeFields).save();
            rest.routeId = routeRef._id;
        }

        const destination = await Location.findById(destinationLocationId);
        const destName = destination?.name || 'destination';

        const pad = paddingSeconds || 0;
        if (timeMode === 'depart_at') {
            rest.startTimeId = timeId;
            const arrivalDatetime = routeResult.arrivalTime
                ? new Date(routeResult.arrivalTime.getTime() + pad * 1000)
                : new Date(selectedTime.datetime.getTime() + (routeResult.durationSeconds + pad) * 1000);
            if (existing.endTimeId) {
                await Time.findByIdAndUpdate(existing.endTimeId, { datetime: arrivalDatetime, parentTimeId: timeId, routeId: routeRef._id, offsetSeconds: pad, label: `Arrive at ${destName}` }, { runValidators: true });
            } else {
                const arrivalTime = await new Time({ planId, datetime: arrivalDatetime, parentTimeId: timeId, routeId: routeRef._id, offsetSeconds: pad, label: `Arrive at ${destName}` }).save();
                rest.endTimeId = arrivalTime._id;
            }
        } else {
            rest.endTimeId = timeId;
            const departureDatetime = routeResult.departureTime
                ? new Date(routeResult.departureTime.getTime() - pad * 1000)
                : new Date(selectedTime.datetime.getTime() - (routeResult.durationSeconds + pad) * 1000);
            if (existing.startTimeId) {
                await Time.findByIdAndUpdate(existing.startTimeId, { datetime: departureDatetime, parentTimeId: timeId, routeId: routeRef._id, offsetSeconds: pad, label: `Leave for ${destName}` }, { runValidators: true });
            } else {
                const departureTime = await new Time({ planId, datetime: departureDatetime, parentTimeId: timeId, routeId: routeRef._id, offsetSeconds: pad, label: `Leave for ${destName}` }).save();
                rest.startTimeId = departureTime._id;
            }
        }

        await timeService.recalculateForRoute(routeRef._id);

        const item = await populateRefs(Step.findByIdAndUpdate(id, rest, { new: true, runValidators: true }));
        if (!item) throw Object.assign(new Error('Step not found'), { status: 404 });
        return flattenStep(item);
    }

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

    const item = await populateRefs(Step.findByIdAndUpdate(id, rest, { new: true, runValidators: true }));
    if (!item) throw Object.assign(new Error('Step not found'), { status: 404 });
    return flattenStep(item);
};

export const remove = async (id) => {
    const item = await Step.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Step not found'), { status: 404 });

    if (item.routeId) {
        await Route.findByIdAndDelete(item.routeId);
        const computedTime = await Time.findOne({ routeId: item.routeId });
        if (computedTime) {
            await Time.findByIdAndDelete(computedTime._id);
            await Time.updateMany({ parentTimeId: computedTime._id }, { $set: { parentTimeId: null, offsetSeconds: 0, routeId: null } });
        }
    }

    return item;
};
