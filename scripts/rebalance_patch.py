from pathlib import Path
import re

p = Path('apps/mutants-merge/src/game.ts')
s = p.read_text()

if "import { renderBackground } from './backgrounds';" not in s:
    s = s.replace("} from './content';\n", "} from './content';\nimport { renderBackground } from './backgrounds';\nimport { createGenomeCreature } from './visuals';\n")

s = s.replace("const SAVE_KEY = 'yg-lab:mutants:v1';", "const LEGACY_SAVE_KEY = 'yg-lab:mutants:v1';\nconst SAVE_KEY = 'yg-lab:mutants:v2';")

s = s.replace(
    "    this.save = normalizeSave(loadLocalSave<LegacySave>(SAVE_KEY, {}));",
    "    const currentRaw = loadLocalSave<LegacySave>(SAVE_KEY, {});\n"
    "    if (Object.keys(currentRaw).length === 0) {\n"
    "      const legacy = loadLocalSave<LegacySave>(LEGACY_SAVE_KEY, {});\n"
    "      if (Number.isFinite(legacy.bestScore)) currentRaw.bestScore = legacy.bestScore;\n"
    "    }\n"
    "    this.save = normalizeSave(currentRaw);"
)

if "this.installLocalTestHooks();" not in s:
    s = s.replace("    track('session_start');\n", "    track('session_start');\n    this.installLocalTestHooks();\n", 1)

if "delete (globalThis as any).__MUTANTS_TEST__" not in s:
    s = s.replace(
        "      yandexBridge.gameplayStop();\n    });",
        "      if ((globalThis as any).__MUTANTS_TEST__) delete (globalThis as any).__MUTANTS_TEST__;\n"
        "      yandexBridge.gameplayStop();\n    });",
        1
    )

s = re.sub(
    r"  private applyBackground\(id: BackgroundId\) \{.*?\n  \}\n\n  private drawShell\(\)",
    "  private applyBackground(id: BackgroundId) {\n"
    "    if (!this.backgroundLayer) return;\n"
    "    renderBackground(this, this.backgroundLayer, backgroundById(id));\n"
    "  }\n\n"
    "  private drawShell()",
    s,
    flags=re.S
)

s = s.replace("484, 700, 0x101824, 0.62", "484, 700, 0x101824, 0.28")

marker = "  private async withRewardedAd(reward: () => void, eventName: string) {"
mock_method = '''  private showMockAdOverlay() {
    if (!yandexBridge.isMockMode()) return () => {};
    const shade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x03050a, 0.82).setDepth(115).setInteractive();
    const label = this.add.text(WIDTH / 2, HEIGHT / 2 - 24, locale === 'ru' ? 'ТЕСТОВАЯ РЕКЛАМА' : 'TEST AD', {
      fontFamily: 'Arial Black, Arial', fontSize: '27px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(116);
    const note = this.add.text(WIDTH / 2, HEIGHT / 2 + 24, locale === 'ru' ? 'Имитация rewarded · 1,4 сек' : 'Rewarded simulation · 1.4 sec', {
      fontFamily: 'Arial', fontSize: '18px', color: '#9fdcff'
    }).setOrigin(0.5).setDepth(116);
    return () => { shade.destroy(); label.destroy(); note.destroy(); };
  }

'''
if "private showMockAdOverlay()" not in s:
    s = s.replace(marker, mock_method + marker)

s = s.replace(
    "    track(`${eventName}_offer`);\n    let granted = false;",
    "    track(`${eventName}_offer`);\n    const closeMockOverlay = this.showMockAdOverlay();\n    let granted = false;"
)

if "closeMockOverlay();" not in s:
    s = s.replace(
        "    } finally {\n      this.rewardBusy = false;",
        "    } finally {\n      closeMockOverlay();\n      this.rewardBusy = false;"
    )

s = re.sub(
    r"  private createCreatureGraphic\(tier: number, radius: number\) \{.*?\n  \}\n\n  private syncVisuals\(\)",
    "  private createCreatureGraphic(tier: number, radius: number) {\n"
    "    return createGenomeCreature(this, this.activeGenome.id, tier, radius, this.activeGenome.colors[tier]);\n"
    "  }\n\n"
    "  private syncVisuals()",
    s,
    flags=re.S
)

s = s.replace("      this.grantDna(Math.max(1, nextTier * 2));\n", "")

if "this.grantDna(5 + nextTier * 4);" not in s:
    s = s.replace(
        "        discovered.sort((u, v) => u - v);\n        track(`discover_${this.activeGenome.id}_tier_${nextTier}`);",
        "        discovered.sort((u, v) => u - v);\n"
        "        this.grantDna(5 + nextTier * 4);\n"
        "        track(`discover_${this.activeGenome.id}_tier_${nextTier}`);"
    )

s = s.replace(
    "    return Math.max(25, Math.floor(this.score / 12));",
    "    return Math.max(20, Math.min(220, 20 + Math.floor(Math.sqrt(this.score) * 0.45)));"
)

test_hooks = '''  private installLocalTestHooks() {
    try {
      const params = new URLSearchParams(globalThis.location?.search ?? '');
      const isLocal = globalThis.location?.hostname === '127.0.0.1' || globalThis.location?.hostname === 'localhost';
      if (!isLocal || params.get('ciTest') !== '1') return;
      (globalThis as any).__MUTANTS_TEST__ = {
        forceGameOver: () => this.endRun(),
        state: () => ({
          ended: this.ended,
          rewardBusy: this.rewardBusy,
          dna: this.save.dna,
          researchDna: this.save.researchDna,
          revivedThisRun: this.revivedThisRun,
          score: this.score
        })
      };
    } catch {
      // Local-only diagnostics must never affect gameplay.
    }
  }

'''
if "private installLocalTestHooks()" not in s:
    s = s.replace("  private persist() {", test_hooks + "  private persist() {")

p.write_text(s)
