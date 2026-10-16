# Mutants meta progression v1

## Product loop

Run -> merge creatures -> earn DNA -> finish run -> claim base or x2 DNA -> advance genome research -> unlock new genome families -> complete the 66-form collection.

DNA has two related values:

- `dna`: spendable wallet used only for cosmetic backgrounds in v1.
- `researchDna`: lifetime DNA earned. It never decreases and controls genome unlock progression.

Buying cosmetics therefore never slows genome research.

## Genome roadmap

Each genome contains 11 merge tiers. The physical radius ladder stays bounded; long-term content is added horizontally through genome families instead of creating impossibly large tier-15+ objects.

| Genome | Lifetime research DNA | Forms |
| --- | ---: | ---: |
| Biomass | 0 | 11 |
| Predator Line | 800 | 11 |
| Parasite Line | 2,500 | 11 |
| Cyber Mutation | 6,000 | 11 |
| Psi Forms | 12,000 | 11 |
| Abyss | 22,000 | 11 |

Total collection: **66 forms**.

Unlocked genomes may be selected in the Genome Lab. If the current run already contains creatures, the new selection becomes active on the next run so a single board never mixes two genome visual languages.

## DNA earning

- Every successful merge grants a small amount of spendable and lifetime DNA.
- End-of-run reward grants `max(25, floor(score / 12))` DNA.
- Rewarded `DNA x2` grants twice the end-of-run reward instead of the normal reward.
- DNA spending does not reduce `researchDna`.

Exact rates are deliberately configuration-level balance values and should be tuned from real session data after launch.

## Cosmetic background shop

No gameplay power is sold for DNA in v1. The shop is cosmetic and exists to make the wallet meaningful without affecting balance.

| Background | Cost |
| --- | ---: |
| Dark Chamber | Free |
| Neon Lab | 1,000 DNA |
| Bio Vat | 2,500 DNA |
| Reactor | 6,000 DNA |
| Abyss Gate | 12,000 DNA |

Purchased backgrounds remain permanently owned and can be equipped freely.

## Difficulty adjustment after first human test

The overflow line moves from Y=322 to **Y=390**, approximately one blue tier-2 diameter lower. The 1.7-second settled-object grace period remains unchanged for the next test so only one difficulty variable changes at a time.

## Rewarded reliability

- `?mockAds=1` always forces mock rewarded/interstitial behavior, even when a Yandex SDK object partially initializes outside the platform.
- Rewarded calls have a 12-second watchdog.
- Game physics/input are restored in a `finally` path so an SDK callback failure cannot permanently freeze gameplay.
