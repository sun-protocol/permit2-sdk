import { Hex } from 'viem';

export interface PermitDetails {
  token: string;
  amount: string;
  expiration: string;
  nonce: string;
}

export interface PermitSingle {
  details: PermitDetails;
  spender: string;
  sigDeadline: string;
  //   [key: string]: unknown
}

export interface PermitSingleWithSignature extends PermitSingle {
  signature: Hex;
}

export interface PermitBatch {
  details: PermitDetails[];
  spender: string;
  sigDeadline: string;
  //   [key: string]: unknown
}

export interface PermitBatchWithSignature extends PermitBatch {
  signature: Hex;
}

export interface Allowance {
  amount: bigint;
  expiration: bigint;
  nonce: bigint;
}

export interface PermitParams {
  owner: string;
  token: string;
  amount: bigint;
  deadline: string;
}
