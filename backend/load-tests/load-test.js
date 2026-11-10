import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '15s', target: 20 }, // Ramp-up to 20 virtual users
    { duration: '30s', target: 20 }, // Sustained load
    { duration: '10s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'], // 95% of requests must complete within 400ms
    http_req_failed: ['rate<0.05'],    // Error rate must be under 5%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api';

export function setup() {
  console.log('--- Setting up PayFlow Load Test ---');

  // 1. Register Sender
  const senderEmail = `load_sender_${Date.now()}@payflow.load`;
  const senderReg = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      name: 'Load Test Sender',
      email: senderEmail,
      password: 'Password123',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const senderToken = senderReg.json('data.token');

  // 2. Register Receiver
  const receiverEmail = `load_receiver_${Date.now()}@payflow.load`;
  http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      name: 'Load Test Receiver',
      email: receiverEmail,
      password: 'Password123',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  // 3. Top up Sender with ₹50,000 (5,000,000 Paise)
  http.post(
    `${BASE_URL}/wallet/topup`,
    JSON.stringify({
      amount: 5000000,
      note: 'Load Test Inflow Seed',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${senderToken}`,
        'Idempotency-Key': uuidv4(),
      },
    }
  );

  return {
    senderToken,
    receiverEmail,
  };
}

export default function (data) {
  const { senderToken, receiverEmail } = data;

  // 1. Test POST /transfers (Transfer ₹10 = 1,000 Paise)
  const transferKey = uuidv4();
  const transferPayload = JSON.stringify({
    receiverEmail: receiverEmail,
    amount: 1000,
    note: 'Load Test Simulated Micro-transfer',
  });

  const transferRes = http.post(`${BASE_URL}/transfers`, transferPayload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${senderToken}`,
      'Idempotency-Key': transferKey,
    },
  });

  check(transferRes, {
    'transfer status is 200': (r) => r.status === 200,
    'transfer was successful': (r) => r.json('success') === true,
  });

  // 2. Test GET /transactions
  const txRes = http.get(`${BASE_URL}/transactions?page=1&limit=10`, {
    headers: {
      Authorization: `Bearer ${senderToken}`,
    },
  });

  check(txRes, {
    'get transactions status is 200': (r) => r.status === 200,
    'transactions array returned': (r) => r.json('data.items') !== undefined,
  });

  sleep(0.1);
}

export function teardown(data) {
  console.log('--- Teardown: Verifying System Conservation ---');
  const res = http.get(`${BASE_URL}/wallet`, {
    headers: { Authorization: `Bearer ${data.senderToken}` },
  });
  console.log('Final Sender Wallet Balance:', res.json('data.formattedBalance'));
}

