# Agent working agreement

## Product objective
Build profitable, lightweight Yandex Games titles with minimum owner involvement.

## Priorities
1. Retention and session quality before visual polish.
2. Mobile-first portrait UX unless the game spec says otherwise.
3. Fast startup and small bundle.
4. Platform-compliant ads only through Yandex Games SDK.
5. Progress must survive refresh.
6. RU and EN localization are mandatory.
7. No unrelated framework churn.

## Delivery discipline
- Work on feature branches.
- Commit after each meaningful checkpoint.
- Keep game-specific code under `apps/<game>`.
- Keep reusable Yandex SDK, persistence and localization code under `packages/`.
- Do not add a backend unless justified in a spec/ADR.
- Each release must produce a ZIP with `index.html` at its root.

## Metrics mindset
Every feature must support at least one of: first-session completion, session length, return rate, rewarded-ad opt-in, progression depth, or rating quality.
