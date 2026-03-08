"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const factory_1 = require("hono/factory");
exports.requireAdmin = (0, factory_1.createMiddleware)(async (c, next) => {
    const user = c.get('user');
    if (!user || user.role !== 'admin') {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
});
