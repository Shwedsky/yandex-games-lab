# Mutants — Yandex moderation checklist

## Build

- [ ] Latest CI is green.
- [ ] Upload archive has exactly one `index.html` in root.
- [ ] Unpacked size < 100 MB.
- [ ] File/folder names contain no spaces or Cyrillic characters.
- [ ] Current game title is `Мутанты: Геномный синтез` / `Mutants: Genome Merge`.

## SDK / lifecycle

- [ ] SDK loader is current and debug panel shows `IT`.
- [ ] Game Ready becomes green after the game is interactive.
- [ ] GameplayAPI start/stop follows active gameplay, overlays, ads and hidden tab state.
- [ ] RU/EN changes through `ysdk.environment.i18n.lang` / SDK mocks.

## Ads

- [ ] Rewarded: Remove Top works.
- [ ] Rewarded: Upgrade Next works.
- [ ] Rewarded: Save Run works and resumes gameplay.
- [ ] Rewarded: DNA x2 works and starts a clean new run.
- [ ] Fullscreen ad is requested only at normal restart between runs.
- [ ] No reward is granted before `onRewarded`.
- [ ] Ad failure/timeout never leaves the game blocked.

## UX / browser

- [ ] Mouse input works on desktop.
- [ ] Touch input works on Android.
- [ ] Portrait orientation behaves correctly.
- [ ] Right-click browser context menu is suppressed in game area.
- [ ] Long-press callout/context menu is suppressed on mobile.
- [ ] Game remains playable after returning from background/tab switch.
- [ ] No third-party login is required.
- [ ] No external links or third-party payment UI.

## Progression

- [ ] Local save survives page reload.
- [ ] DNA/research DNA are not duplicated by reload.
- [ ] Genome unlock thresholds display correctly.
- [ ] Background purchase reduces wallet DNA, not lifetime research DNA.

## Draft fields

- [ ] Version: 0.1.0.0.
- [ ] Platforms: Desktop + Android mobile.
- [ ] Orientation: Portrait.
- [ ] Languages: Russian + English.
- [ ] Age: 6+.
- [ ] Categories: Puzzles + Casual.
- [ ] Cloud Saves: OFF.
- [ ] Delayed publication: ON for first release.
- [ ] Delayed-publication reason entered if Console requests it.
- [ ] RU/EN metadata copied from `METADATA.md`.
- [ ] Developer moderation comment copied from `METADATA.md`.

## Media

- [ ] 512×512 PNG icon.
- [ ] Maskable icon checked for center safe zone (optional but recommended).
- [ ] 800×470 PNG cover.
- [ ] 1560×520 storefront cover (optional but recommended).
- [ ] At least two 9:16 mobile screenshots, long side 1280–2560 px.
- [ ] At least two 16:9 desktop screenshots if Desktop is selected.
- [ ] Screenshots are actual gameplay and contain no OS/Yandex UI.
- [ ] Icon/cover are promo art, not raw gameplay screenshots.
- [ ] Horizontal and vertical gameplay MP4 can be uploaded as optional promotion materials.

## Human owner gate

- [ ] Draft opens through Yandex Games on desktop.
- [ ] Draft opens through Yandex Games on Android.
- [ ] One complete run played through to game over.
- [ ] Save Run and DNA x2 verified with Yandex SDK mocks.
- [ ] No red debug-panel errors remain.
