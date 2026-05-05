import Route from '../models/route.model.js';
import Location from '../models/location.model.js';
import Step from '../models/step.model.js';
import Time from '../models/time.model.js';
import Itinerary from '../models/itinerary.model.js';
import * as timeService from './time.service.js';
import env from '../config/env.js';

const populateLocations = (query) => query.populate('originLocationId', 'name').populate('destinationLocationId', 'name');

const enrichWithTimes = async (flatRoutes) => {
    const routeIds = flatRoutes.map((r) => r.id);
    const steps = await Step.find({ routeId: { $in: routeIds } })
        .populate('startTimeId')
        .populate('endTimeId');
    const stepByRouteId = {};
    steps.forEach((s) => { stepByRouteId[s.routeId.toString()] = s; });
    return flatRoutes.map((r) => {
        const step = stepByRouteId[r.id];
        r.departureTime = step?.startTimeId?.datetime ?? null;
        r.arrivalTime = step?.endTimeId?.datetime ?? null;
        return r;
    });
};

const flattenRoute = (route) => {
    const obj = route.toJSON();
    if (obj.originLocationId && typeof obj.originLocationId === 'object') {
        obj.originLocation = obj.originLocationId;
        obj.originLocationId = obj.originLocationId.id ?? null;
    } else {
        obj.originLocation = null;
    }
    if (obj.destinationLocationId && typeof obj.destinationLocationId === 'object') {
        obj.destinationLocation = obj.destinationLocationId;
        obj.destinationLocationId = obj.destinationLocationId.id ?? null;
    } else {
        obj.destinationLocation = null;
    }
    return obj;
};

const hasFerrySegment = (route) =>
    route.legs[0].steps.some(s => s.transit_details?.line?.vehicle?.type === 'FERRY');

const extractTransitDetails = (s) => {
    if (!s.transit_details) return null;
    const td = s.transit_details;
    const line = td.line || {};
    return {
        lineName: line.name || null,
        lineShortName: line.short_name || null,
        lineColor: line.color || null,
        lineTextColor: line.text_color || null,
        vehicleType: line.vehicle?.type || null,
        vehicleName: line.vehicle?.name || null,
        vehicleIcon: line.vehicle?.icon || null,
        departureStop: td.departure_stop?.name || null,
        arrivalStop: td.arrival_stop?.name || null,
        departureTime: td.departure_time?.value ? new Date(td.departure_time.value * 1000) : null,
        arrivalTime: td.arrival_time?.value ? new Date(td.arrival_time.value * 1000) : null,
        numStops: td.num_stops ?? null,
        headway: td.headway ?? null,
        agencyName: line.agencies?.[0]?.name || null,
        agencyUrl: line.agencies?.[0]?.url || null,
    };
};

const extractRouteResult = (googleRoute) => {
    const leg = googleRoute.legs[0];
    return {
        durationSeconds: leg.duration.value,
        distanceMeters: leg.distance.value,
        departureTime: leg.departure_time?.value ? new Date(leg.departure_time.value * 1000) : null,
        arrivalTime: leg.arrival_time?.value ? new Date(leg.arrival_time.value * 1000) : null,
        overviewPolyline: googleRoute.overview_polyline?.points || '',
        fare: googleRoute.fare ? {
            currency: googleRoute.fare.currency,
            value: googleRoute.fare.value,
            text: googleRoute.fare.text,
        } : null,
        steps: (leg.steps || []).map(s => ({
            htmlInstructions: s.html_instructions,
            maneuver: s.maneuver || null,
            distanceMeters: s.distance.value,
            durationSeconds: s.duration.value,
            startLat: s.start_location.lat,
            startLng: s.start_location.lng,
            endLat: s.end_location.lat,
            endLng: s.end_location.lng,
            polyline: s.polyline?.points || '',
            travelMode: s.travel_mode,
            transitDetails: extractTransitDetails(s),
        })),
    };
};

export const calculate = async (data) => {
    const { originLocationId, destinationLocationId, travelMode, transitModes, datetime, timeMode } = data;
    const [origin, destination] = await Promise.all([
        Location.findById(originLocationId),
        Location.findById(destinationLocationId),
    ]);
    if (!origin) throw Object.assign(new Error('Origin location not found'), { status: 404 });
    if (!destination) throw Object.assign(new Error('Destination location not found'), { status: 404 });

    const modeMap = { drive: 'driving', walk: 'walking', transit: 'transit' };
    const googleMode = modeMap[travelMode];
    if (!googleMode) throw Object.assign(new Error('Invalid travel mode'), { status: 400 });

    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=${googleMode}&key=${env.googleMapsApiKey}`;

    if (datetime) {
        const epochSeconds = Math.floor(new Date(datetime).getTime() / 1000);
        if (travelMode === 'transit' && timeMode === 'arrive_by') {
            url += `&arrival_time=${epochSeconds}`;
        } else {
            url += `&departure_time=${epochSeconds}`;
        }
    }

    const wantsFerry = transitModes?.includes('ferry');
    if (travelMode === 'transit' && transitModes?.length) {
        const apiModes = transitModes.filter(m => m !== 'ferry');
        if (apiModes.length) {
            url += `&transit_mode=${apiModes.join('|')}`;
        }
        if (wantsFerry) {
            url += '&alternatives=true';
        }
    }

    const response = await fetch(url);
    const json = await response.json();

    if (json.status !== 'OK' || !json.routes?.length) {
        throw Object.assign(new Error(`Google Maps error: ${json.status}`), { status: 502 });
    }

    if (wantsFerry && json.routes.length > 1) {
        const ferryRoute = json.routes.find(hasFerrySegment);
        return extractRouteResult(ferryRoute || json.routes[0]);
    }

    return extractRouteResult(json.routes[0]);
};

export const preview = async (data) => {
    const { originLocationId, destinationLocationId, travelMode, transitModes, datetime, timeMode } = data;
    const [origin, destination] = await Promise.all([
        Location.findById(originLocationId),
        Location.findById(destinationLocationId),
    ]);
    if (!origin) throw Object.assign(new Error('Origin location not found'), { status: 404 });
    if (!destination) throw Object.assign(new Error('Destination location not found'), { status: 404 });

    const modeMap = { drive: 'driving', walk: 'walking', transit: 'transit' };
    const googleMode = modeMap[travelMode];
    if (!googleMode) throw Object.assign(new Error('Invalid travel mode'), { status: 400 });

    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=${googleMode}&key=${env.googleMapsApiKey}&alternatives=true`;

    if (datetime) {
        const epochSeconds = Math.floor(new Date(datetime).getTime() / 1000);
        if (travelMode === 'transit' && timeMode === 'arrive_by') {
            url += `&arrival_time=${epochSeconds}`;
        } else {
            url += `&departure_time=${epochSeconds}`;
        }
    }

    if (travelMode === 'transit' && transitModes?.length) {
        const apiModes = transitModes.filter(m => m !== 'ferry');
        if (apiModes.length) {
            url += `&transit_mode=${apiModes.join('|')}`;
        }
    }

    const response = await fetch(url);
    const json = await response.json();

    if (json.status !== 'OK' || !json.routes?.length) {
        throw Object.assign(new Error(`Google Maps error: ${json.status}`), { status: 502 });
    }

    return json.routes.map((route) => ({
        ...extractRouteResult(route),
        summary: route.summary || '',
    }));
};

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, planId } = query;
    let filter = {};
    if (planId) {
        const itineraries = await Itinerary.find({ planId }).select('_id');
        const steps = await Step.find({
            itineraryId: { $in: itineraries.map(i => i._id) },
            routeId: { $ne: null },
        }).select('routeId');
        filter._id = { $in: steps.map(s => s.routeId) };
    }
    const [items, totalCount] = await Promise.all([
        populateLocations(Route.find(filter).skip(Number(skip)).limit(Number(limit))),
        Route.countDocuments(filter),
    ]);
    const enriched = await enrichWithTimes(items.map(flattenRoute));
    return { items: enriched, totalCount };
};

export const get = async (id) => {
    const item = await populateLocations(Route.findById(id));
    if (!item) throw Object.assign(new Error('Route not found'), { status: 404 });
    const enriched = await enrichWithTimes([flattenRoute(item)]);
    return enriched[0];
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

export const recalculateAll = async (planId) => {
    if (!planId) throw Object.assign(new Error('planId is required'), { status: 400 });
    const itineraries = await Itinerary.find({ planId }).select('_id');
    const steps = await Step.find({
        itineraryId: { $in: itineraries.map(i => i._id) },
        routeId: { $ne: null },
    }).select('routeId');
    const routeIds = [...new Set(steps.map(s => s.routeId.toString()))];

    const results = [];
    for (const routeId of routeIds) {
        const route = await Route.findById(routeId);
        if (!route) continue;

        const step = await Step.findOne({ routeId: route._id });
        let datetime = null;
        if (step) {
            const refTimeId = route.timeMode === 'depart_at' ? step.startTimeId : step.endTimeId;
            if (refTimeId) {
                const refTime = await Time.findById(refTimeId);
                datetime = refTime?.datetime ?? null;
            }
        }

        const routeResult = await calculate({
            originLocationId: route.originLocationId,
            destinationLocationId: route.destinationLocationId,
            travelMode: route.travelMode,
            transitModes: route.transitModes,
            datetime,
            timeMode: route.timeMode,
        });

        route.durationSeconds = routeResult.durationSeconds;
        route.distanceMeters = routeResult.distanceMeters;
        route.overviewPolyline = routeResult.overviewPolyline;
        route.fare = routeResult.fare;
        route.steps = routeResult.steps;
        await route.save();

        const computedTimes = await Time.find({ routeId: route._id });
        for (const ct of computedTimes) {
            const pad = ct.offsetSeconds || 0;
            let newDatetime;
            if (route.timeMode === 'depart_at' && routeResult.arrivalTime) {
                newDatetime = new Date(routeResult.arrivalTime.getTime() + pad * 1000);
            } else if (route.timeMode === 'arrive_by' && routeResult.departureTime) {
                newDatetime = new Date(routeResult.departureTime.getTime() - pad * 1000);
            } else {
                const parent = ct.parentTimeId ? await Time.findById(ct.parentTimeId) : null;
                if (!parent) continue;
                const sign = route.timeMode === 'depart_at' ? 1 : -1;
                newDatetime = new Date(parent.datetime.getTime() + sign * (routeResult.durationSeconds + pad) * 1000);
            }
            ct.datetime = newDatetime;
            await ct.save();
            await timeService.cascadeTimeUpdate(ct._id, newDatetime);
        }

        const populated = await populateLocations(Route.findById(route._id));
        results.push(flattenRoute(populated));
    }

    const enriched = await enrichWithTimes(results);
    return { items: enriched, totalCount: enriched.length };
};
