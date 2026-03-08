"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const hono_1 = require("hono");
const auth_1 = __importDefault(require("./routes/auth"));
const events_1 = __importDefault(require("./routes/events"));
const teams_1 = __importDefault(require("./routes/teams"));
const venues_1 = __importDefault(require("./routes/venues"));
const categories_1 = __importDefault(require("./routes/categories"));
const registrations_1 = __importDefault(require("./routes/registrations"));
const upload_1 = __importDefault(require("./routes/upload"));
exports.app = new hono_1.Hono();
exports.app.get('/', (c) => {
    return c.json({
        message: 'Football Events API',
        routes: {
            auth: {
                register: 'POST /auth/register',
                login: 'POST /auth/login',
            },
            events: {
                list: 'GET /events',
                single: 'GET /events/:id',
                create: 'POST /events',
                update: 'PATCH /events/:id',
                delete: 'DELETE /events/:id',
            },
            teams: {
                list: 'GET /teams',
                single: 'GET /teams/:id',
                create: 'POST /teams',
                update: 'PATCH /teams/:id',
                delete: 'DELETE /teams/:id',
            },
            venues: {
                list: 'GET /venues',
                single: 'GET /venues/:id',
                create: 'POST /venues',
                update: 'PATCH /venues/:id',
                delete: 'DELETE /venues/:id',
            },
            categories: {
                list: 'GET /categories',
                single: 'GET /categories/:id',
                create: 'POST /categories',
                update: 'PATCH /categories/:id',
                delete: 'DELETE /categories/:id',
            },
            registrations: {
                create: 'POST /events/:id/register',
                list: 'GET /registrations',
                delete: 'DELETE /registrations/:id',
            },
            upload: {
                image: 'POST /upload',
            },
        },
    });
});
exports.app.route('/auth', auth_1.default);
exports.app.route('/events', events_1.default);
exports.app.route('/teams', teams_1.default);
exports.app.route('/venues', venues_1.default);
exports.app.route('/categories', categories_1.default);
exports.app.route('/', registrations_1.default);
exports.app.route('/upload', upload_1.default);
exports.app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404);
});
exports.app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
});
