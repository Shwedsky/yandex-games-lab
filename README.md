# Yandex Games Lab

Publisher-first monorepo for fast, measurable HTML5 games targeting Yandex Games.

## Portfolio

1. **Мутанты: Геномный синтез / Mutants: Genome Merge** (`apps/mutants-merge`) — functionally accepted first market probe. Publication is currently blocked externally because the owner cannot complete the required RYА/Yandex Games onboarding. Resume from the accepted `final-v4` package and Yandex Console debug when onboarding becomes available again.
2. **Перекуп: с гаража до империи / Reseller: Garage to Empire** (`apps/reseller-empire`) — active second market probe. V2 rebalance and progression pass is implemented and browser-CI green; the next gate is the human balance/UX pass.

## Operating rule

Ship small, measure quickly, kill weak games, scale winners. Shared platform code lives under `packages/`.

## Technical direction

- TypeScript + Vite
- Phaser only where physics materially helps; Reseller is DOM/TypeScript-first
- Direct Yandex Games SDK adapter
- Local persistence for MVP, with cloud abstraction available later
- RU/EN localization
- No external backend for MVP unless a product requirement proves it necessary

## Repository status

Active production setup. Mutants is frozen at accepted release-candidate state until the external Yandex/RYА blocker clears; Reseller is the active development target.
