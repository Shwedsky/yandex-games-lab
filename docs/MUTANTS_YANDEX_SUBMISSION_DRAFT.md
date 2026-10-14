# Mutants — Yandex Games submission draft

## Product identity

**RU title:** Мутанты: открой финальную форму

**EN title:** Mutants: Unlock the Final Form

**Format:** portrait HTML5 casual merge / puzzle

**Primary devices:** mobile + desktop browser

**Languages:** Russian and English. Runtime language is selected from Yandex Games SDK `environment.i18n.lang`; unsupported languages fall back to English.

## Short description — RU

Сбрасывай живые формы в лабораторную камеру, соединяй одинаковых мутантов и открывай всё более редкие стадии эволюции. Не дай камере переполниться и доберись до формы «Омега».

## Short description — EN

Drop lifeforms into the lab chamber, merge matching mutants and discover increasingly rare evolutionary stages. Keep the chamber from overflowing and reach the Omega form.

## How to play — RU

Нажмите или коснитесь свободного места внутри камеры, чтобы сбросить следующего мутанта. Два одинаковых мутанта при столкновении объединяются в форму следующего уровня. Следите за красной линией: если неподвижные существа слишком долго находятся выше неё, забег закончится. Кнопка «Коллекция» показывает уже открытые формы. Добровольная rewarded-реклама может убрать верхнего мутанта, улучшить следующий сброс, спасти один забег или удвоить итоговую награду.

## How to play — EN

Click or tap inside the chamber to drop the next mutant. Two matching mutants merge on contact into the next evolutionary tier. Watch the red danger line: if settled creatures remain above it for too long, the run ends. The Collection button shows discovered forms. Optional rewarded ads can remove the highest creature, upgrade the next drop, save one run, or double the final reward.

## Monetization

- Rewarded video: explicit voluntary actions only.
- Fullscreen interstitial: only after the player chooses to start a new run after a completed run.
- No third-party ad implementation.
- Rewards are granted only after Yandex SDK confirms `onRewarded`.

## Platform integration

- `/sdk.js` loaded before SDK initialization.
- `LoadingAPI.ready()` is called after the playable scene is ready.
- Gameplay lifecycle uses `GameplayAPI.start()` / `stop()`.
- Language is taken from SDK environment with browser language only as local-development fallback.
- No third-party login.
- Local save survives page reload; no backend required for MVP.

## Pre-submission human gate

Must be verified on a normal browser and preferably one real phone before changing PR #1 from Draft:

1. 3–5 minute run has no freeze or broken collision chain.
2. Drop position feels predictable.
3. Equal forms merge consistently.
4. Danger warning gives enough time to understand why the run is ending.
5. Collection opens/closes without accidental drops.
6. Local mock rewarded actions work in the test kit.
7. Layout is readable in portrait phone orientation and desktop browser.
8. Reload preserves record, coins and discovered forms.

## Post-test work before moderation

Only fixes supported by the human test, final icon/screenshots, Console metadata entry, and a final Yandex debug-loader check should remain.
