# Yandex Release Checklist

## External publication blocker
As of the latest owner check, required RYА/Yandex Games onboarding is unavailable and no alternative Console route is offered. Do not rebuild accepted games because of this blocker. Keep release artifacts ready and resume at Yandex Console / SDK debug when onboarding returns.

## Per-game release gate
- production build succeeds
- browser smoke passes
- human balance/UX pass accepted
- `index.html` at archive root
- Yandex SDK lifecycle wired
- RU/EN metadata prepared
- rewarded/interstitial regressions pass
- icon/cover/screenshots prepared
- Yandex Console draft created when onboarding is available
- debug panel clean
- moderation findings fixed before publish

## Current portfolio
- Mutants: accepted final-v4; waiting on external onboarding
- Reseller: V2 code + browser smoke green; **human balance/UX pass is next**, then promo media/submission kit
