# CL-20 Swap UI Simulator

Local UI simulator for the CL-20 Conviction Locker Swap & Lock flow. Inspired by @xbt2027's 2027 and upcoming D17 experiments.

It mirrors the real CL-20 Swap UI without a wallet, private key, RPC, backend, or contract deployment. Every quote, locker, transaction hash, price move, verify check, and unlock is simulated in the browser.

## What It Does

The simulator lets someone try the product loop safely:

1. Choose Sepolia or mainnet simulation mode.
2. Enter an ETH amount.
3. Estimate 2027 output from a Uniswap V2-style pool.
4. Choose the percentage of bought tokens to lock.
5. Pick a target multiple and fallback unlock date.
6. Confirm the simulated swap and lock.
7. Move the simulated price on the locker page.
8. Verify and unlock when the target or fallback date is reached.

The point is simple: explain the CL-20 conviction-locker mechanic before anyone touches a real contract.

## Feature Parity With The Real UI

Included:

- Sepolia and mainnet switch.
- ETH -> 2027 quote.
- 2027/WETH pool settings for each network mode.
- WETH price basis and static USD basis where supported.
- Lock percentage control.
- Target multiple controls.
- Fallback unlock date modal.
- Slippage fields in the swap and verify confirmation modals.
- Browser-local lockers.
- Simulated price movement.
- Verify/unlock flow.
- Locker history.
- Static GitHub Pages deployment.

Not included:

- Wallet connection.
- Env files.
- RPC calls.
- Server API routes.
- Contract deployment.
- Real approvals, swaps, probes, verifies, or withdrawals.

## What Is Real

- The UI is a real Next.js app.
- Lockers are saved in browser `localStorage`.
- Quotes use a Uniswap V2-style constant product formula with a 0.3% fee.
- The app can be exported as a static site.

## What Is Simulated

- Pool reserves are hard-coded in `app/page.tsx`.
- Transaction hashes are fake.
- Locker addresses are fake.
- Price movement is controlled by the user.
- Unlocks only update browser state.

This repo is safe to host because it cannot sign transactions.

## Run Locally

Use Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the localhost URL printed by Next.

## Build

```bash
npm run typecheck
npm run build
```

The simulator is configured as a static export. After build, the static site is written to:

```text
out/
```

## GitHub Pages

This repo includes a Pages workflow:

```text
.github/workflows/pages.yml
```

To publish:

1. Upload the source files to a GitHub repo.
2. Open **Settings -> Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Run the workflow if it does not start automatically.

The workflow is already set up for project pages, so the site should load correctly from your repository's GitHub Pages URL:

```text
https://<github-user>.github.io/<repo-name>/
```

No env file is needed.

## Do Not Upload

```text
node_modules/
.next/
out/
tsconfig.tsbuildinfo
.env
.env.local
.DS_Store
*.log
```

## Limits

- It does not model MEV, gas, nonce issues, approvals, failed transactions, or RPC errors.
- It does not refresh reserves from chain.
- It does not model price impact from selling the locked position.
- It does not prove that a real locker can unlock.
- It is for demos, education, and UX testing.
