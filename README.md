# Yandex Games Lab

Publisher-first monorepo for fast, measurable HTML5 games targeting Yandex Games.

## Portfolio

1. **Mutants: Unlock the Final Form** (`apps/mutants-merge`) — fast market probe.
2. **Reseller: Garage to Empire** (`apps/reseller-empire`) — retention/monetization bet.

## Operating rule

Ship small, measure quickly, kill weak games, scale winners. Shared platform code lives under `packages/`.

## Technical direction

- TypeScript + Vite
- Phaser for the merge game runtime
- Direct Yandex Games SDK adapter
- Cloud/local persistence abstraction
- RU/EN localization from day one
- No external backend for MVP unless a product requirement proves it necessary

## Repository status

Active production setup. `mutants-merge` is the first implementation target; `reseller-empire` remains design-first until channel data arrives.
