# Mahjong Point Counter

A mobile-first web app for tracking scores in a 4-player Hong Kong (Cantonese) Mahjong game. One person at the table runs it on their phone during a live game: tap in the faan for each winning hand, and it works out who pays whom, keeps running totals, tracks wind/dealer rotation, and (optionally) converts points to money.

**Use it now: https://ashleykchan.github.io/mahjong-point-counter/**

## Features

- **Customizable payout rules** — editable faan-to-points table, min/max faan, self-draw and deal-in multipliers, and a draw-behavior setting, all saved as reusable rule set presets.
- **Record Hand flow** — tap the winner, how they won (self-drawn or off a discard), who discarded, and the faan via a large stepper, with a full payout preview before confirming.
- **Wind & dealer tracking** — a banner shows the prevailing wind, hand number, dealer, and dealer repeat count; player cards show each seat's wind and highlight the dealer. Rotation follows standard rules (dealer stays on a win, passes on a loss, wind advances after 4 dealers), with a manual "Adjust Wind/Dealer" override if the table gets out of sync.
- **Money per point** — optional; set a dollar value per point and money totals appear everywhere alongside points.
- **Round history** — every hand and adjustment, newest first, with a one-tap undo that also rolls back score, wind, and dealer state.
- **Game summary** — final standings, a minimal "settle up" list of who pays whom, and per-player/game stats (wins, self-draws, deal-ins, biggest hand, times as dealer, etc.) when you end a game.
- Game state and rule sets persist in `localStorage`, so a refresh or backgrounded phone doesn't lose progress.
