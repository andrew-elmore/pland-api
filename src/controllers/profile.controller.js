import * as profileService from '../services/profile.service.js';

export const list = async (req, res, next) => {
    try {
        const result = await profileService.list({ ...req.query, userId: req.user.id });
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const get = async (req, res, next) => {
    try {
        const result = await profileService.get(req.params.id, req.user.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const create = async (req, res, next) => {
    try {
        const result = await profileService.create(req.body, req.user.id);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const result = await profileService.update(req.params.id, req.body, req.user.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        await profileService.remove(req.params.id, req.user.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};
