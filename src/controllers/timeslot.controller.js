import * as timeslotService from '../services/timeslot.service.js';

export const list = async (req, res, next) => {
    try {
        const result = await timeslotService.list(req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const get = async (req, res, next) => {
    try {
        const result = await timeslotService.get(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const create = async (req, res, next) => {
    try {
        const result = await timeslotService.create(req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const result = await timeslotService.update(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        await timeslotService.remove(req.params.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};
