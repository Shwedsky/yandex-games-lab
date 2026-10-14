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

  async gameplayReady(): Promise<void> {
    try {
      await this.sdk?.features?.LoadingAPI?.ready?.();
    } catch (error) {
      console.warn('[YandexBridge] LoadingAPI.ready failed.', error);
    }
  }

  showInterstitial(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.sdk?.adv?.showFullscreenAdv) return resolve();
      this.sdk.adv.showFullscreenAdv({
        callbacks: {
          onClose: () => resolve(),
          onError: () => resolve()
        }
      });
    });
  }

  showRewarded(callbacks: RewardedCallbacks): void {
    if (!this.sdk?.adv?.showRewardedVideo) {
      callbacks.onError?.(new Error('Yandex SDK unavailable'));
      return;
    }

    this.sdk.adv.showRewardedVideo({
      callbacks: {
        onOpen: callbacks.onOpen,
        onRewarded: callbacks.onRewarded,
        onClose: callbacks.onClose,
        onError: callbacks.onError
      }
    });
  }
}

export const yandexBridge = new YandexBridge();
