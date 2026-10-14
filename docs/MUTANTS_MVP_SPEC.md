# Mutants — MVP specification

## Player promise
"Combine weird lifeforms and discover what they become."

## Session
- Portrait-first.
- One-finger control.
- Immediate play; no tutorial wall.
- First merge target: under 10 seconds.
- First new-form discovery: under 30 seconds.

## Board
- One containment chamber.
- Gravity-driven drops.
- Identical tiers merge on contact.
- Merged result receives a short readable impact/VFX beat.
- Overflow line with grace timer rather than instant unfair loss.

## Launch content
- 11 creature tiers.
- 3 visual families/background lab states.
- Collection screen.
- Best score.
- Coins earned from discoveries and run score.
- Lightweight lab cosmetic progression.

## Required platform integration
- SDK initialization.
- gameplayReady call only after interactive state is actually ready.
- Save after progression-changing actions.
- Pause gameplay/audio around full-screen ads.
- Reward only after rewarded callback confirms it.
- RU/EN strings.

## Explicit non-goals for v1
- Multiplayer.
- Backend.
- Live chat.
- PvP.
- Complex daily-event system.
- Purchases/IAP.
