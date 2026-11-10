import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { Wallet } from '../models/wallet.model.js';
import { Transaction } from '../models/transaction.model.js';
import { IdempotencyRecord } from '../models/idempotency.model.js';
import { logger } from './logger.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';

export async function seedDatabase() {
  try {
    logger.info('Starting PayFlow Database Seeding...');
    await connectDatabase(env.MONGODB_URI);

    // Clean existing records
    await Promise.all([
      User.deleteMany({}),
      Wallet.deleteMany({}),
      Transaction.deleteMany({}),
      IdempotencyRecord.deleteMany({}),
    ]);

    logger.info('Purged existing test data.');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123', salt);

    // 1. Create Core Demo Users
    const usersData = [
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        initialBalancePaise: 2500000, // ₹25,000.00
      },
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        initialBalancePaise: 1500000, // ₹15,000.00
      },
      {
        name: 'Charlie Davis',
        email: 'charlie@example.com',
        initialBalancePaise: 500000, // ₹5,000.00
      },
    ];

    const createdUsers: any[] = [];
    const createdWallets: any[] = [];

    for (const u of usersData) {
      const user = await User.create({
        name: u.name,
        email: u.email,
        passwordHash,
      });

      const wallet = await Wallet.create({
        userId: user._id,
        balance: u.initialBalancePaise,
        availableBalance: u.initialBalancePaise,
        heldBalance: 0,
        currency: 'INR',
      });

      // Record initial topup transaction
      await Transaction.create({
        type: 'TOPUP',
        senderWalletId: null,
        receiverWalletId: wallet._id,
        initiatedBy: user._id,
        amount: u.initialBalancePaise,
        status: 'SUCCESS',
        note: 'Initial Bank Account Onboarding Top-up',
        idempotencyKey: `seed-topup-${u.email}`,
      });

      createdUsers.push(user);
      createdWallets.push(wallet);
      logger.info(`Seeded account: ${u.email} with ₹${u.initialBalancePaise / 100}`);
    }

    // 2. Create sample peer-to-peer transfer history between Alice and Bob
    const aliceUser = createdUsers[0];
    const bobUser = createdUsers[1];
    const charlieUser = createdUsers[2];

    const aliceWallet = createdWallets[0];
    const bobWallet = createdWallets[1];
    const charlieWallet = createdWallets[2];

    const sampleTransfers = [
      {
        sender: aliceUser,
        receiver: bobUser,
        senderWallet: aliceWallet,
        receiverWallet: bobWallet,
        amount: 250000, // ₹2,500.00
        note: 'Team Dinner split at Taj',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        sender: bobUser,
        receiver: aliceUser,
        senderWallet: bobWallet,
        receiverWallet: aliceWallet,
        amount: 85000, // ₹850.00
        note: 'Coffee & Snacks reimbursement',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        sender: aliceUser,
        receiver: charlieUser,
        senderWallet: aliceWallet,
        receiverWallet: charlieWallet,
        amount: 500000, // ₹5,000.00
        note: 'Freelance Design Retainer',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        sender: charlieUser,
        receiver: bobUser,
        senderWallet: charlieWallet,
        receiverWallet: bobWallet,
        amount: 120000, // ₹1,200.00
        note: 'Cloud Server hosting contribution',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
    ];

    for (let i = 0; i < sampleTransfers.length; i++) {
      const tx = sampleTransfers[i];

      // Update balances
      await Wallet.findByIdAndUpdate(tx.senderWallet._id, {
        $inc: { balance: -tx.amount, availableBalance: -tx.amount },
      });
      await Wallet.findByIdAndUpdate(tx.receiverWallet._id, {
        $inc: { balance: tx.amount, availableBalance: tx.amount },
      });

      // Create transaction document
      await Transaction.create({
        type: 'TRANSFER',
        senderWalletId: tx.senderWallet._id,
        receiverWalletId: tx.receiverWallet._id,
        initiatedBy: tx.sender._id,
        amount: tx.amount,
        status: 'SUCCESS',
        note: tx.note,
        idempotencyKey: `seed-transfer-${i}-${Date.now()}`,
        createdAt: tx.createdAt,
      });
    }

    logger.info('Sample P2P transactions seeded successfully.');
    logger.info('--------------------------------------------------');
    logger.info('DEMO LOGINS FOR REVIEW:');
    logger.info('1) alice@example.com   | Password: Password123');
    logger.info('2) bob@example.com     | Password: Password123');
    logger.info('3) charlie@example.com | Password: Password123');
    logger.info('--------------------------------------------------');

    await disconnectDatabase();
  } catch (error) {
    logger.error('Seeding error:', error);
    process.exit(1);
  }
}

// Execute directly if run as CLI script
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
}

