import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.AUTH_MODE = 'dev';
process.env.NODE_ENV = 'test';

if (!process.env.TEST_MONGODB_URI) {
    throw new Error('TEST_MONGODB_URI is required. This suite drops its database, so point it at a disposable mongod.');
}

process.env.MONGODB_URI = process.env.TEST_MONGODB_URI;

const { default: mongoose } = await import('mongoose');
const { default: app } = await import('../src/app.js');
const { linkUserByEmail } = await import('../src/services/participant.service.js');

const ALICE = { id: 'user_alice', email: 'alice@example.com', firstName: 'Alice' };
const BOB = { id: 'user_bob', email: 'bob@example.com', firstName: 'Bob' };
const CAROL = { id: 'user_carol', email: 'carol@example.com', firstName: 'Carol' };

let server;
let baseUrl;

const call = async (user, method, path, body) => {
    const response = await fetch(`${baseUrl}/api${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Dev-User': encodeURIComponent(JSON.stringify(user)),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
};

const ok = async (user, method, path, body) => {
    const result = await call(user, method, path, body);
    assert.ok(result.status < 300, `${method} ${path} -> ${result.status} ${JSON.stringify(result.body)}`);
    return result.body;
};

const alice = {};
const bob = {};

before(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    await mongoose.connection.dropDatabase();
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    alice.plan = await ok(ALICE, 'POST', '/plans', { name: 'Alice plan' });
    const planId = alice.plan.id;
    alice.location = await ok(ALICE, 'POST', '/locations', { planId, name: 'Home', latitude: 1, longitude: 1 });
    alice.otherLocation = await ok(ALICE, 'POST', '/locations', { planId, name: 'Work', latitude: 2, longitude: 2 });
    alice.itinerary = await ok(ALICE, 'POST', '/itineraries', { planId, name: 'Day 1' });
    alice.start = await ok(ALICE, 'POST', '/times', { planId, datetime: '2026-01-01T09:00:00Z' });
    alice.end = await ok(ALICE, 'POST', '/times', { planId, datetime: '2026-01-01T10:00:00Z' });
    alice.participant = await ok(ALICE, 'POST', '/participants', { planId, firstName: 'Dan', email: 'dan@example.com', role: 'attendee' });
    alice.group = await ok(ALICE, 'POST', '/groups', { planId, name: 'Crew', participantIds: [alice.participant.id] });
    alice.step = await ok(ALICE, 'POST', '/steps', {
        itineraryId: alice.itinerary.id,
        name: 'Breakfast',
        startTimeId: alice.start.id,
        endTimeId: alice.end.id,
        participantIds: [alice.participant.id],
        locationId: alice.location.id,
    });
    alice.route = await ok(ALICE, 'POST', '/routes', {
        originLocationId: alice.location.id,
        destinationLocationId: alice.otherLocation.id,
        travelMode: 'drive',
        timeMode: 'depart_at',
        durationSeconds: 600,
        distanceMeters: 1000,
    });
    alice.window = await ok(ALICE, 'POST', '/windows', { itineraryId: alice.itinerary.id, userId: ALICE.id });
    alice.timeslot = await ok(ALICE, 'POST', '/timeslots', { windowId: alice.window.id, startTimeId: alice.start.id, endTimeId: alice.end.id });
    alice.role = await ok(ALICE, 'POST', '/roles', { planId, userId: ALICE.id, type: 'admin' });
    alice.profile = await ok(ALICE, 'POST', '/profiles', { firstName: 'Alice' });

    bob.plan = await ok(BOB, 'POST', '/plans', { name: 'Bob plan' });
    bob.itinerary = await ok(BOB, 'POST', '/itineraries', { planId: bob.plan.id, name: 'Bob day' });
    bob.location = await ok(BOB, 'POST', '/locations', { planId: bob.plan.id, name: 'Bob home', latitude: 3, longitude: 3 });
    bob.time = await ok(BOB, 'POST', '/times', { planId: bob.plan.id, datetime: '2026-01-01T09:00:00Z' });
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

const records = () => [
    ['/plans', alice.plan],
    ['/locations', alice.location],
    ['/itineraries', alice.itinerary],
    ['/times', alice.start],
    ['/participants', alice.participant],
    ['/groups', alice.group],
    ['/steps', alice.step],
    ['/routes', alice.route],
    ['/windows', alice.window],
    ['/timeslots', alice.timeslot],
    ['/roles', alice.role],
    ['/profiles', alice.profile],
];

describe('a signed-in user who is not on the plan', () => {
    test('cannot read, update or delete any of its records', async () => {
        for (const [path, record] of records()) {
            for (const [method, body] of [['GET'], ['PUT', { name: 'hacked' }], ['DELETE']]) {
                const result = await call(BOB, method, `${path}/${record.id}`, body);
                assert.equal(result.status, 404, `${method} ${path}/:id returned ${result.status}`);
            }
        }
        for (const [path, record] of records()) {
            await ok(ALICE, 'GET', `${path}/${record.id}`);
        }
        const plan = await ok(ALICE, 'GET', `/plans/${alice.plan.id}`);
        assert.equal(plan.name, 'Alice plan');
    });

    test('sees none of its records in list endpoints', async () => {
        const planId = alice.plan.id;
        const lists = [
            `/locations?planId=${planId}`, `/itineraries?planId=${planId}`, `/times?planId=${planId}`,
            `/participants?planId=${planId}`, `/groups?planId=${planId}`, `/routes?planId=${planId}`,
            `/steps?itineraryId=${alice.itinerary.id}`, '/windows', '/timeslots', '/roles', '/profiles',
        ];
        for (const path of lists) {
            const result = await ok(BOB, 'GET', path);
            const leaked = result.items.filter((item) => item.planId === planId
                || item.itineraryId === alice.itinerary.id
                || item.windowId === alice.window.id
                || item.id === alice.route.id
                || item.id === alice.profile.id);
            assert.deepEqual(leaked, [], `GET ${path} leaked records`);
        }
        const plans = await ok(BOB, 'GET', '/plans');
        assert.deepEqual(plans.items.map((plan) => plan.id), [bob.plan.id]);
    });

    test('cannot create records under the plan', async () => {
        const planId = alice.plan.id;
        const attempts = [
            ['/locations', { planId, name: 'x' }],
            ['/itineraries', { planId, name: 'x' }],
            ['/times', { planId, datetime: '2026-01-01T09:00:00Z' }],
            ['/participants', { planId, firstName: 'x', email: 'x@example.com', role: 'attendee' }],
            ['/groups', { planId, name: 'x' }],
            ['/roles', { planId, userId: BOB.id, type: 'admin' }],
            ['/steps', { itineraryId: alice.itinerary.id, name: 'x', startTimeId: alice.start.id, endTimeId: alice.end.id }],
            ['/steps/create-with-duration', { itineraryId: alice.itinerary.id, name: 'x', startTimeId: alice.start.id, durationSeconds: 60 }],
            ['/steps/create-with-travel', { itineraryId: alice.itinerary.id, direction: 'after', routeStep: {}, normalStep: {} }],
            ['/windows', { itineraryId: alice.itinerary.id, userId: BOB.id }],
            ['/timeslots', { windowId: alice.window.id, startTimeId: alice.start.id, endTimeId: alice.end.id }],
            ['/routes', { originLocationId: alice.location.id, destinationLocationId: alice.otherLocation.id, travelMode: 'drive', timeMode: 'depart_at', durationSeconds: 1, distanceMeters: 1 }],
            ['/routes/calculate', { originLocationId: alice.location.id, destinationLocationId: alice.otherLocation.id, travelMode: 'drive' }],
            ['/routes/preview', { originLocationId: alice.location.id, destinationLocationId: alice.otherLocation.id, travelMode: 'drive' }],
            ['/routes/recalculate-all', { planId }],
            [`/times/${alice.start.id}/merge`, { sourceTimeId: alice.end.id }],
        ];
        for (const [path, body] of attempts) {
            const result = await call(BOB, 'POST', path, body);
            assert.equal(result.status, 404, `POST ${path} returned ${result.status}`);
        }
    });

    test('cannot reference its records from their own plan or move their records into it', async () => {
        const attempts = [
            ['POST', '/steps', { itineraryId: bob.itinerary.id, name: 'x', startTimeId: alice.start.id, endTimeId: bob.time.id }],
            ['POST', '/steps', { itineraryId: bob.itinerary.id, name: 'x', startTimeId: bob.time.id, endTimeId: bob.time.id, participantIds: [alice.participant.id] }],
            ['POST', '/routes/calculate', { originLocationId: bob.location.id, destinationLocationId: alice.location.id, travelMode: 'drive' }],
            ['POST', `/times/${bob.time.id}/merge`, { sourceTimeId: alice.start.id }],
            ['PUT', `/times/${bob.time.id}`, { parentTimeId: alice.start.id }],
            ['PUT', `/locations/${bob.location.id}`, { planId: alice.plan.id }],
        ];
        for (const [method, path, body] of attempts) {
            const result = await call(BOB, method, path, body);
            assert.equal(result.status, 404, `${method} ${path} returned ${result.status}`);
        }
        await ok(ALICE, 'GET', `/times/${alice.start.id}`);
    });
});

describe('a signed-in user linked as a participant', () => {
    test('can read and change the plan records, but not take ownership', async () => {
        await ok(ALICE, 'POST', '/participants', { planId: alice.plan.id, firstName: 'Carol', email: CAROL.email, role: 'attendee' });
        await linkUserByEmail(CAROL.email, CAROL.id);
        await ok(CAROL, 'GET', `/plans/${alice.plan.id}`);
        await ok(CAROL, 'GET', `/steps/${alice.step.id}`);
        await ok(CAROL, 'PUT', `/locations/${alice.location.id}`, { name: 'Home base' });
        const locations = await ok(CAROL, 'GET', `/locations?planId=${alice.plan.id}`);
        assert.equal(locations.totalCount, 2);
        const plan = await ok(CAROL, 'PUT', `/plans/${alice.plan.id}`, { ownerId: CAROL.id, name: 'Shared plan' });
        assert.equal(plan.ownerId, ALICE.id);
        assert.equal((await call(CAROL, 'GET', `/profiles/${alice.profile.id}`)).status, 404);
    });
});

describe('a payload with Mongo operators or dotted paths', () => {
    test('is refused with 400 and changes nothing', async () => {
        const participant = await ok(BOB, 'POST', '/participants', { planId: bob.plan.id, firstName: 'Eve', email: 'eve@example.com', role: 'attendee' });
        const group = await ok(BOB, 'POST', '/groups', { planId: bob.plan.id, name: 'Bob crew', participantIds: [participant.id] });
        const end = await ok(BOB, 'POST', '/times', { planId: bob.plan.id, datetime: '2026-01-01T10:00:00Z' });
        const step = await ok(BOB, 'POST', '/steps', { itineraryId: bob.itinerary.id, name: 'Bob step', startTimeId: bob.time.id, endTimeId: end.id });

        const attempts = [
            [`/participants/${participant.id}`, { $set: { planId: alice.plan.id, userId: BOB.id } }],
            [`/locations/${bob.location.id}`, { $set: { planId: alice.plan.id } }],
            [`/groups/${group.id}`, { $push: { participantIds: alice.participant.id } }],
            [`/groups/${group.id}`, { 'participantIds.1': alice.participant.id }],
            [`/steps/${step.id}`, { $set: { startTimeId: alice.start.id } }],
            [`/plans/${bob.plan.id}`, { $set: { ownerId: 'other' } }],
            [`/plans/${bob.plan.id}`, { name: 'Bob plan', nested: { $set: { ownerId: 'other' } } }],
        ];
        for (const [path, body] of attempts) {
            const result = await call(BOB, 'PUT', path, body);
            assert.equal(result.status, 400, `PUT ${path} ${JSON.stringify(body)} returned ${result.status}`);
            assert.equal(result.body.error, 'Invalid field name');
        }

        const storedParticipant = await ok(BOB, 'GET', `/participants/${participant.id}`);
        assert.equal(storedParticipant.planId, bob.plan.id);
        assert.notEqual(storedParticipant.userId, BOB.id);
        assert.equal((await ok(BOB, 'GET', `/locations/${bob.location.id}`)).planId, bob.plan.id);
        assert.deepEqual((await ok(BOB, 'GET', `/groups/${group.id}`)).participantIds, [participant.id]);
        const storedStep = await ok(BOB, 'GET', `/steps/${step.id}`);
        assert.equal(storedStep.startTimeId?.id ?? storedStep.startTimeId, bob.time.id);
        assert.equal((await ok(BOB, 'GET', `/plans/${bob.plan.id}`)).ownerId, BOB.id);
        for (const method of ['GET', 'DELETE']) {
            assert.equal((await call(BOB, method, `/plans/${alice.plan.id}`)).status, 404);
        }
        const aliceTimes = await ok(BOB, 'GET', `/times?planId=${alice.plan.id}`);
        assert.equal(aliceTimes.totalCount, 0);
        await ok(ALICE, 'GET', `/plans/${alice.plan.id}`);
    });
});

describe('a client-chosen _id', () => {
    test('is refused, and deleting a plan or itinerary leaves nothing behind to take over', async () => {
        const plan = await ok(ALICE, 'POST', '/plans', { name: 'Doomed plan' });
        const planId = plan.id;
        const home = await ok(ALICE, 'POST', '/locations', { planId, name: 'Home', latitude: 1, longitude: 1 });
        const work = await ok(ALICE, 'POST', '/locations', { planId, name: 'Work', latitude: 2, longitude: 2 });
        const start = await ok(ALICE, 'POST', '/times', { planId, datetime: '2026-02-01T09:00:00Z' });
        const end = await ok(ALICE, 'POST', '/times', { planId, datetime: '2026-02-01T10:00:00Z' });
        const participant = await ok(ALICE, 'POST', '/participants', { planId, firstName: 'Dan', email: 'dan@example.com', role: 'attendee' });
        await ok(ALICE, 'POST', '/groups', { planId, name: 'Crew', participantIds: [participant.id] });
        await ok(ALICE, 'POST', '/roles', { planId, userId: ALICE.id, type: 'admin' });
        const route = await ok(ALICE, 'POST', '/routes', { originLocationId: home.id, destinationLocationId: work.id, travelMode: 'drive', timeMode: 'depart_at', durationSeconds: 60, distanceMeters: 100 });
        const keptItinerary = await ok(ALICE, 'POST', '/itineraries', { planId, name: 'Kept' });
        await ok(ALICE, 'POST', '/steps', { itineraryId: keptItinerary.id, name: 'Kept step', startTimeId: start.id, endTimeId: end.id });
        const keptWindow = await ok(ALICE, 'POST', '/windows', { itineraryId: keptItinerary.id, userId: ALICE.id });
        await ok(ALICE, 'POST', '/timeslots', { windowId: keptWindow.id, startTimeId: start.id, endTimeId: end.id });

        const itinerary = await ok(ALICE, 'POST', '/itineraries', { planId, name: 'Day 1' });
        const step = await ok(ALICE, 'POST', '/steps', { itineraryId: itinerary.id, name: 'Breakfast', startTimeId: start.id, endTimeId: end.id });
        const window = await ok(ALICE, 'POST', '/windows', { itineraryId: itinerary.id, userId: ALICE.id });
        const timeslot = await ok(ALICE, 'POST', '/timeslots', { windowId: window.id, startTimeId: start.id, endTimeId: end.id });

        await ok(ALICE, 'DELETE', `/itineraries/${itinerary.id}`);
        for (const path of [`/steps/${step.id}`, `/windows/${window.id}`, `/timeslots/${timeslot.id}`]) {
            assert.equal((await call(ALICE, 'GET', path)).status, 404, `GET ${path} after itinerary delete`);
        }
        const takeover = await call(BOB, 'POST', '/itineraries', { _id: itinerary.id, planId: bob.plan.id, name: 'Mine now' });
        assert.equal(takeover.status, 400);
        assert.equal(takeover.body.error, 'Invalid field name');
        for (const path of [`/steps/${step.id}`, `/windows/${window.id}`, `/timeslots/${timeslot.id}`]) {
            assert.equal((await call(BOB, 'GET', path)).status, 404, `BOB GET ${path}`);
        }

        const nested = await call(BOB, 'POST', '/steps/create-with-travel', { itineraryId: bob.itinerary.id, direction: 'after', routeStep: { _id: step.id }, normalStep: {} });
        assert.equal(nested.status, 400);
        const update = await call(BOB, 'PUT', `/itineraries/${bob.itinerary.id}`, { _id: itinerary.id });
        assert.equal(update.status, 400);

        await ok(ALICE, 'DELETE', `/plans/${planId}`);
        const replanned = await call(BOB, 'POST', '/plans', { _id: planId, name: 'Mine now' });
        assert.equal(replanned.status, 400);
        assert.equal(replanned.body.error, 'Invalid field name');
        const byId = await ok(BOB, 'POST', '/plans', { id: planId, name: 'Not the same plan' });
        assert.notEqual(byId.id, planId);

        for (const path of ['/participants', '/locations', '/times', '/groups', '/itineraries', '/routes']) {
            const { items } = await ok(BOB, 'GET', `${path}?planId=${planId}`);
            assert.deepEqual(items.filter((item) => item.planId === planId || item.id === route.id), [], `GET ${path} leaked`);
        }
        assert.equal((await call(BOB, 'GET', `/routes/${route.id}`)).status, 404);

        const models = ['Group', 'Itinerary', 'Location', 'Participant', 'Role', 'Time'];
        for (const name of models) {
            assert.equal(await mongoose.model(name).countDocuments({ planId }), 0, `${name} left behind`);
        }
        assert.equal(await mongoose.model('Step').countDocuments({ itineraryId: keptItinerary.id }), 0, 'Step left behind');
        assert.equal(await mongoose.model('Window').countDocuments({ itineraryId: keptItinerary.id }), 0, 'Window left behind');
        assert.equal(await mongoose.model('Timeslot').countDocuments({ windowId: keptWindow.id }), 0, 'Timeslot left behind');
        assert.equal(await mongoose.model('Route').countDocuments({ originLocationId: home.id }), 0, 'Route left behind');
    });

    test('deleting a location removes its routes and deleting a window removes its timeslots', async () => {
        const planId = bob.plan.id;
        const origin = await ok(BOB, 'POST', '/locations', { planId, name: 'Origin', latitude: 4, longitude: 4 });
        const route = await ok(BOB, 'POST', '/routes', { originLocationId: origin.id, destinationLocationId: bob.location.id, travelMode: 'walk', timeMode: 'depart_at', durationSeconds: 60, distanceMeters: 100 });
        await ok(BOB, 'DELETE', `/locations/${origin.id}`);
        assert.equal(await mongoose.model('Route').countDocuments({ _id: route.id }), 0);

        const end = await ok(BOB, 'POST', '/times', { planId, datetime: '2026-01-01T11:00:00Z' });
        const window = await ok(BOB, 'POST', '/windows', { itineraryId: bob.itinerary.id, userId: BOB.id });
        const timeslot = await ok(BOB, 'POST', '/timeslots', { windowId: window.id, startTimeId: bob.time.id, endTimeId: end.id });
        await ok(BOB, 'DELETE', `/windows/${window.id}`);
        assert.equal(await mongoose.model('Timeslot').countDocuments({ _id: timeslot.id }), 0);
    });
});

describe('fields that grant plan access', () => {
    test('cannot be set from a request body', async () => {
        const plan = await ok(ALICE, 'POST', '/plans', { name: 'Guarded plan', userIds: [CAROL.id] });
        assert.equal(plan.userIds, undefined);
        assert.equal((await call(CAROL, 'GET', `/plans/${plan.id}`)).status, 404);

        const bobParticipant = await ok(ALICE, 'POST', '/participants', { planId: plan.id, firstName: 'Bob', email: BOB.email, role: 'attendee', userId: CAROL.id });
        assert.equal(bobParticipant.userId, null);
        await linkUserByEmail(BOB.email, BOB.id);
        await ok(BOB, 'GET', `/plans/${plan.id}`);

        const updated = await ok(BOB, 'PUT', `/plans/${plan.id}`, { name: 'Guarded plan', userIds: [BOB.id, CAROL.id] });
        assert.equal(updated.userIds, undefined);
        assert.equal((await call(CAROL, 'GET', `/plans/${plan.id}`)).status, 404);

        const fake = await ok(BOB, 'POST', '/participants', { planId: plan.id, firstName: 'Fake', email: 'fake@example.com', role: 'attendee', userId: CAROL.id });
        assert.equal(fake.userId, null);
        const relinked = await ok(BOB, 'PUT', `/participants/${fake.id}`, { firstName: 'Fake', userId: CAROL.id });
        assert.equal(relinked.userId, null);
        assert.equal((await call(CAROL, 'GET', `/plans/${plan.id}`)).status, 404);

        await ok(ALICE, 'DELETE', `/participants/${bobParticipant.id}`);
        assert.equal((await call(BOB, 'GET', `/plans/${plan.id}`)).status, 404);
        assert.equal((await call(BOB, 'DELETE', `/plans/${plan.id}`)).status, 404);
        await ok(ALICE, 'GET', `/plans/${plan.id}`);
    });
});

describe('a reference that is not a plain id string', () => {
    test('is refused, and other users\' ids answer the same as missing ones', async () => {
        const missingId = new mongoose.Types.ObjectId().toString();
        const wrapped = await call(BOB, 'POST', '/plans', { name: 'p', locationIds: [{ _id: alice.location.id }] });
        assert.equal(wrapped.status, 400);
        const foreign = await call(BOB, 'POST', '/plans', { name: 'p', locationIds: [alice.location.id] });
        const missing = await call(BOB, 'POST', '/plans', { name: 'p', locationIds: [missingId] });
        assert.equal(foreign.status, 404);
        assert.deepEqual(missing, foreign);

        const attempts = [
            ['/groups', { planId: bob.plan.id, name: 'x', participantIds: [[alice.participant.id]] }],
            ['/locations', { planId: [alice.plan.id], name: 'x', latitude: 1, longitude: 1 }],
            ['/itineraries', { planId: { toString: alice.plan.id }, name: 'x' }],
        ];
        for (const [path, body] of attempts) {
            const result = await call(BOB, 'POST', path, body);
            assert.equal(result.status, 404, `POST ${path} ${JSON.stringify(body)} returned ${result.status}`);
        }
        const plans = await ok(BOB, 'GET', '/plans');
        assert.ok(plans.items.every((plan) => !plan.locationIds.includes(alice.location.id)));
    });
});

const MALLORY = { id: 'user_mallory', email: 'mallory@example.com', firstName: 'Mallory' };
const OLIVIA = { id: 'user_olivia', email: 'olivia@example.com', firstName: 'Olivia' };

const seedPlan = async (user, name) => {
    const records = { plan: await ok(user, 'POST', '/plans', { name }) };
    const planId = records.plan.id;
    records.location = await ok(user, 'POST', '/locations', { planId, name: `${name} office`, latitude: 1, longitude: 1 });
    records.otherLocation = await ok(user, 'POST', '/locations', { planId, name: `${name} venue`, latitude: 2, longitude: 2 });
    records.itinerary = await ok(user, 'POST', '/itineraries', { planId, name: `${name} day` });
    records.time = await ok(user, 'POST', '/times', { planId, datetime: '2026-03-01T09:00:00Z' });
    records.dependentTime = await ok(user, 'POST', '/times', { planId, datetime: '2026-03-01T10:00:00Z', parentTimeId: records.time.id, offsetSeconds: 3600 });
    records.participant = await ok(user, 'POST', '/participants', { planId, firstName: 'Guest', email: `guest-${planId}@example.com`, role: 'attendee' });
    records.group = await ok(user, 'POST', '/groups', { planId, name: 'Crew', participantIds: [records.participant.id] });
    records.role = await ok(user, 'POST', '/roles', { planId, userId: user.id, type: 'admin' });
    records.route = await ok(user, 'POST', '/routes', { originLocationId: records.location.id, destinationLocationId: records.otherLocation.id, travelMode: 'drive', timeMode: 'depart_at', durationSeconds: 600, distanceMeters: 1000 });
    records.step = await ok(user, 'POST', '/steps', { itineraryId: records.itinerary.id, name: 'Meeting', startTimeId: records.time.id, endTimeId: records.dependentTime.id, locationId: records.location.id });
    records.window = await ok(user, 'POST', '/windows', { itineraryId: records.itinerary.id, userId: user.id });
    records.timeslot = await ok(user, 'POST', '/timeslots', { windowId: records.window.id, startTimeId: records.time.id, endTimeId: records.dependentTime.id });
    const { items } = await ok(user, 'GET', `/participants?planId=${planId}`);
    records.admin = items.find((item) => item.userId === user.id);
    return records;
};

const seedSharedPlans = async () => {
    const own = await seedPlan(MALLORY, 'Mallory plan');
    const shared = await seedPlan(OLIVIA, 'Olivia plan');
    shared.mallory = await ok(OLIVIA, 'POST', '/participants', { planId: shared.plan.id, firstName: 'Mallory', email: MALLORY.email, role: 'attendee' });
    await linkUserByEmail(MALLORY.email, MALLORY.id);
    await ok(MALLORY, 'GET', `/plans/${shared.plan.id}`);
    return { own, shared };
};

const sharedRecordPaths = (shared) => [
    `/plans/${shared.plan.id}`, `/locations/${shared.location.id}`, `/itineraries/${shared.itinerary.id}`,
    `/times/${shared.time.id}`, `/times/${shared.dependentTime.id}`, `/participants/${shared.participant.id}`,
    `/groups/${shared.group.id}`, `/roles/${shared.role.id}`, `/routes/${shared.route.id}`, `/steps/${shared.step.id}`,
    `/windows/${shared.window.id}`, `/timeslots/${shared.timeslot.id}`,
];

describe('a participant who also owns another plan', () => {
    test('cannot move their own participant record into the shared plan to keep access after removal', async () => {
        const { own, shared } = await seedSharedPlans();
        const moved = await call(MALLORY, 'PUT', `/participants/${own.admin.id}`, { planId: shared.plan.id, firstName: 'Dana', email: 'dana@caterer.example', role: 'vendor' });
        assert.equal(moved.status, 404, `participant move returned ${moved.status}`);
        assert.equal((await ok(MALLORY, 'GET', `/participants/${own.admin.id}`)).planId, own.plan.id);

        await ok(OLIVIA, 'DELETE', `/participants/${shared.mallory.id}`);
        const { items } = await ok(OLIVIA, 'GET', `/participants?planId=${shared.plan.id}`);
        assert.deepEqual(items.filter((item) => item.userId === MALLORY.id), []);
        assert.equal((await call(MALLORY, 'GET', `/plans/${shared.plan.id}`)).status, 404);
        assert.equal((await call(MALLORY, 'GET', `/steps/${shared.step.id}`)).status, 404);
        assert.equal((await call(MALLORY, 'PUT', `/locations/${shared.location.id}`, { name: 'PWNED' })).status, 404);
        assert.equal((await ok(OLIVIA, 'GET', `/locations/${shared.location.id}`)).name, 'Olivia plan office');
    });

    test('cannot move any record between plans, and once removed reaches none of the shared plan\'s records', async () => {
        const { own, shared } = await seedSharedPlans();
        const moves = [
            ['/participants', shared.participant, { planId: own.plan.id }, 'planId', shared.plan.id],
            ['/times', shared.time, { planId: own.plan.id }, 'planId', shared.plan.id],
            ['/times', own.time, { planId: shared.plan.id }, 'planId', own.plan.id],
            ['/locations', shared.location, { planId: own.plan.id }, 'planId', shared.plan.id],
            ['/itineraries', shared.itinerary, { planId: own.plan.id }, 'planId', shared.plan.id],
            ['/groups', shared.group, { planId: own.plan.id }, 'planId', shared.plan.id],
            ['/roles', shared.role, { planId: own.plan.id }, 'planId', shared.plan.id],
            ['/steps', shared.step, { itineraryId: own.itinerary.id }, 'itineraryId', shared.itinerary.id],
            ['/steps', own.step, { itineraryId: shared.itinerary.id }, 'itineraryId', own.itinerary.id],
            ['/windows', shared.window, { itineraryId: own.itinerary.id }, 'itineraryId', shared.itinerary.id],
            ['/timeslots', shared.timeslot, { windowId: own.window.id }, 'windowId', shared.window.id],
            ['/routes', shared.route, { originLocationId: own.location.id }, 'originLocationId', shared.location.id],
            ['/routes', shared.route, { originLocationId: own.location.id, destinationLocationId: own.otherLocation.id }, 'originLocationId', shared.location.id],
        ];
        const accepted = [];
        for (const [path, record, body, field, expected] of moves) {
            const result = await call(MALLORY, 'PUT', `${path}/${record.id}`, body);
            const current = (await ok(MALLORY, 'GET', `${path}/${record.id}`))[field];
            if (result.status !== 404 || (current?.id ?? current) !== expected) accepted.push(`PUT ${path}/:id ${Object.keys(body)} -> ${result.status}`);
        }
        assert.deepEqual(accepted, [], 'cross-plan moves were accepted');
        await ok(MALLORY, 'PUT', `/times/${shared.time.id}`, { planId: shared.plan.id, label: 'Kick-off' });
        await ok(MALLORY, 'PUT', `/routes/${shared.route.id}`, { originLocationId: shared.otherLocation.id, destinationLocationId: shared.location.id });
        await ok(MALLORY, 'PUT', `/routes/${shared.route.id}`, { originLocationId: shared.location.id, destinationLocationId: shared.otherLocation.id });

        await ok(OLIVIA, 'DELETE', `/participants/${shared.mallory.id}`);
        const reached = [];
        for (const path of sharedRecordPaths(shared)) {
            for (const [method, body] of [['GET'], ['PUT', { name: 'PWNED', datetime: '2030-06-06T00:00:00Z', durationSeconds: 99999 }], ['DELETE']]) {
                const result = await call(MALLORY, method, path, body);
                if (result.status !== 404) reached.push(`${method} ${path.split('/')[1]} -> ${result.status}`);
            }
        }
        assert.deepEqual(reached, [], 'removed participant still reached shared records');
        for (const path of sharedRecordPaths(shared)) {
            await ok(OLIVIA, 'GET', path);
        }
        const dependent = await ok(OLIVIA, 'GET', `/times/${shared.dependentTime.id}`);
        assert.equal(new Date(dependent.datetime).toISOString(), '2026-03-01T10:00:00.000Z');
        assert.equal((await ok(OLIVIA, 'GET', `/routes/${shared.route.id}`)).durationSeconds, 600);
    });
});

describe('a list filter that is not a single id string', () => {
    test('is refused with 400 instead of a server error', async () => {
        const lists = ['/locations', '/participants', '/groups', '/itineraries', '/times', '/routes'];
        const variants = ['planId[$ne]=x', `planId[$in][]=${alice.plan.id}`, 'planId[]=a&planId[]=b', 'planId[$gt]=0', `planId[$ne]=${bob.plan.id}`, 'planId=nope'];
        for (const path of lists) {
            for (const query of variants) {
                const result = await call(BOB, 'GET', `${path}?${query}`);
                assert.equal(result.status, 400, `GET ${path}?${query} returned ${result.status} ${JSON.stringify(result.body)}`);
                assert.equal(result.body.error, 'Invalid planId');
            }
            const own = await ok(BOB, 'GET', `${path}?planId=${bob.plan.id}`);
            assert.ok(Array.isArray(own.items));
        }
        for (const query of ['itineraryId[$ne]=x', `itineraryId[$in][]=${alice.itinerary.id}`, 'itineraryId[]=a']) {
            const result = await call(BOB, 'GET', `/steps?${query}`);
            assert.equal(result.status, 400, `GET /steps?${query} returned ${result.status}`);
            assert.equal(result.body.error, 'Invalid itineraryId');
        }
        await ok(BOB, 'GET', `/steps?itineraryId=${bob.itinerary.id}`);
    });
});

describe('a record id that is not a string', () => {
    test('answers 404 instead of a server error', async () => {
        for (const planId of [123, 0, [bob.plan.id], { id: bob.plan.id }, true]) {
            const result = await call(BOB, 'POST', '/routes/recalculate-all', { planId });
            assert.equal(result.status, 404, `recalculate-all ${JSON.stringify(planId)} returned ${result.status}`);
        }
        assert.equal((await call(BOB, 'POST', '/routes/recalculate-all', { planId: { $ne: null } })).status, 400);
    });
});

describe('a profile payload with Mongo operators, dotted paths or _id', () => {
    test('is refused with 400 and leaves the profile with its owner', async () => {
        const profile = await ok(BOB, 'POST', '/profiles', { firstName: 'Bob' });
        const attempts = [
            ['PUT', `/profiles/${profile.id}`, { 'userId.x': 1 }],
            ['PUT', `/profiles/${profile.id}`, { $set: { userId: ALICE.id } }],
            ['PUT', `/profiles/${profile.id}`, { _id: alice.profile.id }],
            ['PUT', `/profiles/${profile.id}`, { firstName: 'Bob', nested: { $set: { userId: ALICE.id } } }],
            ['POST', '/profiles', { _id: alice.profile.id, firstName: 'Bob' }],
            ['POST', '/profiles', { $set: { userId: ALICE.id } }],
        ];
        for (const [method, path, body] of attempts) {
            const result = await call(BOB, method, path, body);
            assert.equal(result.status, 400, `${method} ${path} ${JSON.stringify(body)} returned ${result.status}`);
            assert.equal(result.body.error, 'Invalid field name');
        }
        assert.equal((await ok(BOB, 'GET', `/profiles/${profile.id}`)).userId, BOB.id);
        assert.equal((await ok(BOB, 'GET', '/profiles')).totalCount, 1);
        await ok(ALICE, 'GET', `/profiles/${alice.profile.id}`);
    });
});

describe('a time placed under itself or one of its own dependents', () => {
    test('is refused with 400, and an existing loop no longer hangs the cascade', async () => {
        const planId = bob.plan.id;
        const root = await ok(BOB, 'POST', '/times', { planId, datetime: '2026-04-01T09:00:00Z' });
        const child = await ok(BOB, 'POST', '/times', { planId, parentTimeId: root.id, offsetSeconds: 60 });
        const grandchild = await ok(BOB, 'POST', '/times', { planId, parentTimeId: child.id, offsetSeconds: 60 });

        const attempts = [
            [`/times/${root.id}`, { parentTimeId: root.id, offsetSeconds: 1 }],
            [`/times/${root.id}`, { parentTimeId: grandchild.id, offsetSeconds: 1 }],
            [`/times/${child.id}`, { parentTimeId: grandchild.id }],
        ];
        for (const [path, body] of attempts) {
            const result = await call(BOB, 'PUT', path, body);
            assert.equal(result.status, 400, `PUT ${path} ${JSON.stringify(body)} returned ${result.status}`);
            assert.equal(result.body.error, 'A time cannot depend on itself');
        }
        assert.equal((await ok(BOB, 'GET', `/times/${root.id}`)).parentTimeId, null);

        for (const [recipient, source] of [[grandchild, child], [child, child]]) {
            const merged = await call(BOB, 'POST', `/times/${recipient.id}/merge`, { sourceTimeId: source.id });
            assert.equal(merged.status, 400, `merge ${source.id} into ${recipient.id} returned ${merged.status}`);
        }
        await ok(BOB, 'GET', `/times/${child.id}`);

        await mongoose.model('Time').updateOne({ _id: root.id }, { $set: { parentTimeId: grandchild.id, offsetSeconds: 1 } });
        await ok(BOB, 'PUT', `/times/${child.id}`, { label: 'Looped' });
        await ok(BOB, 'GET', `/times/${root.id}`);
    });
});

describe('a request body that is not a plain object', () => {
    test('is refused with 400 and changes nothing', async () => {
        const profile = await ok(BOB, 'POST', '/profiles', { firstName: 'Bobby' });
        const attempts = [
            ['PUT', `/locations/${bob.location.id}`, [{ planId: alice.plan.id }]],
            ['PUT', `/times/${bob.time.id}`, [{ parentTimeId: alice.start.id }]],
            ['PUT', `/itineraries/${bob.itinerary.id}`, []],
            ['PUT', `/profiles/${profile.id}`, [{ userId: ALICE.id }]],
            ['POST', '/locations', [{ planId: bob.plan.id, name: 'x', latitude: 1, longitude: 1 }]],
            ['POST', '/plans', []],
        ];
        for (const [method, path, body] of attempts) {
            const result = await call(BOB, method, path, body);
            assert.equal(result.status, 400, `${method} ${path} ${JSON.stringify(body)} returned ${result.status}`);
            assert.equal(result.body.error, 'Invalid request body');
        }
        assert.equal((await ok(BOB, 'GET', `/locations/${bob.location.id}`)).planId, bob.plan.id);
        assert.equal((await ok(BOB, 'GET', `/profiles/${profile.id}`)).userId, BOB.id);
    });
});

describe('an empty-string reference', () => {
    test('answers 404 like a missing record instead of a server error', async () => {
        const end = await ok(BOB, 'POST', '/times', { planId: bob.plan.id, datetime: '2026-01-01T12:00:00Z' });
        const attempts = [
            ['POST', '/steps', { itineraryId: bob.itinerary.id, name: 'x', startTimeId: bob.time.id, endTimeId: end.id, locationId: '' }, 'Location not found'],
            ['POST', '/steps', { itineraryId: bob.itinerary.id, name: 'x', startTimeId: '', endTimeId: end.id }, 'Time not found'],
            ['POST', '/groups', { planId: bob.plan.id, name: 'x', participantIds: [''] }, 'Participant not found'],
            ['PUT', `/times/${end.id}`, { routeId: '' }, 'Route not found'],
            ['POST', '/locations', { planId: '', name: 'x', latitude: 1, longitude: 1 }, 'Plan not found'],
        ];
        for (const [method, path, body, error] of attempts) {
            const result = await call(BOB, method, path, body);
            assert.equal(result.status, 404, `${method} ${path} ${JSON.stringify(body)} returned ${result.status} ${JSON.stringify(result.body)}`);
            assert.equal(result.body.error, error);
        }
    });
});

describe('a list page that is not a non-negative integer', () => {
    test('is refused with 400 instead of a server error', async () => {
        const lists = ['/plans', '/locations', '/participants', '/groups', '/itineraries', '/times', '/routes', '/steps', '/windows', '/timeslots', '/roles', '/profiles'];
        const variants = ['skip=-1', 'limit=-1', 'skip=abc', 'limit=1.5', 'skip[]=1', 'skip[$gt]=0', 'skip=', 'limit=1e3', 'skip=99999999999999999999'];
        for (const path of lists) {
            for (const query of variants) {
                const result = await call(BOB, 'GET', `${path}?${query}`);
                assert.equal(result.status, 400, `GET ${path}?${query} returned ${result.status} ${JSON.stringify(result.body)}`);
                assert.equal(result.body.error, 'Invalid skip or limit');
            }
            const page = await ok(BOB, 'GET', `${path}?skip=0&limit=1`);
            assert.ok(page.items.length <= 1);
        }
    });
});
