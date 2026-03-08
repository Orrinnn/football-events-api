"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const factory_1 = require("hono/factory");
const auth_1 = require("../lib/auth");
exports.requireAuth = (0, factory_1.createMiddleware)(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const user = (0, auth_1.verifyToken)(token);
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('user', user);
    await next();
});
