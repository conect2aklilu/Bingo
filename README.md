# Merged Bingo — Wallet Edition (No Blockchain)

A real-time multiplayer 75-ball bingo game merging the best of two source
projects, rebuilt with a **wallet-based payment system** instead of
blockchain. Deposits and withdrawals go through **admin approval**: users
send money externally (bank transfer / mobile money) and submit a
reference, an admin verifies it and credits/debits the internal wallet
balance stored in PostgreSQL.

This has been tested end-to-end (register → deposit → admin approval →
join table → live number calling → server-validated win → payout) against
a real PostgreSQL instance.

## Stack

- **Backend**: Node.js, Express, Socket.IO, PostgreSQL (`pg`), JWT auth, bcrypt
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL (single source of truth for users, wallets, games, transactions)
- **No blockchain / crypto / smart contracts anywhere in this project.**

## Quick Start (Docker — easiest)

```bash
docker compose up --build
```

This starts:
- PostgreSQL on `localhost:5432`
- Backend API + Socket.IO on `localhost:4000` (migrations run automatically on boot)
- Frontend on `localhost:5173`

Open http://localhost:5173, register an account, then log in as the admin
account (`admin` / `change_this_password` by default — **change this in
production**) to approve deposits.

## Quick Start (manual, without Docker)

### 1. PostgreSQL

Create a database and user (or point `DATABASE_URL` at an existing one):

```sql
CREATE USER bingo WITH PASSWORD 'bingo';
CREATE DATABASE bingo OWNER bingo;
```

### 2. Backend

```bash
cd backend
cp .env.example .env      # edit DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD, etc.
npm install
npm run migrate           # creates tables + the first admin account
npm start                 # listens on PORT (default 4000)
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env      # set VITE_API_URL if backend isn't on localhost:4000
npm install
npm run dev                # http://localhost:5173
```

## How the wallet works (replacing blockchain)

| Old (blockchain) concept | Replaced with |
|---|---|
| Connect MetaMask / Trust Wallet | Username + password login |
| Send BNB to a deposit smart contract | User sends money via bank/mobile-money **outside** the app, then submits a `deposit-request` with the payment reference |
| On-chain confirmation (3 confirmations) | Admin manually reviews the reference in the Admin Panel and clicks **Approve**, which credits `users.balance` |
| Withdraw to wallet address via withdrawal contract | User submits a `withdraw-request` with their bank/mobile-money account details; the amount is **reserved immediately** (deducted from balance) so it can't be double-spent; admin sends the money externally and clicks **Approve**. If **Rejected**, the reserved amount is refunded automatically. |
| Smart contract enforced payout split | Enforced in application code (`PLATFORM_FEE_PERCENT` in `.env`, default 25%) and written to Postgres transactionally |

All balances, stakes, payouts, deposits, and withdrawals live in the
`users.balance` column and the `transactions` audit table in PostgreSQL —
there is no crypto wallet, RPC call, or smart contract anywhere in this
codebase.

## Game flow

1. **Register/Login** → JWT issued.
2. **Deposit** → submit `amount + method + reference` → admin approves → balance credited.
3. **Lobby** → pick a stake table (10/50/100/200) and 1–4 cards → stake deducted immediately.
4. **Countdown** → once 2+ players are seated, a 30s countdown starts (late joiners can still join).
5. **Playing** → server calls a random number every 2.5s over Socket.IO; the frontend auto-marks matching cells.
6. **Claim** → player taps "ቢንጎ!"; the **server** re-checks that player's actual card against the numbers it called (never trusts the client) for row / column / diagonal / four-corners / X-shape / full-house.
7. **Payout** → winner gets 75% of the pot, platform keeps 25% (configurable), both written to Postgres inside a transaction.
8. If all 75 numbers are called with no winner, the round is cancelled and every stake is automatically refunded.

## Admin panel

Log in with an admin account (`is_admin = true` in the `users` table) and
visit `/admin` in the frontend to:
- Approve/reject pending deposit and withdrawal requests
- View all players, ban/unban
- Force-finish a stuck game (cancels + refunds all stakes on that table)
- See a financial summary: total deposits, total withdrawals, platform fees earned, games played

## Project layout

```
merged-bingo/
├── backend/
│   ├── src/
│   │   ├── routes/         (auth, wallet, games, admin)
│   │   ├── game/           (bingoLogic.js = card gen + win checking, gameManager.js = live game state + Socket.IO)
│   │   ├── middleware/     (JWT auth, admin guard)
│   │   ├── migrations/001_init.sql
│   │   ├── db.js, migrate.js, index.js
│   ├── package.json / Dockerfile / .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/          (Login, Register, Lobby, GameRoom, Wallet, Admin)
│   │   ├── components/     (BingoCard)
│   │   ├── context/        (AuthContext)
│   │   ├── api.ts, socket.ts, App.tsx, main.tsx
│   ├── package.json / Dockerfile / .env.example
├── docker-compose.yml
└── README.md
```

## Notes / next steps for production

- Change `JWT_SECRET`, `ADMIN_PASSWORD`, and Postgres credentials before deploying.
- Add HTTPS (reverse proxy e.g. Nginx/Caddy) in front of both services.
- The active-game state currently lives in memory in the Node process; if you scale to multiple backend instances you'll need to move that to Redis or pin each stake table to one instance.
- Add rate limiting (e.g. `express-rate-limit`) on auth and wallet endpoints before going live.
- Consider adding SMS/email notification when a deposit/withdrawal is approved.
