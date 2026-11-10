import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../src/app.js';
import { setupTestReplSet, teardownTestReplSet, clearCollections } from './setup.js';
import { Wallet } from '../src/models/wallet.model.js';
import { User } from '../src/models/user.model.js';
import { Transaction } from '../src/models/transaction.model.js';
import { settlementWorker, SettlementWorker } from '../src/services/settlement.worker.js';
import { transferService } from '../src/services/transfer.service.js';

describe('PayFlow Undo & Settlement Engine', () => {
  beforeAll(async () => {
    await setupTestReplSet();
  });

  afterAll(async () => {
    await teardownTestReplSet();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  // Helper to register user and return token & user
  async function createRegisteredUser(name: string, email: string, initialTopupPaise = 0) {
    const regRes = await request(app).post('/api/auth/register').send({
      name,
      email,
      password: 'Password123',
    });
    const token = regRes.body.data.token;
    const user = regRes.body.data.user;

    if (initialTopupPaise > 0) {
      await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({ amount: initialTopupPaise });
    }

    return { token, user };
  }

  // 1. Successful transfer cancellation within the 10-second window
  it('1. should allow sender to cancel transfer within 10-second window and restore available balance', async () => {
    const alice = await createRegisteredUser('Alice', 'alice@example.com', 100000); // ₹1,000
    const bob = await createRegisteredUser('Bob', 'bob@example.com', 0); // ₹0

    // Alice initiates transfer of ₹300 (30,000 paise)
    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${alice.token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        receiverEmail: 'bob@example.com',
        amount: 30000,
        note: 'Lunch money',
      });

    expect(transferRes.status).toBe(200);
    const txId = transferRes.body.data.transaction.id;
    expect(transferRes.body.data.transaction.status).toBe('PENDING_UNDO');
    expect(transferRes.body.data.senderRemainingAvailableBalance).toBe(70000); // ₹700

    // Verify database state while in PENDING_UNDO
    const aliceWalletDuring = await Wallet.findOne({ userId: alice.user.id });
    expect(aliceWalletDuring?.availableBalance).toBe(70000);
    expect(aliceWalletDuring?.heldBalance).toBe(30000);
    // Invariant: availableBalance + heldBalance = total
    expect(aliceWalletDuring!.availableBalance + aliceWalletDuring!.heldBalance).toBe(100000);

    const bobWalletDuring = await Wallet.findOne({ userId: bob.user.id });
    expect(bobWalletDuring?.availableBalance).toBe(0); // Not credited yet

    // Alice cancels transfer before 10s expires
    const undoRes = await request(app)
      .post(`/api/transfers/${txId}/undo`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(undoRes.status).toBe(200);
    expect(undoRes.body.success).toBe(true);
    expect(undoRes.body.data.transaction.status).toBe('CANCELLED');
    expect(undoRes.body.data.senderRestoredBalance).toBe(100000);

    // Verify final database state: funds fully refunded
    const aliceWalletAfter = await Wallet.findOne({ userId: alice.user.id });
    expect(aliceWalletAfter?.availableBalance).toBe(100000);
    expect(aliceWalletAfter?.heldBalance).toBe(0);

    const bobWalletAfter = await Wallet.findOne({ userId: bob.user.id });
    expect(bobWalletAfter?.availableBalance).toBe(0);

    // Verify transaction record
    const txDoc = await Transaction.findById(txId);
    expect(txDoc?.status).toBe('CANCELLED');
    expect(txDoc?.cancelledAt).toBeDefined();
  });

  // 2. Rejection of cancellation after expiration
  it('2. should reject cancellation attempt once the 10-second undo window has expired', async () => {
    const alice = await createRegisteredUser('Alice Expire', 'alice_exp@example.com', 100000);
    const bob = await createRegisteredUser('Bob Expire', 'bob_exp@example.com', 0);

    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${alice.token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        receiverEmail: 'bob_exp@example.com',
        amount: 20000,
      });

    const txId = transferRes.body.data.transaction.id;

    // Simulate clock advancing past the 10-second deadline
    await Transaction.findByIdAndUpdate(txId, {
      undoExpiresAt: new Date(Date.now() - 5000), // 5 seconds in the past
    });

    const undoRes = await request(app)
      .post(`/api/transfers/${txId}/undo`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(undoRes.status).toBe(400);
    expect(undoRes.body.success).toBe(false);
    expect(undoRes.body.error.code).toBe('UNDO_WINDOW_EXPIRED');

    // Funds remain held until worker settles it
    const aliceWallet = await Wallet.findOne({ userId: alice.user.id });
    expect(aliceWallet?.heldBalance).toBe(20000);
    expect(aliceWallet?.availableBalance).toBe(80000);
  });

  // 3. Automatic settlement of expired transactions
  it('3. should automatically settle expired PENDING_UNDO transactions via background worker', async () => {
    const alice = await createRegisteredUser('Alice Auto', 'alice_auto@example.com', 100000);
    const bob = await createRegisteredUser('Bob Auto', 'bob_auto@example.com', 0);

    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${alice.token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        receiverEmail: 'bob_auto@example.com',
        amount: 40000,
      });

    const txId = transferRes.body.data.transaction.id;

    // Fast-forward transaction expiry
    await Transaction.findByIdAndUpdate(txId, {
      undoExpiresAt: new Date(Date.now() - 1000),
    });

    // Run settlement worker
    const settledCount = await settlementWorker.processExpiredTransactions();
    expect(settledCount).toBe(1);

    // Verify Bob is credited and Alice held balance is released
    const aliceWallet = await Wallet.findOne({ userId: alice.user.id });
    expect(aliceWallet?.availableBalance).toBe(60000);
    expect(aliceWallet?.heldBalance).toBe(0);
    expect(aliceWallet?.balance).toBe(60000);

    const bobWallet = await Wallet.findOne({ userId: bob.user.id });
    expect(bobWallet?.availableBalance).toBe(40000);
    expect(bobWallet?.balance).toBe(40000);

    const txDoc = await Transaction.findById(txId);
    expect(txDoc?.status).toBe('SETTLED');
    expect(txDoc?.settledAt).toBeDefined();
  });

  // 4. Prevention of duplicate cancellations
  it('4. should handle duplicate cancellation requests safely and idempotently', async () => {
    const alice = await createRegisteredUser('Alice Dup', 'alice_dup@example.com', 100000);
    const bob = await createRegisteredUser('Bob Dup', 'bob_dup@example.com', 0);

    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${alice.token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        receiverEmail: 'bob_dup@example.com',
        amount: 25000,
      });

    const txId = transferRes.body.data.transaction.id;

    // First cancel request
    const firstUndo = await request(app)
      .post(`/api/transfers/${txId}/undo`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(firstUndo.status).toBe(200);
    expect(firstUndo.body.data.transaction.status).toBe('CANCELLED');

    // Duplicate cancel request
    const secondUndo = await request(app)
      .post(`/api/transfers/${txId}/undo`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(secondUndo.status).toBe(200);
    expect(secondUndo.body.data.transaction.status).toBe('CANCELLED');
    expect(secondUndo.body.data.senderRestoredBalance).toBe(100000);

    // Verify balance was refunded ONCE, NOT twice (100000, not 125000)
    const aliceWallet = await Wallet.findOne({ userId: alice.user.id });
    expect(aliceWallet?.availableBalance).toBe(100000);
    expect(aliceWallet?.heldBalance).toBe(0);
  });

  // 5. Prevention of duplicate settlements
  it('5. should prevent duplicate settlements and ensure receiver is credited only once', async () => {
    const alice = await createRegisteredUser('Alice SetDup', 'alice_sdup@example.com', 100000);
    const bob = await createRegisteredUser('Bob SetDup', 'bob_sdup@example.com', 0);

    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${alice.token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        receiverEmail: 'bob_sdup@example.com',
        amount: 30000,
      });

    const txId = transferRes.body.data.transaction.id;

    await Transaction.findByIdAndUpdate(txId, {
      undoExpiresAt: new Date(Date.now() - 1000),
    });

    // Run first settlement
    const firstSettled = await settlementWorker.settleTransaction(txId);
    expect(firstSettled).toBe(true);

    // Run second settlement attempt on already settled transaction
    const secondSettled = await settlementWorker.settleTransaction(txId);
    expect(secondSettled).toBe(false);

    // Verify Bob received exactly 30000, not 60000
    const bobWallet = await Wallet.findOne({ userId: bob.user.id });
    expect(bobWallet?.availableBalance).toBe(30000);

    const aliceWallet = await Wallet.findOne({ userId: alice.user.id });
    expect(aliceWallet?.availableBalance).toBe(70000);
    expect(aliceWallet?.heldBalance).toBe(0);
  });

  // 6. Correct resolution of concurrent undo and settlement attempts
  it('6. [CRITICAL RACE CONDITION] concurrent undo and settlement attempts must resolve with exactly one winner', async () => {
    const alice = await createRegisteredUser('Alice Race', 'alice_race@example.com', 100000);
    const bob = await createRegisteredUser('Bob Race', 'bob_race@example.com', 0);

    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${alice.token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        receiverEmail: 'bob_race@example.com',
        amount: 50000,
      });

    const txId = transferRes.body.data.transaction.id;

    // Align undoExpiresAt exactly around current time to create a live contention
    const now = new Date();
    await Transaction.findByIdAndUpdate(txId, {
      undoExpiresAt: now,
    });

    // Execute undoTransfer and settleTransaction concurrently
    const [undoResult, settlementResult] = await Promise.allSettled([
      transferService.undoTransfer(alice.user.id, txId),
      settlementWorker.settleTransaction(txId),
    ]);

    // Inspect the single winner
    const txFinal = await Transaction.findById(txId);
    expect(['CANCELLED', 'SETTLED']).toContain(txFinal?.status);

    const aliceWalletFinal = await Wallet.findOne({ userId: alice.user.id });
    const bobWalletFinal = await Wallet.findOne({ userId: bob.user.id });

    if (txFinal?.status === 'CANCELLED') {
      // Undo won: Alice has 100000, Bob has 0
      expect(aliceWalletFinal?.availableBalance).toBe(100000);
      expect(bobWalletFinal?.availableBalance).toBe(0);
      expect(undoResult.status).toBe('fulfilled');
    } else {
      // Settlement won: Alice has 50000, Bob has 50000
      expect(aliceWalletFinal?.availableBalance).toBe(50000);
      expect(bobWalletFinal?.availableBalance).toBe(50000);
      expect(settlementResult.status).toBe('fulfilled');
    }

    // Absolute financial conservation: system money must strictly equal ₹1,000 (100,000 paise)
    const totalSystemPaise =
      (aliceWalletFinal?.availableBalance || 0) +
      (aliceWalletFinal?.heldBalance || 0) +
      (bobWalletFinal?.availableBalance || 0) +
      (bobWalletFinal?.heldBalance || 0);

    expect(totalSystemPaise).toBe(100000);
  });

  // 7. Recovery of pending transactions after server restart
  it('7. should recover and settle interrupted transactions in SETTLING or PENDING_UNDO state across worker restarts', async () => {
    const alice = await createRegisteredUser('Alice Crash', 'alice_crash@example.com', 100000);
    const bob = await createRegisteredUser('Bob Crash', 'bob_crash@example.com', 0);

    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${alice.token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        receiverEmail: 'bob_crash@example.com',
        amount: 35000,
      });

    const txId = transferRes.body.data.transaction.id;

    // Simulate server crash midway: transaction was claimed into SETTLING but process died before completing
    await Transaction.findByIdAndUpdate(txId, {
      status: 'SETTLING',
      undoExpiresAt: new Date(Date.now() - 10000),
    });

    // Create a fresh worker instance simulating a new server boot
    const restartedWorker = new SettlementWorker();
    const recoveredCount = await restartedWorker.processExpiredTransactions();

    expect(recoveredCount).toBe(1);

    const txDoc = await Transaction.findById(txId);
    expect(txDoc?.status).toBe('SETTLED');
    expect(txDoc?.settledAt).toBeDefined();

    const bobWallet = await Wallet.findOne({ userId: bob.user.id });
    expect(bobWallet?.availableBalance).toBe(35000);

    const aliceWallet = await Wallet.findOne({ userId: alice.user.id });
    expect(aliceWallet?.heldBalance).toBe(0);
    expect(aliceWallet?.availableBalance).toBe(65000);
  });

  // 8. Verification of wallet balance conservation across all flows
  it('8. should preserve total financial conservation across complex mixed transaction flows', async () => {
    const u1 = await createRegisteredUser('User 1', 'u1@example.com', 100000); // 1000
    const u2 = await createRegisteredUser('User 2', 'u2@example.com', 100000); // 1000
    const u3 = await createRegisteredUser('User 3', 'u3@example.com', 100000); // 1000

    const initialTotalPaise = 300000;

    // Transfer 1: u1 -> u2 (20,000 paise) -> will be cancelled
    const t1 = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${u1.token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ receiverEmail: 'u2@example.com', amount: 20000 });

    // Transfer 2: u2 -> u3 (40,000 paise) -> will be settled
    const t2 = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${u2.token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ receiverEmail: 'u3@example.com', amount: 40000 });

    // Transfer 3: u3 -> u1 (15,000 paise) -> stays in PENDING_UNDO
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${u3.token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ receiverEmail: 'u1@example.com', amount: 15000 });

    // Cancel t1
    await request(app)
      .post(`/api/transfers/${t1.body.data.transaction.id}/undo`)
      .set('Authorization', `Bearer ${u1.token}`);

    // Settle t2
    await Transaction.findByIdAndUpdate(t2.body.data.transaction.id, {
      undoExpiresAt: new Date(Date.now() - 1000),
    });
    await settlementWorker.settleTransaction(t2.body.data.transaction.id);

    // Sum all wallet funds across all wallets in the system
    const allWallets = await Wallet.find({});
    const totalAvailable = allWallets.reduce((acc, w) => acc + w.availableBalance, 0);
    const totalHeld = allWallets.reduce((acc, w) => acc + w.heldBalance, 0);
    const systemTotalFunds = totalAvailable + totalHeld;

    // INVARIANT: Exactly 300,000 paise in system
    expect(systemTotalFunds).toBe(initialTotalPaise);

    // u3 held balance must be exactly 15,000 (from Transfer 3 still pending undo)
    const u3Wallet = await Wallet.findOne({ userId: u3.user.id });
    expect(u3Wallet?.heldBalance).toBe(15000);
  });
});

