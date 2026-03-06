import { Hex } from 'viem'

export const getAllowanceParameters = (userAddress: Hex, tokenAddress: Hex, spenderAddress: Hex) => [
  { type: 'address', value: userAddress },
  { type: 'address', value: tokenAddress },
  { type: 'address', value: spenderAddress },
]
