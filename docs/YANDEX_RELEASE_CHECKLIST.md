# Yandex Games release checklist

- [ ] SDK initializes without blocking local development fallback.
- [ ] `LoadingAPI.ready()` is called only when the game is actually interactive.
- [ ] Game survives refresh and restores meaningful progress.
- [ ] RU and EN copy verified on mobile viewport.
- [ ] No gameplay input leaks through ad overlays.
- [ ] Reward is granted only after rewarded callback.
- [ ] Interstitial appears only at a natural break.
- [ ] Audio/gameplay pause and resume around ads verified before release.
- [ ] No real-money gambling or real-world reward framing.
- [ ] Production build has `index.html` at ZIP root.
- [ ] Uncompressed build remains within Yandex Games package limits.
- [ ] First-session funnel and core economy events are measurable before promotion.
