# Reseller Empire — Playable V0 / V2

## Product goal
Ship an original, mobile-first Yandex Games market probe built around a satisfying trading loop rather than a content-heavy 3D game.

Working title: **Перекуп: с гаража до империи** / **Reseller: Garage to Empire**.

## Core loop
1. Start each day with cash and a fresh market feed.
2. Inspect item cards: category, condition, seller ask, estimated resale range and daily demand trend.
3. Buy or negotiate. Negotiation never auto-purchases: every deal requires explicit confirmation.
4. Optional one-time preparation (`0/1 -> 1/1`) improves the item at a cost.
5. List owned inventory for sale.
6. Buyers arrive with procedural offers and personalities.
7. Accept, counter or reject.
8. Profit increases cash and reputation.
9. Upgrade the business manually when reputation and cash requirements are both met.
10. End day, refresh market and demand trend, repeat.

## V2 progression
Business progression is explicit and manual rather than hidden automatic promotion.

### Garage
- 4 inventory slots
- estimate accuracy: ±28%
- basic item pool, deliberately lower starting values
- next: Kiosk at **14 reputation + 12,000 virtual RUB**

### Kiosk
- 7 inventory slots
- estimate accuracy: ±16%
- electronics and higher market values become available
- next: Shop at **45 reputation + 60,000 virtual RUB**

### Shop
- 10 inventory slots
- estimate accuracy: ±8%
- premium/collectible market pool

The current and next-stage benefits plus both requirements are always visible in the main UI.

## V2 early-economy guardrails
- fresh save key (`yg-reseller-v2`) so the previous test economy does not contaminate balancing
- Garage market values are scaled down
- seller discounts are bounded
- seller negotiation is limited to two rounds
- preparation can happen only once per item
- preparation no longer compounds item value indefinitely
- profitable deals award bounded reputation
- day-to-day base values grow slowly instead of jumping immediately
- every day has one hot category (+15% resale demand) and one cold category (-8%) to vary decisions

## Content scope
- 5 categories: household, bicycles, phones, electronics, collectibles.
- procedural item templates assembled from category + condition + rarity + defect modifiers.
- seller and buyer negotiation.
- garage inventory limit creates meaningful keep/sell decisions.
- local save and RU/EN.

## Rewarded ad placements
All rewarded placements are optional and occur at natural decision points:
- reveal exact fair-value estimate for one item,
- refresh market once,
- attract an instant buyer for one listing.

Interstitials are allowed only between completed in-game days, subject to Yandex platform behavior.

## UX target
- Portrait-first; desktop remains fully usable.
- Primarily cards, large tap targets and short sessions.
- One screen should always answer: cash, inventory, current deal, expected margin, current business stage and next unlock.
- No external links, real marketplaces, brands or third-party payment UI.
- Game explicitly uses the normal system cursor and does not request pointer lock.

## Automated regression gate
Browser CI covers:
- fresh Garage start,
- normal cursor,
- daily trend visible,
- negotiate -> discount -> explicit purchase confirmation,
- no auto-purchase from -5%/-10% offers,
- preparation 0/1 -> 1/1 and cannot repeat,
- list -> buyer -> sale,
- bounded first-deal profit,
- rewarded market refresh,
- manual Garage -> Kiosk upgrade after both requirements,
- day transition,
- persistence after reload.

## Delivery gates
1. Human V2 balance/UX pass.
2. Rewarded/ad regression pass.
3. RU/EN + Yandex lifecycle pass.
4. Promo media + submission kit.
5. Keep Draft until Yandex Console / RYА onboarding becomes available and debug panel is clean.
