import * as timeService from '../services/time.service.js';

export const list = async (req, res, next) => {
    try {
        const result = await timeService.list(req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const get = async (req, res, next) => {
    try {
        const result = await timeService.get(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const create = async (req, res, next) => {
    try {
        const result = await timeService.create(req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const result = await timeService.update(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        await timeService.remove(req.params.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};

export const merge = async (req, res, next) => {
    try {
        const result = await timeService.merge(req.params.id, req.body.sourceTimeId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};
