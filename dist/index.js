"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_server_1 = require("@hono/node-server");
const app_1 = require("./app");
const port = Number(process.env.PORT) || 3000;
(0, node_server_1.serve)({
    fetch: app_1.app.fetch,
    port,
}, () => {
    console.log(`Server running on http://localhost:${port}`);
});
