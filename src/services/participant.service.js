import Participant from '../models/participant.model.js';
import clerkClient from '../config/clerk.js';
import env from '../config/env.js';
import { accessiblePlanIds, queryId } from './access.service.js';

export const list = async (query = {}) => {
    const { skip = 0, limit = 50, planId, userId } = query;
    const filter = { planId: { $in: await accessiblePlanIds(userId) } };
    if (planId) filter.planId.$eq = queryId(planId, 'planId');
    const [items, totalCount] = await Promise.all([
        Participant.find(filter).skip(Number(skip)).limit(Number(limit)),
        Participant.countDocuments(filter),
    ]);
    return { items, totalCount };
};

export const get = async (id) => {
    const item = await Participant.findById(id);
    if (!item) throw Object.assign(new Error('Participant not found'), { status: 404 });
    return item;
};

export const create = async (data) => {
    const { userId, ...fields } = data;
    if (env.authMode === 'clerk') {
        const { data: users } = await clerkClient.users.getUserList({ emailAddress: [fields.email], limit: 1 });
        if (users.length) {
            fields.userId = users[0].id;
        }
    }
    const item = new Participant(fields);
    return item.save();
};

export const update = async (id, data) => {
    const { userId, ...changes } = data;
    const item = await Participant.findByIdAndUpdate(id, changes, { new: true, runValidators: true });
    if (!item) throw Object.assign(new Error('Participant not found'), { status: 404 });
    return item;
};

export const remove = async (id) => {
    const item = await Participant.findByIdAndDelete(id);
    if (!item) throw Object.assign(new Error('Participant not found'), { status: 404 });
    return item;
};

export const linkUserByEmail = async (email, userId) => {
    await Participant.updateMany(
        { email, userId: null },
        { userId },
    );
};
