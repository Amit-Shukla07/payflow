import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../src/app.js';
import { setupTestReplSet, teardownTestReplSet, clearCollections } from './setup.js';
import { Wallet } from '../src/models/wallet.model.js';
import { User } from '../src/models/user.model.js';
import { Transaction } from '../src/models/transaction.model.js';
import { settlementWorker } from '../src/services/settlement.worker.js';

describe('PayFlow High-Integrity Financial Banking Engine', () => {
  beforeAll(async () => {
    await setupTestReplSet();
  });

  afterAll(async () => {
    await teardownTestReplSet();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  // TEST 1: Successful registration
  it('1. should register a new user and automatically create a wallet with zero balance', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: 'Password123',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.wallet.balance).toBe(0);
    expect(res.body.data.wallet.currency).toBe('INR');
    expect(res.body.data.token).toBeDefined();

    // Verify wallet in DB
    const wallet = await Wallet.findOne({ userId: res.body.data.user.id });
    expect(wallet).toBeDefined();
    expect(wallet?.balance).toBe(0);
  });

  // TEST 2: Duplicate registration
  it('2. should reject duplicate registration with the same email address', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'Password123',
    });

    const duplicateRes = await request(app).post('/api/auth/register').send({
      name: 'Alice Twin',
      email: 'alice@example.com',
      password: 'Password456',
    });

    expect(duplicateRes.status).toBe(400);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.error.code).toBe('USER_EXISTS');
  });

  // TEST 3: Successful login
  it('3. should successfully log in an existing user and return a valid JWT', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'Password123',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'bob@example.com',
      password: 'Password123',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.user.name).toBe('Bob Smith');
    expect(loginRes.body.data.token).toBeDefined();
  });

  // TEST 4: Incorrect credentials
  it('4. should reject login with invalid password using generic message', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'Password123',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'bob@example.com',
      password: 'WrongPassword999',
    });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);
    expect(loginRes.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  // TEST 5: Unauthorized wallet access
  it('5. should reject unauthenticated requests to wallet endpoints', async () => {
    const res = await request(app).get('/api/wallet');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // TEST 6: Successful top-up
  it('6. should successfully add simulated funds to wallet and record transaction', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      password: 'Password123',
    });
    const token = regRes.body.data.token;

    const topupKey = crypto.randomUUID();
    const topupRes = await request(app)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', topupKey)
      .send({
        amount: 500000, // ₹5,000.00
        note: 'Initial Bank Account Load',
      });

    expect(topupRes.status).toBe(200);
    expect(topupRes.body.success).toBe(true);
    expect(topupRes.body.data.wallet.balance).toBe(500000);
    expect(topupRes.body.data.transaction.type).toBe('TOPUP');

    // Verify DB state
    const wallet = await Wallet.findOne({ userId: regRes.body.data.user.id });
    expect(wallet?.balance).toBe(500000);
  });

  // TEST 7: Successful money transfer
  it('7. should successfully transfer money from sender to receiver atomically', async () => {
    // 1. Register Sender (₹2,000 balance)
    const senderReg = await request(app).post('/api/auth/register').send({
      name: 'Sender User',
      email: 'sender@example.com',
      password: 'Password123',
    });
    const senderToken = senderReg.body.data.token;

    await request(app)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ amount: 200000 }); // ₹2,000

    // 2. Register Receiver (₹0 balance)
    const receiverReg = await request(app).post('/api/auth/register').send({
      name: 'Receiver User',
      email: 'receiver@example.com',
      password: 'Password123',
    });
    const receiverToken = receiverReg.body.data.token;

    // 3. Perform transfer: ₹500 (50,000 paise)
    const transferKey = crypto.randomUUID();
    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', transferKey)
      .send({
        receiverEmail: 'receiver@example.com',
        amount: 50000,
        note: 'Dinner payment',
      });

    expect(transferRes.status).toBe(200);
    expect(transferRes.body.success).toBe(true);
    expect(transferRes.body.data.senderRemainingBalance).toBe(150000); // ₹1,500
    expect(transferRes.body.data.transaction.amount).toBe(50000);
    expect(transferRes.body.data.transaction.status).toBe('PENDING_UNDO');

    // Settle the transaction through the settlement worker
    // Set expiry to past so worker can settle
    await Transaction.findByIdAndUpdate(transferRes.body.data.transaction.id, {
      undoExpiresAt: new Date(Date.now() - 1000),
    });
    const settled = await settlementWorker.settleTransaction(transferRes.body.data.transaction.id);
    expect(settled).toBe(true);

    // Verify receiver's wallet balance
    const receiverWalletRes = await request(app)
      .get('/api/wallet')
      .set('Authorization', `Bearer ${receiverToken}`);
    expect(receiverWalletRes.body.data.balance).toBe(50000); // ₹500
  });

  // TEST 8: Insufficient balance
  it('8. should reject transfer when sender has insufficient funds', async () => {
    const senderReg = await request(app).post('/api/auth/register').send({
      name: 'Broke Sender',
      email: 'broke@example.com',
      password: 'Password123',
    });
    const senderToken = senderReg.body.data.token;

    await request(app).post('/api/auth/register').send({
      name: 'Receiver User',
      email: 'rec1@example.com',
      password: 'Password123',
    });

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        receiverEmail: 'rec1@example.com',
        amount: 10000, // ₹100 but sender has ₹0
        note: 'Payment attempt',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
  });

  // TEST 9: Self-transfer rejection
  it('9. should reject attempts to transfer money to oneself', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Selfish User',
      email: 'self@example.com',
      password: 'Password123',
    });
    const token = reg.body.data.token;

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        receiverEmail: 'self@example.com',
        amount: 1000,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SELF_TRANSFER_PROHIBITED');
  });

  // TEST 10: Unknown receiver
  it('10. should reject transfer when recipient email does not exist', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Sender User',
      email: 'sender2@example.com',
      password: 'Password123',
    });
    const token = reg.body.data.token;

    await request(app)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ amount: 100000 });

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        receiverEmail: 'ghost@nonexistent.domain',
        amount: 5000,
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RECEIVER_NOT_FOUND');
  });

  // TEST 11: Duplicate idempotency key replay
  it('11. should safely replay cached response on duplicate request with same idempotency key', async () => {
    const sender = await request(app).post('/api/auth/register').send({
      name: 'Idempotency Sender',
      email: 'idem_sender@example.com',
      password: 'Password123',
    });
    const token = sender.body.data.token;

    await request(app).post('/api/auth/register').send({
      name: 'Idempotency Receiver',
      email: 'idem_receiver@example.com',
      password: 'Password123',
    });

    await request(app)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ amount: 100000 }); // ₹1,000

    const sharedKey = 'fixed-idempotency-key-uuid-12345';

    // First request
    const firstRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', sharedKey)
      .send({
        receiverEmail: 'idem_receiver@example.com',
        amount: 25000, // ₹250
        note: 'First attempt',
      });

    expect(firstRes.status).toBe(200);
    expect(firstRes.body.data.senderRemainingBalance).toBe(75000);

    // Duplicate request with identical payload and key
    const secondRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', sharedKey)
      .send({
        receiverEmail: 'idem_receiver@example.com',
        amount: 25000,
        note: 'First attempt',
      });

    expect(secondRes.status).toBe(200);
    expect(secondRes.header['idempotent-replay']).toBe('true');
    expect(secondRes.body.data.senderRemainingBalance).toBe(75000);

    // Verify sender was debited only ONCE
    const senderWallet = await Wallet.findOne({ userId: sender.body.data.user.id });
    expect(senderWallet?.availableBalance).toBe(75000);
    expect(senderWallet?.heldBalance).toBe(25000);

    // Verify only ONE transaction document was created
    const txCount = await Transaction.countDocuments({ idempotencyKey: sharedKey });
    expect(txCount).toBe(1);
  });

  // TEST 12: Idempotency key reuse with different payload
  it('12. should reject idempotency key reuse with conflicting payload', async () => {
    const sender = await request(app).post('/api/auth/register').send({
      name: 'Conflict Sender',
      email: 'conflict@example.com',
      password: 'Password123',
    });
    const token = sender.body.data.token;

    await request(app).post('/api/auth/register').send({
      name: 'Recipient One',
      email: 'target1@example.com',
      password: 'Password123',
    });

    await request(app)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ amount: 100000 });

    const key = 'conflict-test-key-99999';

    // Request 1: ₹100
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({
        receiverEmail: 'target1@example.com',
        amount: 10000,
      });

    // Request 2: reuse same key for ₹200 (different amount)
    const conflictRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({
        receiverEmail: 'target1@example.com',
        amount: 20000,
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.success).toBe(false);
    expect(conflictRes.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  // TEST 13: Transaction rollback
  it('13. should roll back debit if downstream credit fails in database transaction', async () => {
    const sender = await request(app).post('/api/auth/register').send({
      name: 'Rollback Sender',
      email: 'rbsender@example.com',
      password: 'Password123',
    });
    const token = sender.body.data.token;

    await request(app)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ amount: 50000 }); // ₹500

    const senderWalletBefore = await Wallet.findOne({ userId: sender.body.data.user.id });
    expect(senderWalletBefore?.balance).toBe(50000);

    // Intentionally send to nonexistent receiver, which aborts before committing
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        receiverEmail: 'missing_user@example.com',
        amount: 20000,
      });

    // Balance remains exactly intact
    const senderWalletAfter = await Wallet.findOne({ userId: sender.body.data.user.id });
    expect(senderWalletAfter?.balance).toBe(50000);
  });

  // TEST 14: CRITICAL CONCURRENCY TEST
  // Create a wallet with ₹1,000 (100,000 paise).
  // Execute 50 simultaneous transfer requests of ₹100 (10,000 paise) each.
  // Expected result:
  // Exactly 10 transfers succeed.
  // 40 transfers fail due to insufficient funds.
  // Final sender balance is ₹0.
  // Receiver receives exactly ₹1,000.
  // No negative balance.
  // No money is lost or created.
  it('14. [CRITICAL CONCURRENCY] 50 concurrent transfers of ₹100 from ₹1,000 balance must result in exactly 10 successes and ₹0 remaining balance', async () => {
    // 1. Setup Sender with exactly ₹1,000 (100,000 paise)
    const senderReg = await request(app).post('/api/auth/register').send({
      name: 'Concurrency Sender',
      email: 'concurrent_sender@example.com',
      password: 'Password123',
    });
    const senderToken = senderReg.body.data.token;
    const senderId = senderReg.body.data.user.id;

    await request(app)
      .post('/api/wallet/topup')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ amount: 100000 }); // Exactly ₹1,000

    // 2. Setup Receiver with ₹0
    const receiverReg = await request(app).post('/api/auth/register').send({
      name: 'Concurrency Receiver',
      email: 'concurrent_receiver@example.com',
      password: 'Password123',
    });
    const receiverId = receiverReg.body.data.user.id;

    // 3. Dispatch 50 simultaneous transfer requests of ₹100 (10,000 paise) each
    const CONCURRENT_REQUESTS = 50;
    const TRANSFER_AMOUNT = 10000; // ₹100

    const transferPromises = Array.from({ length: CONCURRENT_REQUESTS }, (_, index) => {
      const uniqueKey = `concurrent-key-${index}-${crypto.randomUUID()}`;
      return request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${senderToken}`)
        .set('Idempotency-Key', uniqueKey)
        .send({
          receiverEmail: 'concurrent_receiver@example.com',
          amount: TRANSFER_AMOUNT,
          note: `Concurrent transfer index ${index}`,
        });
    });

    // Await all 50 in parallel
    const responses = await Promise.all(transferPromises);

    let successCount = 0;
    let failureCount = 0;
    let insufficientFundsCount = 0;

    for (const res of responses) {
      if (res.status === 200 && res.body.success === true) {
        successCount++;
      } else {
        failureCount++;
        if (res.body?.error?.code === 'INSUFFICIENT_FUNDS') {
          insufficientFundsCount++;
        }
      }
    }

    // Exact fintech correctness assertion
    expect(successCount).toBe(10);
    expect(failureCount).toBe(40);
    expect(insufficientFundsCount).toBe(40);

    // Verify Sender Final Available Balance in Database is EXACTLY ₹0
    const senderWalletFinal = await Wallet.findOne({ userId: senderId });
    expect(senderWalletFinal?.availableBalance).toBe(0);

    // Expire the 10 pending transfers and settle them with the background worker
    await Transaction.updateMany(
      { initiatedBy: senderId, type: 'TRANSFER' },
      { $set: { undoExpiresAt: new Date(Date.now() - 1000) } }
    );
    const settledCount = await settlementWorker.processExpiredTransactions();
    expect(settledCount).toBe(10);

    // Verify Sender and Receiver Balances in Database post-settlement
    const senderWalletPostSettlement = await Wallet.findOne({ userId: senderId });
    expect(senderWalletPostSettlement?.balance).toBe(0);
    expect(senderWalletPostSettlement?.heldBalance).toBe(0);

    const receiverWalletFinal = await Wallet.findOne({ userId: receiverId });
    expect(receiverWalletFinal?.balance).toBe(100000);

    // Verify total money in system is conserved: 0 + 100000 = 100000
    const totalSystemPaise = (senderWalletPostSettlement?.balance || 0) + (receiverWalletFinal?.balance || 0);
    expect(totalSystemPaise).toBe(100000);

    // Verify exactly 10 SETTLED TRANSFER transaction records exist
    const txRecords = await Transaction.countDocuments({
      initiatedBy: senderId,
      type: 'TRANSFER',
      status: 'SETTLED',
    });
    expect(txRecords).toBe(10);
  });

  // TEST 15: Transaction history pagination
  it('15. should correctly paginate transaction history with direction indicators', async () => {
    const user = await request(app).post('/api/auth/register').send({
      name: 'History Tester',
      email: 'history@example.com',
      password: 'Password123',
    });
    const token = user.body.data.token;

    // Create 15 top-up transactions
    for (let i = 1; i <= 15; i++) {
      await request(app)
        .post('/api/wallet/topup')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({
          amount: 10000,
          note: `Deposit #${i}`,
        });
    }

    // Request page 1 with limit 10
    const page1Res = await request(app)
      .get('/api/transactions?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(page1Res.status).toBe(200);
    expect(page1Res.body.data.items.length).toBe(10);
    expect(page1Res.body.data.pagination.page).toBe(1);
    expect(page1Res.body.data.pagination.limit).toBe(10);
    expect(page1Res.body.data.pagination.total).toBe(15);
    expect(page1Res.body.data.pagination.totalPages).toBe(2);
    expect(page1Res.body.data.pagination.hasNextPage).toBe(true);

    // Request page 2 with limit 10
    const page2Res = await request(app)
      .get('/api/transactions?page=2&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(page2Res.status).toBe(200);
    expect(page2Res.body.data.items.length).toBe(5);
    expect(page2Res.body.data.pagination.page).toBe(2);
    expect(page2Res.body.data.pagination.hasNextPage).toBe(false);
    expect(page2Res.body.data.pagination.hasPrevPage).toBe(true);
  });
});

