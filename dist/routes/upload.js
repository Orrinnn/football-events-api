"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const cloudinary_1 = require("../lib/cloudinary");
const uploadRouter = new hono_1.Hono();
uploadRouter.post('/', auth_1.requireAuth, admin_1.requireAdmin, async (c) => {
    const formData = await c.req.formData();
    const file = formData.get('image');
    if (!(file instanceof File)) {
        return c.json({ error: 'Image file is required' }, 400);
    }
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        return c.json({ error: 'Only jpg and png images are allowed' }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
    const result = await cloudinary_1.cloudinary.uploader.upload(base64, {
        folder: 'football-events-api',
        resource_type: 'image',
    });
    return c.json({
        message: 'Image uploaded successfully',
        data: {
            imageUrl: result.secure_url,
            publicId: result.public_id,
        },
    }, 201);
});
exports.default = uploadRouter;
