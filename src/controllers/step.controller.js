import * as stepService from '../services/step.service.js';

export const list = async (req, res, next) => {
    try {
        const result = await stepService.list(req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const get = async (req, res, next) => {
    try {
        const result = await stepService.get(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const create = async (req, res, next) => {
    try {
        const result = await stepService.create(req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const createWithDuration = async (req, res, next) => {
    try {
        const result = await stepService.createWithDuration(req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const createWithTravel = async (req, res, next) => {
    try {
        const result = await stepService.createWithTravel(req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const result = await stepService.update(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        await stepService.remove(req.params.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};
