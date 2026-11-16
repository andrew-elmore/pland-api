const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

/**
 * Global guard, registered after `express.json()`, that refuses with 400 a JSON array body
 * (`findByIdAndUpdate` would run it as an aggregation pipeline, and `authorize` reads parent and
 * reference fields off a plain object) and a `skip` or `limit` query value that is not a
 * non-negative integer string.
 * @type {import('express').RequestHandler}
 */
export const validateRequest = (req, res, next) => {
    if (Array.isArray(req.body)) return next(badRequest('Invalid request body'));
    const invalidPage = ['skip', 'limit'].some((key) => req.query[key] !== undefined
        && (typeof req.query[key] !== 'string' || !/^\d{1,9}$/.test(req.query[key])));
    if (invalidPage) return next(badRequest('Invalid skip or limit'));
    next();
};
