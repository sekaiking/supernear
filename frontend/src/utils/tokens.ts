"use client";
import { TokenType, TokenTypeMin } from "@/types";
import _tokens from "@/../public/tokens.min.json";
import Big from "big.js";

export const tokens: TokenTypeMin[] = _tokens as TokenTypeMin[];

export const NearToken: TokenType = {
  address: tokens[0][0],
  symbol: tokens[0][1],
  decimals: tokens[0][2],
};

export const calcDecimals = (amount: string | number, decimals: number) => {
  return Big(amount)
    .mul(Big(10).pow(decimals || 1))
    .toFixed(0);
};
export const uncalcDecimals = (amount: string | number, decimals: number) => {
  return Big(amount)
    .div(Big(10).pow(decimals || 1))
    .toNumber();
};

export function getToken(findToken: string): TokenType | null {
  if (tokens.length) {
    const searchToken = findToken?.toLowerCase();

    const found = tokens.find(
      (v) => v[0] == searchToken || String(v[1]).toLowerCase() == searchToken,
    );

    if (found) {
      return {
        address: found[0],
        symbol: found[1],
        decimals: found[2],
      };
    } else if (
      searchToken?.endsWith(".near") ||
      searchToken?.endsWith(".testnet")
    ) {
      return {
        address: searchToken,
        symbol: searchToken,
      };
    }
  }

  return null;
}
