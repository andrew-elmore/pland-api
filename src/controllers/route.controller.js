import * as routeService from '../services/route.service.js';

export const calculate = async (req, res, next) => {
    try {
        const result = await routeService.calculate(req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const list = async (req, res, next) => {
    try {
        const result = await routeService.list(req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const get = async (req, res, next) => {
    try {
        const result = await routeService.get(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const create = async (req, res, next) => {
    try {
        const result = await routeService.create(req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const result = await routeService.update(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        await routeService.remove(req.params.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};

export const recalculateAll = async (req, res, next) => {
    try {
        const result = await routeService.recalculateAll(req.body.planId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};
