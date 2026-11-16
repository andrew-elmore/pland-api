import * as accessService from '../services/access.service.js';

/**
 * Per-route guard, applied after `authenticate`, that lets the request through only when the
 * signed-in user may act on the record and every record its payload points at.
 * Inaccessible or missing records answer `404 { error: '<Kind> not found' }`.
 * @param {string} kind Record kind, e.g. `'Plan'`, `'Step'`.
 * @param {(req: import('express').Request) => (string|undefined)} [idOf] Where the existing record's id comes from.
 */
export const authorize = (kind, idOf = (req) => req.params.id) => async (req, res, next) => {
    try {
        await accessService.authorize(req.user.id, kind, idOf(req), req.body);
        next();
    } catch (err) {
        next(err);
    }
};
