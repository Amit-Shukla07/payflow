# PayFlow — High-Integrity Digital Wallet & P2P Payment Platform

> **"Send Money Instantly. Never Lose a Cent."**

PayFlow is a professional-grade, portfolio-ready digital wallet and peer-to-peer (P2P) payment engine engineered to demonstrate financial transaction correctness, strict concurrency safety, database-backed idempotency, and a polished modern fintech aesthetic inspired by PayPal, Stripe, and Revolut.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [Core Engineering Principles](#core-engineering-principles)
3. [Concurrency Control & Double-Spend Prevention](#concurrency-control--double-spend-prevention)
4. [Database-Backed Idempotency Engine](#database-backed-idempotency-engine)
5. [Technology Stack](#technology-stack)
6. [Database Schema & Indexing](#database-schema--indexing)
7. [API Specification](#api-specification)
8. [Automated Test Suite & Concurrency Verification](#automated-test-suite--concurrency-verification)
9. [Load Testing with k6](#load-testing-with-k6)
10. [Local Development Setup](#local-development-setup)
11. [Docker Deployment](#docker-deployment)
12. [Production Deployment Guide](#production-deployment-guide)
13. [Interview & Technical Defense Notes](#interview--technical-defense-notes)

---

## Architectural Overview

PayFlow strictly separates concerns using a layered architecture:

```
[ Frontend: React 18 + Vite + Tailwind CSS ]
                   │
                   ▼  (REST API with Bearer JWT & Idempotency-Key)
[ Express HTTP Router & Rate Limiting Middleware ]
                   │
                   ▼
[ Zod Request Validation & Authentication Middleware ]
                   │
                   ▼
[ Database-Backed Idempotency Deduplication Layer ]
                   │
                   ▼
[ Controllers (HTTP Request/Response Marshalling) ]
                   │
                   ▼
[ Domain Services (Business Logic & Atomic Financial Operations) ]
                   │
                   ▼
[ Mongoose Models & MongoDB Multi-Document Transactions ]
                   │
                   ▼
[ MongoDB Replica Set (WiredTiger Storage Engine) ]
```

### Layered Separation of Concerns

* **Routes:** Map endpoints to appropriate middlewares and controllers.
* **Middlewares:** Enforce rate-limiting, Helmet security headers, CORS origin verification, JWT authentication, Zod request body/query validation, and idempotency locks.
* **Controllers:** Handle HTTP serialization and status codes. Free of domain business logic.
* **Services:** Encapsulate financial logic, multi-document ACID transactions, conditional atomic updates, and ledger audit generation.
* **Models:** Define strictly typed schemas with compound indexes and validation hooks.

---

## Core Engineering Principles

### 1. Zero Floating-Point Drift (Integer Paise Ledger)
Floating-point mathematics (IEEE 754) is dangerous in financial software:
```javascript
// Floating point disaster:
0.1 + 0.2 === 0.30000000000000004 // TRUE in JavaScript!
```
In PayFlow, **every monetary amount is stored and calculated as an integer in Paise** (1 INR = 100 Paise).
* ₹100.50 is stored strictly as `10050` paise.
* Minimum transfer: `100` paise (₹1.00).
* Float values are prohibited across models, validators, and transactions.

### 2. Financial Conservation Law
Money is never created or destroyed during transfers:
$$\Delta \text{Balance}_{\text{Sender}} + \Delta \text{Balance}_{\text{Receiver}} = 0$$
System-wide total balances equal exactly the sum of simulated top-ups.

---

## Concurrency Control & Double-Spend Prevention

### The Race Condition Problem (Read-Then-Update Flaw)
Naive implementations read the wallet balance into memory, verify `balance >= amount`, and then write `balance - amount`. Under concurrent requests, this leads to catastrophic overspending (double-spending).

### The PayFlow Solution: Conditional Atomic Update inside Replica Set Transactions
PayFlow executes transfers inside a **MongoDB Multi-Document Transaction** utilizing **conditional atomic decrement**:

```typescript
const updatedSenderWallet = await Wallet.findOneAndUpdate(
  {
    _id: senderWallet._id,
    balance: { $gte: amount }, // <-- Conditional Atomic Constraint at DB lock level
  },
  {
    $inc: { balance: -amount }, // <-- Atomic Decrement
  },
  {
    new: true,
    session,
  }
);

if (!updatedSenderWallet) {
  // If null is returned, balance was insufficient at the exact moment of lock acquisition
  throw new InsufficientFundsError('Transfer failed: Insufficient wallet balance');
}

// Atomically credit receiver
await Wallet.findOneAndUpdate(
  { _id: receiverWallet._id },
  { $inc: { balance: amount } },
  { new: true, session }
);

// Create immutable audit transaction record
await Transaction.create([ ... ], { session });
```

#### Why This Works:
1. WiredTiger acquires document-level write locks.
2. Even if 50 requests arrive simultaneously, MongoDB evaluates `balance: { $gte: amount }` sequentially against the latest committed state.
3. Once the balance drops below the threshold, subsequent requests immediately return `null` and are rejected with `400 INSUFFICIENT_FUNDS`.
4. No negative balance is possible.

---

## Database-Backed Idempotency Engine

Network drops or impatient users can trigger duplicate payment requests. PayFlow enforces database-level idempotency via the `Idempotency-Key` HTTP header.

### Idempotency Flow

```
Client sends POST /transfers (Header: Idempotency-Key: <UUID>)
                         │
                         ▼
        Does record exist in IdempotencyRecord?
                       /        \
                    YES          NO
                    /              \
        Is payload hash matched?     Create record (status: 'PENDING')
           /              \                         │
        NO                YES                       ▼
        │                  │                Execute Transfer
   409 Conflict     Is it 'PENDING'?                │
                    /             \                 ▼
                 YES               NO       Mark 'RESOLVED',
                  │                 │       Cache Response Body
         409 Concurrent       Return Cached         │
            Execution        200 OK Response        ▼
                           (Idempotent-Replay) Return 200 OK
```

### Key Guarantees:
* **Compound Unique Index:** `{ key: 1, userId: 1 }` prevents one user from hijacking another user's idempotency namespace.
* **Payload Verification:** SHA-256 hash of `method + path + body` ensures a key cannot be reused with conflicting transfer parameters.
* **Automatic TTL:** Records expire automatically after 24 hours.

---

## Technology Stack

### Backend
* **Runtime:** Node.js (v20+ / v22 / v24)
* **Framework:** Express.js with TypeScript
* **Database:** MongoDB 7.0+ (Replica Set required for multi-document transactions)
* **ODM:** Mongoose 8+
* **Validation:** Zod 3.24+
* **Security:** Helmet, CORS, bcryptjs, jsonwebtoken, express-rate-limit

### Frontend
* **Core:** React 18, TypeScript, Vite
* **Styling:** Tailwind CSS (Custom fintech color system: `#0B132B`, `#1D4ED8`, `#F8FAFC`)
* **Routing:** React Router v7
* **Icons:** Lucide React
* **Visualizations:** Recharts
* **HTTP Client:** Axios with request & response interceptors

### Testing & Infrastructure
* **Test Runner:** Vitest
* **Integration Testing:** Supertest + `MongoMemoryReplSet`
* **Load Testing:** k6
* **Containerization:** Docker & Docker Compose

---

## Database Schema & Indexing

### 1. `User` Collection
| Field | Type | Attributes | Description |
|---|---|---|---|
| `_id` | ObjectId | Primary Key | User unique ID |
| `name` | String | Trimmed, 2-100 chars | Full name |
| `email` | String | Unique, Lowercase, Indexed | Normalized login email |
| `passwordHash` | String | bcrypt (10 rounds) | Salted password hash |
| `createdAt` / `updatedAt` | Date | Timestamps | Audit timestamps |

### 2. `Wallet` Collection
| Field | Type | Attributes | Description |
|---|---|---|---|
| `_id` | ObjectId | Primary Key | Wallet unique ID |
| `userId` | ObjectId | Unique, Indexed, Ref: User | 1:1 user binding |
| `balance` | Number | Integer, $\ge 0$ | Stored in **integer Paise** |
| `currency` | String | Default: `'INR'` | ISO currency code |
| `createdAt` / `updatedAt` | Date | Timestamps | Audit timestamps |

### 3. `Transaction` Collection
| Field | Type | Attributes | Description |
|---|---|---|---|
| `_id` | ObjectId | Primary Key | Transaction audit ID |
| `type` | String | `'TRANSFER'` \| `'TOPUP'` | Transaction classification |
| `senderWalletId` | ObjectId | Nullable, Indexed, Ref: Wallet | Null for top-ups |
| `receiverWalletId` | ObjectId | Indexed, Ref: Wallet | Recipient wallet |
| `initiatedBy` | ObjectId | Indexed, Ref: User | Sender user ID |
| `amount` | Number | Integer Paise, min: 100 | Stored in paise |
| `status` | String | `'SUCCESS'` \| `'FAILED'` \| `'PENDING'` | Settlement state |
| `note` | String | Max 200 chars | User memo |
| `idempotencyKey` | String | Unique, Sparse, Indexed | Deduplication key |

#### Performance Compound Indexes:
* `{ senderWalletId: 1, createdAt: -1 }` — High-speed paginated debit lookups.
* `{ receiverWalletId: 1, createdAt: -1 }` — High-speed paginated credit lookups.
* `{ initiatedBy: 1, createdAt: -1 }` — User account audit logs.

### 4. `IdempotencyRecord` Collection
| Field | Type | Attributes | Description |
|---|---|---|---|
| `key` | String | Indexed | Client idempotency UUID |
| `userId` | ObjectId | Ref: User | Bound requesting user |
| `requestHash` | String | SHA-256 | Hash of endpoint + payload |
| `status` | String | `'PENDING'` \| `'RESOLVED'` \| `'FAILED'` | Key lifecycle state |
| `statusCode` | Number | Optional | Cached HTTP status |
| `responseBody` | Mixed | Optional | Cached JSON response |
| `createdAt` | Date | TTL index (86400s) | Auto-deleted after 24 hrs |

---

## API Specification

All responses adhere to a consistent envelope:

**Success Response:**
```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Transfer failed: Insufficient wallet balance for this transaction"
  }
}
```

### Endpoints

| Method | Endpoint | Auth | Headers | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | No | - | Register user and auto-provision INR wallet |
| `POST` | `/api/auth/login` | No | - | Authenticate user, return JWT and wallet |
| `GET` | `/api/auth/me` | Yes | Bearer Token | Current session profile and balance |
| `GET` | `/api/wallet` | Yes | Bearer Token | Fetch current wallet balance in paise/INR |
| `POST` | `/api/wallet/topup` | Yes | Idempotency-Key | Deposit simulated funds into wallet |
| `POST` | `/api/transfers` | Yes | Idempotency-Key | Atomic peer-to-peer money transfer |
| `GET` | `/api/transactions` | Yes | Bearer Token | Paginated transaction history with filters |
| `GET` | `/api/transactions/:id` | Yes | Bearer Token | Single transaction audit receipt |
| `GET` | `/api/health` | No | - | System uptime and MongoDB connectivity check |

---

## Automated Test Suite & Concurrency Verification

PayFlow includes 15 automated integration tests executed against an in-memory MongoDB replica set (`MongoMemoryReplSet`):

```bash
cd backend && npm test
```

### 15 Verified Test Scenarios:
1. `should register a new user and automatically create a wallet with zero balance`
2. `should reject duplicate registration with the same email address`
3. `should successfully log in an existing user and return a valid JWT`
4. `should reject login with invalid password using generic message`
5. `should reject unauthenticated requests to wallet endpoints`
6. `should successfully add simulated funds to wallet and record transaction`
7. `should successfully transfer money from sender to receiver atomically`
8. `should reject transfer when sender has insufficient funds`
9. `should reject attempts to transfer money to oneself`
10. `should reject transfer when recipient email does not exist`
11. `should safely replay cached response on duplicate request with same idempotency key`
12. `should reject idempotency key reuse with conflicting payload (409 conflict)`
13. `should roll back debit if downstream credit fails in database transaction`
14. **`[CRITICAL CONCURRENCY] 50 concurrent transfers of ₹100 from ₹1,000 balance must result in exactly 10 successes and ₹0 remaining balance`**
15. `should correctly paginate transaction history with direction indicators`

### Concurrency Test Execution Result:
```
✓ PayFlow High-Integrity Financial Banking Engine (15 tests passed)
  ✓ 14. [CRITICAL CONCURRENCY] 50 concurrent transfers:
      - Initial Balance: ₹1,000.00 (100,000 paise)
      - Executed: 50 parallel requests of ₹100.00 (10,000 paise)
      - Successful Transfers: EXACTLY 10 (200 OK)
      - Failed Transfers: EXACTLY 40 (400 INSUFFICIENT_FUNDS)
      - Final Sender Balance: EXACTLY ₹0.00 (0 paise)
      - Final Receiver Balance: EXACTLY ₹1,000.00 (100,000 paise)
      - System Conservation: 100% (No funds lost, no negative balance)
```

---

## Load Testing with k6

Load test script located at `backend/load-tests/load-test.js`.

### Running with k6:
```bash
# If k6 is installed locally:
k6 run backend/load-tests/load-test.js

# Or via Docker:
docker run --rm -i --net="host" grafana/k6 run - < backend/load-tests/load-test.js
```

### Expected Benchmarks:
* Sustained load: 20 Virtual Users (VUs)
* Threshold: 95th percentile latency ($p95$) $< 400\text{ ms}$
* Error rate: $< 5\%$ under peak load
* Teardown verification: Automatic conservation check confirming ledger balance matching.

---

## Local Development Setup

### Zero Docker Setup (Instant Local Dev)
You **do not need Docker installed** to run PayFlow or its tests! PayFlow includes a zero-config local MongoDB replica set runner powered by `mongodb-memory-server` with multi-document transactions enabled.

```bash
# 1. Install dependencies
npm --prefix backend install
npm --prefix frontend install

# 2. Start the zero-docker local MongoDB Replica Set (Terminal 1)
npm run dev:db

# 3. Seed demo accounts (Alice, Bob, Charlie) with sample transfers (Terminal 2)
npm run seed

# 4. Start the backend API server (Terminal 2)
npm run dev:backend

# 5. Start the frontend application (Terminal 3)
npm run dev:frontend
```

Now open [http://localhost:5173](http://localhost:5173) in your browser!

### Alternative MongoDB Options
* **Option A: Free Cloud MongoDB Atlas Cluster:**
  Create a free M0 cluster on [mongodb.com/atlas](https://www.mongodb.com/atlas). Atlas clusters are 3-node replica sets by default. Simply update `MONGODB_URI` in `backend/.env`.
* **Option B: Homebrew on macOS:**
  ```bash
  brew tap mongodb/brew
  brew install mongodb-community@7.0
  brew services start mongodb-community@7.0
  ```
* **Option C: Automated Tests:**
  The automated test suite (`npm test`) manages its own isolated in-memory replica set and does not require Docker or any external database.

---

---

## Docker Deployment

Run the complete multi-container stack with a single command:

```bash
docker-compose up --build
```

This starts:
1. `payflow-mongo`: MongoDB 7 configured as a single-node replica set `rs0`.
2. `payflow-mongo-init`: Auto-initiates `rs.initiate()` and exits.
3. `payflow-backend`: Multi-stage Alpine container running Node.js production server.
4. `payflow-frontend`: Multi-stage container compiled with Vite and served via Nginx.

---

## Production Deployment Guide

### Frontend Deployment (Vercel)
1. Set Root Directory to `frontend`.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Set Environment Variable: `VITE_API_BASE_URL=https://your-backend-domain.com/api`

### Backend Deployment (Railway or Render)
1. Set Root Directory to `backend`.
2. Build Command: `npm run build`
3. Start Command: `npm start`
4. Set Environment Variables:
   * `NODE_ENV=production`
   * `PORT=5000`
   * `MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/payflow?retryWrites=true&w=majority`
   * `JWT_SECRET=<strong-random-32-character-secret>`
   * `CORS_ORIGIN=https://your-frontend-domain.vercel.app`

### Database (MongoDB Atlas)
* MongoDB Atlas automatically deploys a 3-node replica set across AWS/GCP regions. Multi-document transactions work out-of-the-box on Atlas.

---

## Interview & Technical Defense Notes

When presenting PayFlow during software engineering interviews (e.g. at PayPal), use these key architectural talking points:

1. **Why not read balance, check in memory, then update?**
   > *"Under concurrency, two requests reading balance = ₹500 will both pass the validation and debit ₹500, dropping the balance to -₹500. By pushing the predicate `{ balance: { $gte: amount } }` directly into the database write operation, MongoDB's document write lock ensures atomicity."*

2. **Why integer paise instead of floating point numbers?**
   > *"Binary floating-point arithmetic (IEEE 754) cannot accurately represent fractional base-10 decimals like 0.1 or 0.2. Over millions of transactions, rounding drift accumulates into real monetary discrepancy. Representing currency in integer minor units (paise/cents) guarantees exact decimal correctness."*

3. **How does idempotency prevent duplicate payments?**
   > *"The client generates a unique UUID `Idempotency-Key` for the transfer intent. If network latency delays the response and the user clicks again or an automated retry fires, the request is intercepted at the database layer via a unique index on `{ key, userId }`. Conflicting payloads with the same key are rejected with 409 Conflict, while identical replays return the cached original receipt without re-executing ledger operations."*

4. **Why require MongoDB replica sets?**
   > *"MongoDB standalone instances do not support multi-document ACID transactions. Replica sets provide the oplog and majority write concern required for two-phase commit transaction isolation."*

---

## License

MIT License. Designed and built for engineering portfolio demonstration.

