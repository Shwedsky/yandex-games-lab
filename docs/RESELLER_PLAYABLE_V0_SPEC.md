# Reseller Empire — Playable V0

## Product goal
Ship an original, mobile-first Yandex Games market probe built around a satisfying trading loop rather than a content-heavy 3D game.

Working title: **Перекуп: с гаража до империи** / **Reseller: Garage to Empire**.

## Core loop
1. Start each day with a small cash balance and a fresh market feed.
2. Inspect item cards: category, condition, seller ask, estimated resale range and risk.
3. Buy or negotiate.
4. Optional one-time preparation/repair raises sale potential at a cost.
5. List owned inventory for sale.
6. Buyers arrive with procedural offers and personalities.
7. Accept, counter or reject.
8. Profit increases cash, reputation and unlock progress.
9. End day, refresh market, repeat.

## V0 content scope
- 5 categories: household, bicycles, phones, electronics, collectibles.
- 25+ procedural item templates assembled from category + condition + rarity + defect modifiers.
- 4 seller personalities and 4 buyer personalities.
- Negotiation with bounded counteroffers; no real-money gambling or loot boxes.
- Garage inventory limit creates meaningful keep/sell decisions.
- Reputation unlocks better market tiers.
- Three business milestones: garage -> kiosk -> shop.
- Local save and RU/EN.

## Economy
- Starting cash: 5,000 virtual RUB.
- Each item has a hidden fair value derived from base value, condition, rarity and defect state.
- Seller ask is generated around fair value with personality markup/discount.
- Buyer offers are generated around resale value and buyer patience.
- Profit/loss is explicit after each sale.
- Bankruptcy protection: when cash is too low and inventory is empty, grant a small rescue lot instead of hard-locking the run.

## Human test v1 findings / balance v2
The first human pass exposed several problems and they are now product requirements:

- Seller negotiation must **never auto-buy** an item. A successful counteroffer only updates the agreed price; purchase requires explicit confirmation.
- Preparation is **one-time per item**. After preparation the button becomes disabled and reads `Подготовлено` / `Prepped`.
- Opening Garage market is intentionally cheaper and narrower. Kiosk and Shop progressively unlock richer/higher-value inventory.
- Business progression must be visible in the HUD, including remaining reputation and the concrete benefit of the next stage.
- Stage thresholds for the test build: Kiosk at **20 reputation**, Shop at **60 reputation**.
- Kiosk: 7 slots, tighter valuation range, richer market.
- Shop: 10 slots, best valuation range, premium lots.
- Seller floor and resale multipliers are tighter than v1; the first day should not explode into tens of thousands of profit from routine bargaining.
- Prep adds a bounded improvement rather than compounding value indefinitely.
- The game page explicitly uses a normal/default cursor; any OS-wide crosshair following the pointer outside the page is not game state.

## Skill / decision layer
The game must not be a pure idle clicker. The player makes repeated decisions:
- buy vs skip,
- negotiate vs accept,
- repair vs flip immediately,
- hold inventory vs free a slot,
- accept buyer offer vs counter.

Information quality improves with progression. Early game shows wider estimated price ranges; upgrades narrow the estimate.

## Rewarded ad placements
All rewarded placements are optional and occur at natural decision points:
- reveal exact fair-value estimate for one item,
- refresh market once,
- attract an instant buyer for one listing,
- rescue a failed negotiation once.

Interstitials are allowed only between completed in-game days, subject to Yandex platform behavior.

## UX target
- Portrait-first; desktop remains fully usable.
- Primarily cards, large tap targets and short sessions.
- One screen should always answer: cash, inventory, current deal, expected margin, next unlock.
- No external links, real marketplaces, brands or third-party payment UI.

## Technical target
- Reuse the existing Vite/Yandex bridge/publisher infrastructure from Mutants where appropriate.
- Keep the gameplay implementation DOM/TypeScript-first unless Phaser materially improves the interaction.
- Deterministic seeded market generation for browser smoke tests.
- Browser CI must cover: negotiate without auto-buy, explicit purchase confirmation, one-time prep, list, buyer offer, sale, day transition, local save, rewarded mock flow and reload.

## Delivery gates
1. Vertical slice: one complete buy -> sell -> next-day loop.
2. Human balance pass: first 10–15 minutes should produce visible progression without trivializing upgrades.
3. Rewarded/ad regression pass.
4. RU/EN + Yandex lifecycle pass.
5. Promo media + submission kit.
6. Keep Draft until Yandex Console / RYA onboarding becomes available and debug panel is clean.
