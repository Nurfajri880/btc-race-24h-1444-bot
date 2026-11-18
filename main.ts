// Dip-buy bot for make.fun btc-race-24h-20261118-1444 ("Race a BTC trading bot live
// for 24 hours"). It trades CBBTC (Coinbase Wrapped BTC) against USDC, minute by
// minute, long only, one full-size position at a time, no leverage, no shorts.
//
// Strategy (dip-buy, integer arithmetic only, no look-ahead):
//   - Flat, and at least N closes are known: buy the whole cash balance when the
//     latest close has fallen D bps below the highest close of the previous N
//     minutes (the reference high excludes the current bar).
//   - Long: sell the whole position when the latest close rises T bps above the
//     entry fill price (take-profit) or falls S bps below it (stop-loss).
//   - Nothing else. Every decision uses only closes already delivered.
//
// Parameters (tuned on this competition's dev window with the official grader):
//   N = 180 bars (3 hours), D = 200 bps (2.0%), T = 175 bps (1.75%),
//   S = 100 bps (1.0%). Dev result: net PnL +$16.05 USDC, 1 round trip,
//   win rate 100%, max drawdown $6.50. The parameters sit in the middle of a
//   broad positive plateau (N 60-240, D 200 bps, T 150-200 bps, S 50-300 bps
//   all profit on the dev window), not on a single spike.
//
// Deterministic: no clock, no environment, no randomness; every decision is a
// pure function of the closes and fills delivered so far, in integer math.

import { runBars, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

// Lookback for the reference high, in bars (minutes).
const N = 180;
// Dip below the reference high that triggers a buy, in basis points.
const DIP_BPS = 200n;
// Take-profit above the entry fill price, in basis points.
const TAKE_PROFIT_BPS = 175n;
// Stop-loss below the entry fill price, in basis points.
const STOP_LOSS_BPS = 100n;
// Slippage cap on every order, in basis points (5%): far above any normal
// one-minute move, so it never rejects a fill, but it bounds a gap fill.
const MAX_SLIPPAGE_BPS = 500;

const BPS = 10_000n;

// Every CBBTC close delivered so far, oldest first, as raw price integers.
const closes: bigint[] = [];
// The fill price of the open position (0 while flat).
let entryPrice = 0n;

await runBars({
  onBatch(state, batch) {
    // Fold this batch's fills in first: a filled buy sets the entry price,
    // a filled sell clears it. Rejected fills change nothing.
    for (const fill of batch.fills) {
      if (fill.status !== 'filled' || fill.symbol !== SYMBOL) continue;
      if (fill.side === 'buy') entryPrice = BigInt(fill.price);
      else if (fill.side === 'sell') entryPrice = 0n;
    }

    // Warm-up batches cannot trade; wait for the scored window.
    if (state.warmingUp) return [];

    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    const close = BigInt(bar.c);
    closes.push(close);

    const held = state.positions.get(SYMBOL);
    const longQty = held === undefined ? 0n : held.qty;

    // Long: take-profit or stop-loss against the entry fill price.
    if (longQty > 0n && entryPrice > 0n) {
      const takeProfitAt = (entryPrice * (BPS + TAKE_PROFIT_BPS)) / BPS;
      const stopLossAt = (entryPrice * (BPS - STOP_LOSS_BPS)) / BPS;
      if (close >= takeProfitAt || close <= stopLossAt) {
        const sell: SellInput = {
          side: 'sell',
          symbol: SYMBOL,
          qty: longQty,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        };
        return [sell];
      }
      return [];
    }

    // Flat: buy the whole cash balance on a D-bps dip from the N-bar high.
    // The reference high is the highest of the N closes before this bar.
    // Defensive: never buy while a position is already held. The long branch
    // above normally manages a held position, but if its entry price was never
    // recorded the position would fall through here; buying on top of it would
    // break the one-position invariant, so hold instead and wait for the
    // position to clear (or for the final flatten).
    if (longQty > 0n) return [];
    if (closes.length < N + 1) return [];
    let refHigh = 0n;
    for (let i = closes.length - N - 1; i < closes.length - 1; i++) {
      if (closes[i]! > refHigh) refHigh = closes[i]!;
    }
    // Buy when close < refHigh * (10000 - DIP) / 10000, in integers.
    if (close * BPS >= refHigh * (BPS - DIP_BPS)) return [];
    const room = state.weightRoom(SYMBOL);
    const notional = state.cash < room ? state.cash : room;
    if (notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    const buy: BuyInput = {
      side: 'buy',
      symbol: SYMBOL,
      notional_quote_units: notional,
      max_slippage_bps: MAX_SLIPPAGE_BPS,
    };
    return [buy];
  },
});
