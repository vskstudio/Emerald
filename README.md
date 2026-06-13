<p align="center">
  <img src="icons/logo.png" alt="Emerald" width="140">
</p>

<h1 align="center">Emerald</h1>

<p align="center">
  <b>A blackjack basic-strategy overlay for the browser.</b><br>
  Real-time Hit / Stand / Double / Split guidance with live probabilities.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-2e9e4f" alt="Manifest V3">
  <img src="https://img.shields.io/badge/license-MIT-4ade80" alt="MIT License">
</p>

---

## Overview

Emerald is a lightweight Chrome (Manifest V3) extension that displays a draggable, on-screen overlay while you play blackjack. For any combination of your hand and the dealer's up-card, it shows the mathematically optimal basic-strategy decision and the underlying win, push, and bust probabilities — so you can see not just *what* to do, but *why*.

The strategy engine is a faithful implementation of a standard basic-strategy chart, covering hard totals, soft totals, and pairs.

## Features

- **Floating, draggable overlay** that sits on top of any online blackjack table. It loads automatically on duel.com and can be toggled from the toolbar icon anywhere else.
- **Instant recommendations** derived from the built-in basic-strategy chart (hard totals, soft totals, and pairs).
- **Fast manual entry** — one click to set the dealer's up-card, one click per card in your hand.
- **Live probabilities** computed with an infinite-deck model:
  - Probability the dealer busts
  - Probability of winning or pushing if you stand
  - Probability of busting if you hit
- **Automatic blackjack and bust detection.**
- **Emerald dark theme** with chart-matching color codes: green (Hit), blue (Double), red (Stand), gray (Split).

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/vskstudio/Emerald.git
   ```
2. Open `chrome://extensions` in Chrome, Edge, or Brave.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `Emerald` directory.

## Usage

1. Open your online blackjack table.
2. Click the **Emerald** toolbar icon to reveal the overlay (it appears automatically on duel.com).
3. Select the dealer's **up-card**.
4. Add your cards — the recommendation and probabilities update instantly with each click.
5. Use **New deal** to reset between hands.

## Strategy reference

The decision logic is implemented in [`src/strategy.js`](src/strategy.js) and recommends one of four actions, color-coded in the overlay:

| Action | Color  |
| :----- | :----- |
| Hit    | 🟩 Green |
| Double | 🟦 Blue  |
| Stand  | 🟥 Red   |
| Split  | ⬜ Gray  |

## Project structure

| Path                | Purpose                                              |
| :------------------ | :--------------------------------------------------- |
| `manifest.json`     | Extension manifest (Manifest V3)                     |
| `src/strategy.js`   | Basic-strategy chart and probability calculations    |
| `src/content.js`    | Overlay UI and interaction logic                     |
| `src/background.js` | Service worker handling toolbar-triggered injection  |
| `src/overlay.css`   | Overlay styling                                      |
| `icons/`            | Extension and overlay icons                          |

## Disclaimer

Emerald is provided for educational purposes only. Basic strategy reduces the house edge but **does not guarantee winnings**. Please gamble responsibly.

## License

Released under the [MIT License](LICENSE).

---

<p align="center">Made with 💚 by <a href="https://github.com/vskstudio">VSK Studio</a></p>
