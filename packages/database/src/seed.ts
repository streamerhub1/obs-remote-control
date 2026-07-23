import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from apps/backend/.env or root
dotenv.config({ path: path.resolve(process.cwd(), '../../apps/backend/.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is missing. Please set it in apps/backend/.env');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log('Seeding demo data...');

  try {
    // 1. Create a demo user for the streamer (current user)
    // We will use a known ID so the UI can match it, or just let them login
    // Usually, the app expects the logged in user to be present.
    // We'll create some fake streamers.
    const streamer1Id = '11111111-1111-1111-1111-111111111111';
    const streamer2Id = '22222222-2222-2222-2222-222222222222';
    const streamer3Id = '33333333-3333-3333-3333-333333333333';

    await db.insert(schema.users).values([
      {
        id: streamer1Id,
        twitchId: 'twitch_demo_1',
        twitchLogin: 'progamer_99',
        displayName: 'ProGamer_99',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ProGamer_99',
        inviteCode: 'INV-DEMO-1',
        inviteCodeNormalized: 'inv-demo-1',
      },
      {
        id: streamer2Id,
        twitchId: 'twitch_demo_2',
        twitchLogin: 'crafty',
        displayName: 'CraftyBuilder',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Crafty',
        inviteCode: 'INV-DEMO-2',
        inviteCodeNormalized: 'inv-demo-2',
      },
      {
        id: streamer3Id,
        twitchId: 'twitch_demo_3',
        twitchLogin: 'viking',
        displayName: 'VikingGamer',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Viking',
        inviteCode: 'INV-DEMO-3',
        inviteCodeNormalized: 'inv-demo-3',
      },
    ]).onConflictDoNothing();

    // 2. Create profiles
    await db.insert(schema.profiles).values([
      {
        userId: streamer1Id,
        bio: 'Professional gamer and speedrunner.',
        languages: ['English', 'Russian'],
        categories: ['Gaming', 'Just Chatting'],
      },
      {
        userId: streamer2Id,
        bio: 'Minecraft building expert.',
        languages: ['English'],
        categories: ['Gaming', 'Creative'],
      },
      {
        userId: streamer3Id,
        bio: 'Valheim and survival games.',
        languages: ['Russian'],
        categories: ['Gaming'],
      }
    ]).onConflictDoNothing();

    // 3. Create Posts
    const post1Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const post2Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    
    await db.insert(schema.posts).values([
      {
        id: post1Id,
        authorId: streamer1Id,
        content: 'Just finished an amazing 12-hour subathon! Thanks everyone for the support! 🎮💜',
        likesCount: 124,
        commentsCount: 15,
      },
      {
        id: post2Id,
        authorId: streamer2Id,
        content: 'Looking for someone to collab on a Minecraft hardcore series this weekend. Any takers?',
        likesCount: 45,
        commentsCount: 8,
      }
    ]).onConflictDoNothing();

    // 4. Create Collaborations
    const collab1Id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const collab2Id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    
    await db.insert(schema.collaborations).values([
      {
        id: collab1Id,
        ownerId: streamer3Id,
        title: 'Valheim Boss Rush',
        description: 'Need a team to take down all bosses.',
        category: 'Gaming',
        startAt: new Date(Date.now() + 86400000),
        expectedDurationMinutes: 180,
        timezone: 'UTC',
        maximumParticipants: 4,
      },
      {
        id: collab2Id,
        ownerId: streamer1Id,
        title: 'Podcast: Future of Streaming',
        description: 'Talking about Twitch meta and new tools.',
        category: 'Just Chatting',
        startAt: new Date(Date.now() + 172800000),
        expectedDurationMinutes: 120,
        timezone: 'UTC',
        maximumParticipants: 3,
      }
    ]).onConflictDoNothing();

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await client.end();
  }
}

seed();
