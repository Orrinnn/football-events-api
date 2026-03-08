import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { cloudinary } from '../lib/cloudinary';
import type { AppBindings } from '../types';

const uploadRouter = new Hono<AppBindings>();

uploadRouter.post('/', requireAuth, requireAdmin, async (c) => {
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

  const result = await cloudinary.uploader.upload(base64, {
    folder: 'football-events-api',
    resource_type: 'image',
  });

  return c.json(
    {
      message: 'Image uploaded successfully',
      data: {
        imageUrl: result.secure_url,
        publicId: result.public_id,
      },
    },
    201
  );
});

export default uploadRouter;