# btc-race-24h-1444-bot

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/Nurfajri880/btc-race-24h-1444-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/Nurfajri880/btc-race-24h-1444-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A dip-buy BTC trading bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty. It trades Coinbase Wrapped BTC (CBBTC) against USDC, minute by minute, long only, one full-size position at a time: it buys the whole cash balance when the latest close has fallen 2.0% below the highest close of the previous 3 hours, and sells the whole position when the close rises 1.75% above the entry (take-profit) or falls 1.0% below it (stop-loss). Integer arithmetic only, no look-ahead, fully deterministic.

Dev result (official local grader, this kit's dev window): **net PnL +$16.05 USDC**, 2 trades, win rate 100%, max drawdown 0.64%, guardrails met.

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=byetntnj&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
