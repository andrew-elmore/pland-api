import * as groupService from '../services/group.service.js';

export const list = async (req, res, next) => {
    try {
        const result = await groupService.list(req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const get = async (req, res, next) => {
    try {
        const result = await groupService.get(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const create = async (req, res, next) => {
    try {
        const result = await groupService.create(req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const result = await groupService.update(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        await groupService.remove(req.params.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};
