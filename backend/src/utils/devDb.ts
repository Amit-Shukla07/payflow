import { MongoMemoryReplSet } from 'mongodb-memory-server';

async function start() {
  console.log('Starting MongoDB Replica Set rs0 on port 27017...');
  const replSet = await MongoMemoryReplSet.create({
    replSet: {
      name: 'rs0',
      count: 1,
      storageEngine: 'wiredTiger',
    },
    instanceOpts: [
      {
        port: 27017,
        dbName: 'payflow',
      },
    ],
  });

  const uri = replSet.getUri();
  console.log(`MongoDB Replica Set is live at ${uri}`);

  process.on('SIGINT', async () => {
    console.log('Stopping replica set...');
    await replSet.stop();
    process.exit(0);
  });
}

start().catch(console.error);

