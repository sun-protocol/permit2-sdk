import { TronWeb } from 'tronweb';
import { Hex } from 'viem';
import { Address } from './address';
import {
  Allowance,
  PermitSingle,
  PermitSingleWithSignature,
  PermitBatchWithSignature,
  PermitParams,
  PermitDetails,
  PermitBatch,
} from './types';
import { ALLOWANCE_SELECTOR } from './selectors';
import { getAllowanceParameters } from './parameters';
import { toBase58, toEvmHex } from './utils';

const CHAIN_ID_MAINNET = 728126428;
const CHAIN_ID_TESTNET = 3448148188;

export const PERMIT_TYPES = {
  PermitDetails: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint160' },
    { name: 'expiration', type: 'uint48' },
    { name: 'nonce', type: 'uint48' },
  ],
  PermitSingle: [
    { name: 'details', type: 'PermitDetails' },
    { name: 'spender', type: 'address' },
    { name: 'sigDeadline', type: 'uint256' },
  ],
};

export const PERMIT_BATCH_TYPES = {
  PermitDetails: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint160' },
    { name: 'expiration', type: 'uint48' },
    { name: 'nonce', type: 'uint48' },
  ],
  PermitBatch: [
    { name: 'details', type: 'PermitDetails[]' },
    { name: 'spender', type: 'address' },
    { name: 'sigDeadline', type: 'uint256' },
  ],
};

export class AllowanceTransfer {
  private tronWeb: TronWeb;
  private permit2Address: string;
  private isTestnet: boolean;

  constructor(tronWeb: TronWeb, permit2Address: string, isTestnet: boolean) {
    this.tronWeb = tronWeb;
    this.permit2Address = permit2Address;
    this.isTestnet = isTestnet;
  }

  public async generatePermitSignData(
    params: PermitParams,
    spender: string,
    sigDeadline: string
  ): Promise<{
    domain: {
      name: string;
      chainId: number;
      verifyingContract: `0x${string}`;
    };
    permitSingle: PermitSingle;
  }> {
    const { owner, token, amount, deadline } = params;

    const ownerAddress = new Address(owner);
    const tokenAddress = new Address(token);
    const spenderAddress = new Address(spender);

    const allowance = await this.allowance(
      ownerAddress.base58,
      tokenAddress.base58,
      spenderAddress.base58
    );

    if (!allowance) {
      throw new Error('No allowance found');
    }

    const { nonce } = allowance;

    const domain = {
      name: 'Permit2',
      chainId: this.isTestnet ? CHAIN_ID_TESTNET : CHAIN_ID_MAINNET,
      verifyingContract: toEvmHex(this.permit2Address),
    };

    const permitSingle: PermitSingle = {
      details: {
        token: tokenAddress.hex,
        amount: amount.toString(),
        expiration: deadline,
        nonce: nonce.toString(),
      },
      spender: spenderAddress.hex,
      sigDeadline: sigDeadline,
    };

    return { domain, permitSingle };
  }

  public async generatePermitBatchSignData(
    paramsList: PermitParams[],
    spender: string,
    sigDeadline: string
  ): Promise<{
    domain: {
      name: string;
      chainId: number;
      verifyingContract: `0x${string}`;
    };
    permitBatch: PermitBatch;
  }> {
    const details: PermitDetails[] = [];

    const spenderAddress = new Address(spender);

    for (const params of paramsList) {
      const { owner, token, amount, deadline } = params;
      const tokenAddress = new Address(token);
      const ownerAddress = new Address(owner);

      const allowance = await this.allowance(
        ownerAddress.base58,
        tokenAddress.base58,
        spenderAddress.base58
      );

      if (!allowance) {
        throw new Error('No allowance found');
      }

      const { nonce } = allowance;

      details.push({
        token: tokenAddress.hex,
        amount: amount.toString(),
        expiration: deadline,
        nonce: nonce.toString(),
      });
    }

    const permitBatch: PermitBatch = {
      details: details,
      spender: spenderAddress.hex,
      sigDeadline: sigDeadline,
    };

    const domain = {
      name: 'Permit2',
      chainId: this.isTestnet ? CHAIN_ID_TESTNET : CHAIN_ID_MAINNET,
      verifyingContract: toEvmHex(this.permit2Address),
    };

    return { domain, permitBatch };
  }

  public async generatePermitSignature(
    params: PermitParams,
    spender: string,
    sigDeadline: string
  ): Promise<PermitSingleWithSignature> {
    const { domain, permitSingle } = await this.generatePermitSignData(
      params,
      spender,
      sigDeadline
    );

    const signature = (await this.tronWeb.trx._signTypedData(
      domain,
      PERMIT_TYPES,
      permitSingle
    )) as Hex;

    return { signature, ...permitSingle } as PermitSingleWithSignature;
  }

  public async generatePermitBatchSignature(
    paramsList: PermitParams[],
    spender: string,
    sigDeadline: string
  ): Promise<PermitBatchWithSignature> {
    const { domain, permitBatch } = await this.generatePermitBatchSignData(
      paramsList,
      spender,
      sigDeadline
    );

    const signature = (await this.tronWeb.trx._signTypedData(
      domain,
      PERMIT_BATCH_TYPES,
      permitBatch
    )) as Hex;

    return { signature, ...permitBatch } as PermitBatchWithSignature;
  }

  public async allowance(
    userAddress: string,
    tokenAddress: string,
    spenderAddress: string
  ): Promise<Allowance> {
    try {
      if (!userAddress.startsWith('0x')) {
        userAddress = toEvmHex(userAddress);
      }
      if (!tokenAddress.startsWith('0x')) {
        tokenAddress = toEvmHex(tokenAddress);
      }
      if (!spenderAddress.startsWith('0x')) {
        spenderAddress = toEvmHex(spenderAddress);
      }

      const result =
        await this.tronWeb.transactionBuilder.triggerConstantContract(
          this.permit2Address,
          ALLOWANCE_SELECTOR,
          {},
          getAllowanceParameters(
            userAddress as Hex,
            tokenAddress as Hex,
            spenderAddress as Hex
          )
        );

      if (
        result.result &&
        result.constant_result &&
        result.constant_result.length > 0
      ) {
        const hexResult = result.constant_result[0];
        const hexData = hexResult.startsWith('0x')
          ? hexResult.slice(2)
          : hexResult;

        // Each value is 32 bytes (64 hex chars)
        const amountHex = '0x' + hexData.slice(0, 64);
        const expirationHex = '0x' + hexData.slice(64, 128);
        const nonceHex = '0x' + hexData.slice(128, 192);

        // hex to bigint
        const amount = BigInt(amountHex);
        const expiration = BigInt(expirationHex);
        const nonce = BigInt(nonceHex);

        return { amount, expiration, nonce } as Allowance;
      } else {
        throw new Error('No allowance found');
      }
    } catch (error) {
      throw new Error('Error getting allowance:' + error);
    }
  }
}
