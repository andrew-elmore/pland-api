import mongoose from 'mongoose';
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

/**
 * How each plan-scoped record reaches its plan (`parent`) and which body fields reference
 * other records that must belong to the same plan (`refs`, as dotted body paths).
 */
const RECORDS = {
    Plan: { model: Plan, parent: null, refs: [['locationIds', 'Location'], ['itineraryIds', 'Itinerary']] },
    Group: { model: Group, parent: ['planId', 'Plan'], refs: [['participantIds', 'Participant']] },
    Itinerary: { model: Itinerary, parent: ['planId', 'Plan'], refs: [['stepIds', 'Step'], ['windowIds', 'Window']] },
    Location: { model: Location, parent: ['planId', 'Plan'], refs: [] },
    Participant: { model: Participant, parent: ['planId', 'Plan'], refs: [] },
    Role: { model: Role, parent: ['planId', 'Plan'], refs: [] },
    Time: { model: Time, parent: ['planId', 'Plan'], refs: [['parentTimeId', 'Time'], ['routeId', 'Route'], ['sourceTimeId', 'Time']] },
    Step: {
        model: Step,
        parent: ['itineraryId', 'Itinerary'],
        refs: [
            ['startTimeId', 'Time'], ['endTimeId', 'Time'], ['timeId', 'Time'],
            ['participantIds', 'Participant'], ['locationId', 'Location'], ['routeId', 'Route'],
            ['originLocationId', 'Location'], ['destinationLocationId', 'Location'],
            ['routeStep.timeId', 'Time'], ['routeStep.participantIds', 'Participant'],
            ['routeStep.originLocationId', 'Location'], ['routeStep.destinationLocationId', 'Location'],
            ['normalStep.participantIds', 'Participant'], ['normalStep.locationId', 'Location'],
        ],
    },
    Window: { model: Window, parent: ['itineraryId', 'Itinerary'], refs: [['timeslotIds', 'Timeslot']] },
    Timeslot: { model: Timeslot, parent: ['windowId', 'Window'], refs: [['startTimeId', 'Time'], ['endTimeId', 'Time']] },
    Route: { model: Route, parent: ['originLocationId', 'Location'], refs: [['destinationLocationId', 'Location']] },
};

const notFound = (kind) => Object.assign(new Error(`${kind} not found`), { status: 404 });

/**
 * Whether the payload carries an `_id`, a Mongo operator (`$`-prefixed) or a dotted-path key at any depth.
 * @param {*} value Request payload.
 * @returns {boolean}
 */
export const hasForbiddenKey = (value) => value !== null && typeof value === 'object'
    && Object.entries(value).some(([key, inner]) => key === '_id' || key.startsWith('$') || key.includes('.') || hasForbiddenKey(inner));

const valuesAt = (data, path) => [path.split('.').reduce((value, key) => value?.[key], data)]
    .flat()
    .filter((value) => value != null);

/**
 * Resolves the id of the plan a record belongs to by walking up its parent chain.
 * @param {string} kind Record kind, a key of `RECORDS`.
 * @param {*} id Record id.
 * @returns {Promise<string|null>} The plan id, or null when the record (or an ancestor) does not exist.
 */
const planOf = async (kind, id) => {
    if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) return null;
    const { model, parent } = RECORDS[kind];
    if (!parent) return (await model.exists({ _id: id })) ? id : null;
    const [field, parentKind] = parent;
    const doc = await model.findById(id).select(field).lean();
    return doc?.[field] ? planOf(parentKind, String(doc[field])) : null;
};

/**
 * Lists the ids of existing plans the user owns or participates in
 * (a Participant record linked to the user's Clerk id).
 * @param {string} userId Clerk user id.
 * @returns {Promise<import('mongoose').Types.ObjectId[]>}
 */
export const accessiblePlanIds = async (userId) => {
    const joinedPlanIds = await Participant.distinct('planId', { userId });
    return Plan.distinct('_id', { $or: [{ ownerId: userId }, { _id: { $in: joinedPlanIds } }] });
};

/**
 * Throws a 400 when the payload carries an `_id`, a Mongo operator (`$`-prefixed) or a
 * dotted-path key at any depth, since those would reach the write unchecked (a client-chosen
 * `_id` could re-create a deleted record and inherit its children). Otherwise throws a 404
 * unless the user may act on the record `id` (when given), on the parent the payload places
 * the record under, and on every record the payload references, all of which must be existing
 * records, given as id strings, in the same plan. An update may change the parent only to one
 * in the record's current plan, so no record (and nothing that points at it) can be carried
 * into another plan.
 * @param {string} userId Clerk user id.
 * @param {string} kind Record kind, a key of `RECORDS`.
 * @param {string|undefined} id Id of the existing record being read or changed.
 * @param {object} data Request payload.
 * @returns {Promise<void>}
 */
export const authorize = async (userId, kind, id, data = {}) => {
    if (hasForbiddenKey(data)) throw Object.assign(new Error('Invalid field name'), { status: 400 });
    const accessible = (await accessiblePlanIds(userId)).map(String);
    const { parent, refs } = RECORDS[kind];
    let planId = null;
    if (id !== undefined) {
        planId = await planOf(kind, id);
        if (!accessible.includes(planId)) throw notFound(kind);
    }
    if (parent && (id === undefined || data[parent[0]] !== undefined)) {
        const parentPlanId = await planOf(parent[1], data[parent[0]]);
        if (!accessible.includes(parentPlanId) || (id !== undefined && parentPlanId !== planId)) throw notFound(parent[1]);
        planId = parentPlanId;
    }
    await Promise.all(refs.flatMap(([path, refKind]) => valuesAt(data, path).map(async (refId) => {
        const refPlan = await planOf(refKind, refId);
        if (refPlan === null || refPlan !== planId) throw notFound(refKind);
    })));
};

/**
 * Returns a list endpoint's id filter from the query string, throwing a 400 unless it is a
 * single id string (a nested `?planId[$ne]=` query would otherwise reach the database filter).
 * @param {*} value Query string value.
 * @param {string} name Query parameter name, used in the error message.
 * @returns {string}
 */
export const queryId = (value, name) => {
    if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) throw Object.assign(new Error(`Invalid ${name}`), { status: 400 });
    return value;
};
