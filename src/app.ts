import { Hono } from 'hono';
import authRouter from './routes/auth';
import eventsRouter from './routes/events';
import teamsRouter from './routes/teams';
import venuesRouter from './routes/venues';
import categoriesRouter from './routes/categories';
import registrationsRouter from './routes/registrations';
import uploadRouter from './routes/upload';
import type { AppBindings } from './types';

export const app = new Hono<AppBindings>();

app.get('/', (c) => {
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

app.route('/auth', authRouter);
app.route('/events', eventsRouter);
app.route('/teams', teamsRouter);
app.route('/venues', venuesRouter);
app.route('/categories', categoriesRouter);
app.route('/', registrationsRouter);
app.route('/upload', uploadRouter);

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: 'Internal server error' }, 500);
});