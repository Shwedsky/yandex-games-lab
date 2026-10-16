# Mutants localization contract

The game ships two actual UI/content localizations: **Russian (`ru`)** and **English (`en`)**.

At bootstrap the Yandex Games SDK is initialized first, then `ysdk.environment.i18n.lang` is read before Phaser is created.

Fallback for platform languages not shipped by the game follows the Yandex documented reserve set:

- `ru`, `be`, `kk`, `uk`, `uz` -> Russian game localization;
- all other Yandex platform languages -> English game localization.

In Yandex Console declare only Russian and English as supported game languages. Do not declare languages without a full in-game translation.
