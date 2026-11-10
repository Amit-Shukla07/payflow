import { MongoMemoryReplSet } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';

async function startDevDb() {
  const devDataDir = path.resolve(process.cwd(), '.mongo-dev-data');
  if (!fs.existsSync(devDataDir)) {
    fs.mkdirSync(devDataDir, { recursive: true });
  }

  console.log('[PayFlow] Starting local in-memory MongoDB replica set for development...');

  try {
    const port = process.env.MONGODB_PORT ? parseInt(process.env.MONGODB_PORT, 10) : 27017;

    const replSet = await MongoMemoryReplSet.create({
      replSet: {
        name: 'rs0',
        count: 1,
        storageEngine: 'wiredTiger',
      },
      instanceOpts: [
        {
          port,
          dbPath: devDataDir,
        },
      ],
    });

    const uri = replSet.getUri('payflow');

    console.log('\n================================================================');
    console.log('🚀 PayFlow Local MongoDB Replica Set is ACTIVE (No Docker Needed!)');
    console.log(`📍 Connection URI : ${uri}`);
    console.log(`💾 Local Data Dir : ${devDataDir}`);
    console.log('🔒 ACID Transactions: ENABLED & READY');
    console.log('================================================================\n');
    console.log('You can now run "npm run dev:backend" in another terminal tab.\n');

    const handleExit = async () => {
      console.log('\nStopping local MongoDB replica set...');
      await replSet.stop();
      process.exit(0);
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
  } catch (error: any) {
    // If port 27017 is already in use by a local mongod, report clean notice
    if (error.message?.includes('EADDRINUSE') || error.code === 'EADDRINUSE') {
      console.log('\n[Notice] Port 27017 is already running an active MongoDB instance.');
      console.log('Your backend can connect directly to it!\n');
    } else {
      console.error('Error starting dev replica set:', error);
      process.exit(1);
    }
  }
}

startDevDb();

