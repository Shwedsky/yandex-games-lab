# Mutants playable v0

## Purpose

Validate that the repository contains an actual playable merge loop before any art/content expansion.

## Implemented vertical slice

- portrait 540x960 chamber;
- Matter gravity and physical collision;
- tap-to-drop input;
- identical-tier collision merge;
- 11 merge tiers;
- escalating score and light coin progression;
- discovered-form persistence in localStorage;
- best-score persistence;
- overflow grace period before game over;
- run restart boundary wired to Yandex interstitial adapter;
- RU/EN copy selected from browser locale;
- Yandex SDK initialization with a safe local fallback.

## Not yet production-ready

- final creature art and animation;
- audio/haptics;
- collection screen;
- rewarded buttons;
- cloud player save;
- analytics events and funnel dashboard;
- balancing based on real device sessions;
- Yandex console upload and moderation assets.

## Gate for v0.2

Before adding content, verify in a browser/device build that:

1. circles settle without tunnelling through chamber boundaries;
2. every equal-tier collision merges exactly once;
3. dense collision chains do not duplicate or delete unrelated bodies;
4. overflow triggers only when the settled stack genuinely reaches the line;
5. refresh restores best score and discovered tiers;
6. restart behaves correctly with SDK unavailable and with the Yandex SDK present.
