import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

async function main() {
  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@footballevents.is' },
    update: {
      username: 'admin',
      password: adminPassword,
      role: Role.admin,
    },
    create: {
      username: 'admin',
      email: 'admin@footballevents.is',
      password: adminPassword,
      role: Role.admin,
    },
  });

  const users = [];
  for (let i = 1; i <= 10; i++) {
    const user = await prisma.user.upsert({
      where: { email: `user${i}@example.com` },
      update: {
        username: `user${i}`,
        password: userPassword,
        role: Role.user,
      },
      create: {
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: userPassword,
        role: Role.user,
      },
    });
    users.push(user);
  }

  const categoryNames = ['match', 'training', 'tournament', 'tryout', 'social'];
  const categories = [];

  for (const name of categoryNames) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories.push(category);
  }

  const teamData = [
    { name: 'Álafoss', shortName: 'ALA', description: 'Football club from Mosfellsbær', logoUrl: null },
    { name: 'Bolafoss', shortName: 'BOL', description: '7-a-side football team', logoUrl: null },
    { name: 'KA', shortName: 'KA', description: 'Club from Akureyri', logoUrl: null },
    { name: 'Selfoss', shortName: 'SELF', description: 'Club from Selfoss', logoUrl: null },
    { name: 'Afturelding', shortName: 'AFT', description: 'Club from Mosfellsbær', logoUrl: null },
    { name: 'Fram', shortName: 'FRAM', description: 'Historic club from Reykjavík', logoUrl: null },
  ];

  const teams = [];
  for (const team of teamData) {
    const created = await prisma.team.upsert({
      where: { name: team.name },
      update: team,
      create: team,
    });
    teams.push(created);
  }

  const venueData = [
    { name: 'Varmárvöllur', address: 'Varmá', city: 'Mosfellsbær', capacity: 1200, imageUrl: null },
    { name: 'Fagrilundur', address: 'Fagrilundur', city: 'Kópavogur', capacity: 900, imageUrl: null },
    { name: 'Egilshöll', address: 'Egilshöll 1', city: 'Reykjavík', capacity: 2000, imageUrl: null },
    { name: 'Kórinn', address: 'Kórinn', city: 'Kópavogur', capacity: 1500, imageUrl: null },
    { name: 'KA völlur', address: 'Akureyri', city: 'Akureyri', capacity: 1800, imageUrl: null },
    { name: 'JÁVERK-völlurinn', address: 'Selfoss', city: 'Selfoss', capacity: 1700, imageUrl: null },
  ];

  const venues = [];
  for (const venue of venueData) {
    const created = await prisma.venue.upsert({
      where: { name: venue.name },
      update: venue,
      create: venue,
    });
    venues.push(created);
  }

  const eventTitles = [
    'Álafoss vs KA',
    'Bolafoss evening training',
    'Summer youth tournament',
    'Open tryouts for new players',
    'Pre-season fitness session',
    'Friendly match night',
    'Goalkeeper special training',
    'Parents and supporters meeting',
    'Community football day',
    'Cup qualifier match',
    'Academy talent session',
    'Senior squad recovery training',
    'Women’s football open practice',
    'Penalty shootout challenge',
    'Local derby event',
    'Tactics classroom session',
    'Indoor winter tournament',
    'Junior team training',
    'Club social evening',
    'Captain’s run session',
  ];

  const now = new Date();

  for (let i = 0; i < eventTitles.length; i++) {
    await prisma.event.create({
      data: {
        title: eventTitles[i],
        description: `Description for ${eventTitles[i]}`,
        eventDate: new Date(now.getTime() + i * 24 * 60 * 60 * 1000),
        maxParticipants: i % 2 === 0 ? 30 : 50,
        imageUrl: null,
        isOpen: true,
        categoryId: categories[i % categories.length].id,
        venueId: venues[i % venues.length].id,
        teamId: teams[i % teams.length].id,
        createdById: admin.id,
      },
    });
  }

  const events = await prisma.event.findMany({
    orderBy: { id: 'asc' },
  });

  let registrationCount = 0;

  for (const event of events.slice(0, 10)) {
    for (const user of users.slice(0, 5)) {
      await prisma.registration.upsert({
        where: {
          userId_eventId: {
            userId: user.id,
            eventId: event.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          eventId: event.id,
        },
      });
      registrationCount++;
    }
  }

  console.log('Seed complete');
  console.log(`Users: ${1 + users.length}`);
  console.log(`Categories: ${categories.length}`);
  console.log(`Teams: ${teams.length}`);
  console.log(`Venues: ${venues.length}`);
  console.log(`Events: ${events.length}`);
  console.log(`Registrations: ${registrationCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });