# @sun-protocol/permit2-sdk

TypeScript SDK for [Permit2](https://github.com/Uniswap/permit2) allowance transfers on the TRON network.

Permit2 enables token approvals to be shared and managed across different applications, using off-chain EIP-712 signatures to grant time-limited, scoped allowances.

## Installation

```bash
npm install @sun-protocol/permit2-sdk
```

## Quick Start

```typescript
import { TronWeb } from 'tronweb';
import { AllowanceTransfer } from '@sun-protocol/permit2-sdk';

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  privateKey: '<YOUR_PRIVATE_KEY>',
});

const PERMIT2_ADDRESS = 'T...'; // Permit2 contract address on TRON
const isTestnet = false;

const transfer = new AllowanceTransfer(tronWeb, PERMIT2_ADDRESS, isTestnet);
```

### Query Allowance

```typescript
const allowance = await transfer.allowance(
  'TOwnerAddress...',
  'TTokenAddress...',
  'TSpenderAddress...'
);

console.log(allowance.amount);     // bigint
console.log(allowance.expiration); // bigint
console.log(allowance.nonce);      // bigint
```

### Generate Permit Signature (Single Token)

```typescript
const permitWithSig = await transfer.generatePermitSignature(
  {
    owner: 'TOwnerAddress...',
    token: 'TTokenAddress...',
    amount: 1000000n,                // token amount (uint160)
    deadline: '1735689600',          // allowance expiration (unix timestamp)
  },
  'TSpenderAddress...',             // spender
  '1735689600'                      // signature deadline (unix timestamp)
);

console.log(permitWithSig.signature); // 0x...
console.log(permitWithSig.details);   // { token, amount, expiration, nonce }
```

### Generate Permit Signature (Batch)

```typescript
const batchPermitWithSig = await transfer.generatePermitBatchSignature(
  [
    {
      owner: 'TOwnerAddress...',
      token: 'TTokenA...',
      amount: 1000000n,
      deadline: '1735689600',
    },
    {
      owner: 'TOwnerAddress...',
      token: 'TTokenB...',
      amount: 2000000n,
      deadline: '1735689600',
    },
  ],
  'TSpenderAddress...',
  '1735689600'
);

console.log(batchPermitWithSig.signature); // 0x...
console.log(batchPermitWithSig.details);   // PermitDetails[]
```

### Generate Sign Data Without Signing

If you need to handle signing externally (e.g. hardware wallet, frontend wallet), use the sign data methods:

```typescript
// Single
const { domain, permitSingle } = await transfer.generatePermitSignData(
  params, spender, sigDeadline
);

// Batch
const { domain, permitBatch } = await transfer.generatePermitBatchSignData(
  paramsList, spender, sigDeadline
);
```

These return the EIP-712 domain and message for you to sign with your own signer.

## API Reference

### `AllowanceTransfer`

#### Constructor

```typescript
new AllowanceTransfer(tronWeb: TronWeb, permit2Address: string, isTestnet: boolean)
```

| Parameter | Type | Description |
| --- | --- | --- |
| `tronWeb` | `TronWeb` | TronWeb instance with signer configured |
| `permit2Address` | `string` | Permit2 contract address (Base58 or hex) |
| `isTestnet` | `boolean` | `true` for Nile testnet, `false` for mainnet |

#### Methods

| Method | Returns | Description |
| --- | --- | --- |
| `allowance(owner, token, spender)` | `Promise<Allowance>` | Query on-chain allowance state |
| `generatePermitSignData(params, spender, sigDeadline)` | `Promise<{ domain, permitSingle }>` | Build EIP-712 typed data for single permit |
| `generatePermitBatchSignData(paramsList, spender, sigDeadline)` | `Promise<{ domain, permitBatch }>` | Build EIP-712 typed data for batch permit |
| `generatePermitSignature(params, spender, sigDeadline)` | `Promise<PermitSingleWithSignature>` | Sign a single token permit |
| `generatePermitBatchSignature(paramsList, spender, sigDeadline)` | `Promise<PermitBatchWithSignature>` | Sign a batch token permit |

### Types

```typescript
interface PermitParams {
  owner: string;    // Owner address (Base58 or 0x hex)
  token: string;    // Token address (Base58 or 0x hex)
  amount: bigint;   // Approval amount (uint160)
  deadline: string; // Allowance expiration (unix timestamp)
}

interface Allowance {
  amount: bigint;
  expiration: bigint;
  nonce: bigint;
}

interface PermitSingleWithSignature {
  details: PermitDetails;
  spender: string;
  sigDeadline: string;
  signature: Hex;
}

interface PermitBatchWithSignature {
  details: PermitDetails[];
  spender: string;
  sigDeadline: string;
  signature: Hex;
}
```

### Utilities

```typescript
import { toEvmHex, toBase58, Address } from '@sun-protocol/permit2-sdk';

// Convert TRON Base58 address to EVM hex
toEvmHex('TJRabPrwbZy45sbavfcjinPJC18kjpRTv8'); // '0x...'

// Convert hex address to TRON Base58
toBase58('0x...');  // 'T...'

// Address helper — auto-detects format
const addr = new Address('TJRabPrwbZy45sbavfcjinPJC18kjpRTv8');
addr.hex;    // '0x...'
addr.base58; // 'TJRab...'
```

## Network Support

| Network | Chain ID |
| --- | --- |
| TRON Mainnet | `728126428` |
| TRON Nile Testnet | `3448148188` |

## Development

```bash
npm install
npm run build      # Compile TypeScript
npm run dev        # Watch mode
npm run lint       # Type check
npm run format     # Prettier
npm test           # Run tests
```

## License

[MIT](LICENSE)
