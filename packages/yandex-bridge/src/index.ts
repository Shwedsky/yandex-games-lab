export type RewardedCallbacks = {
  onOpen?: () => void;
  onRewarded: () => void;
  onClose?: () => void;
  onError?: (error: unknown) => void;
};

type YandexSdk = any;

class YandexBridge {
  private sdk: YandexSdk | null = null;
  private initPromise: Promise<void> | null = null;
  private gameplayActive = false;

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const YaGames = (globalThis as any).YaGames;
      if (!YaGames?.init) return;
      try {
        this.sdk = await YaGames.init();
      } catch (error) {
        console.warn('[YandexBridge] SDK init failed; local fallback stays active.', error);
      }
    })();
    return this.initPromise;
  }

  isAvailable(): boolean {
    return Boolean(this.sdk);
  }

  getLanguage(fallback = 'en'): string {
    const language = this.sdk?.environment?.i18n?.lang;
    return typeof language === 'string' && language.length > 0 ? language.toLowerCase() : fallback;
  }

  async gameplayReady(): Promise<void> {
    try {
      await this.sdk?.features?.LoadingAPI?.ready?.();
    } catch (error) {
      console.warn('[YandexBridge] LoadingAPI.ready failed.', error);
    }
  }

  gameplayStart(): void {
    if (this.gameplayActive) return;
    this.gameplayActive = true;
    try {
      this.sdk?.features?.GameplayAPI?.start?.();
    } catch (error) {
      console.warn('[YandexBridge] GameplayAPI.start failed.', error);
    }
  }

  gameplayStop(): void {
    if (!this.gameplayActive) return;
    this.gameplayActive = false;
    try {
      this.sdk?.features?.GameplayAPI?.stop?.();
    } catch (error) {
      console.warn('[YandexBridge] GameplayAPI.stop failed.', error);
    }
  }

  private mockAdsEnabled(): boolean {
    try {
      return new URLSearchParams(globalThis.location?.search ?? '').get('mockAds') === '1';
    } catch {
      return false;
    }
  }

  showInterstitial(): Promise<void> {
    return new Promise((resolve) => {
      if (this.mockAdsEnabled()) {
        globalThis.setTimeout(resolve, 350);
        return;
      }
      if (!this.sdk?.adv?.showFullscreenAdv) return resolve();
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timeoutId);
        resolve();
      };
      const timeoutId = globalThis.setTimeout(finish, 12000);
      try {
        this.sdk.adv.showFullscreenAdv({ callbacks: { onClose: finish, onError: finish } });
      } catch {
        finish();
      }
    });
  }

  showRewarded(callbacks: RewardedCallbacks): void {
    if (this.mockAdsEnabled()) {
      callbacks.onOpen?.();
      globalThis.setTimeout(() => {
        callbacks.onRewarded();
        callbacks.onClose?.();
      }, 350);
      return;
    }
    if (!this.sdk?.adv?.showRewardedVideo) {
      callbacks.onError?.(new Error('Yandex SDK unavailable'));
      return;
    }
    try {
      this.sdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: callbacks.onOpen,
          onRewarded: callbacks.onRewarded,
          onClose: callbacks.onClose,
          onError: callbacks.onError
        }
      });
    } catch (error) {
      callbacks.onError?.(error);
    }
  }

  showRewardedAndWait(timeoutMs = 12000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.mockAdsEnabled()) {
        globalThis.setTimeout(() => resolve(true), 350);
        return;
      }
      if (!this.sdk?.adv?.showRewardedVideo) return resolve(false);
      let rewarded = false;
      let settled = false;
      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timeoutId);
        resolve(value);
      };
      const timeoutId = globalThis.setTimeout(() => finish(false), Math.max(1000, timeoutMs));
      try {
        this.sdk.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => { rewarded = true; },
            onClose: () => finish(rewarded),
            onError: () => finish(false)
          }
        });
      } catch {
        finish(false);
      }
    });
  }
}

export const yandexBridge = new YandexBridge();
