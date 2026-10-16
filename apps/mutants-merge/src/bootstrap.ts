import { yandexBridge } from '@yg-lab/yandex-bridge';

await yandexBridge.init();
(globalThis as any).__YG_LANG__ = yandexBridge.getLanguage(navigator.language || 'en');

await import('./main');
