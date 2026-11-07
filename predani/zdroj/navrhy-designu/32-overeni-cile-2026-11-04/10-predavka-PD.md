# Předávka P+D → prezentační vrstva (posuvník hodnoty a pacient, SCHEMA 84, 5. 11. 2026)

Agent G skončil dřív, než byl posuvník hotový. Podle pokynu koordinátora jsem cíle kroků v `demo/`, které moje změna rozbila, opravil sám. Tady je zapsané, co jsem v `demo/` změnil a co zůstává pro toho, kdo bude prezentační vrstvu dál udržovat. Celý stav je v `11-schema84-pacient-posuvnik.md`.

## 1. Nový prvek: posuvník hodnoty

Každá volba čísla (dřív mřížka „pilulek“ nebo stepper) je teď `.vslider` (`NF.screens.slider`, u glukózy `NF.screens.gluSlider`). Stavba:

```
.vslider[data-vs="<id>"][data-zone="ok|warn|low|none"]   (.glu u glukózy, .unset bez volby, .off vypnuto, .sm malý)
  .vs-head  → button.vs-step (−) · .vs-mid (output.vs-val > b + small, .vs-state) · button.vs-step (+)
  .vs-track → .vs-rail · .vs-fill · .vs-mark · .vs-thumb · input.vs-input[type=range][data-vs-action][data-vs-prefix]
  .vs-scale → u glukózy button.vs-end.low „pod 4“ · .vs-tick (horní cíl) · button.vs-end.high „nad 15“; jinak popisky konců nebo značky cíle
  .vs-foot  → choice.vs-none „nemám hodnotu“ · btn.vs-save „Uložit · 12 mmol/l“ (jen režim potvrzení)
```

Hodnoty akcí zůstaly stejné jako u čipů a mřížek: `mealBefore 7`, `peakChip E1:12`, `low`, `high`, `none`, `doseSet breakfast:8`, `hbaSet sestra:55`, `nurseWeightSet 90`, `baselineSet tir:60`, `propDoseSet PR-X:10`, `revDoseSet breakfast:10`. Kroky vyprávění, které volají `NF.act`, fungují beze změny; změnily se jen selektory cílů. −/+ nesou `data-value` sousední hodnoty, konce „pod 4“ / „nad 15“ a „nemám hodnotu“ jsou dál tlačítka s `data-action`.

Id posuvníků: `before` (glukóza teď / při jídle), `peak` (nejvyšší po jídle ve zpětném zápisu), `peak-<epId>` (nejvyšší po minulém jídle, např. `peak-E1`), `bl-tir`, `bl-below`, `hba-karta`, `hba-sestra`, `weight`, `dose-breakfast|lunch|dinner|basal` (zařazení), `prop-<PR-ID>` (blok Rozhodnout), `other-<PR-ID>` (Jiná dávka), `row-<PR-ID>` (Dávky bez návrhu), `rev-breakfast|lunch|dinner|basal` (krok 3), `tgt-<klíč>` / `rtgt-<klíč>` (cíle), `instr-<I-ID>` / `rinstr-<I-ID>` (hodnoty pravidel).

Nové akce: **`vsPick`** (`'peak-E1|12'`) – u nejvyšší hodnoty po minulém jídle posuvník volbu jen podrží (`S.vsPick`), uloží ji tlačítko „Uložit“ (`peakChip E1:12`); krok vyprávění dál volá rovnou `peakChip`. `targetSet` / `revTargetSet` / `instrSet` / `revInstrSet` nastavují cíl nebo hodnotu pravidla přímo hodnotou (staré `target`, `revTarget`, `instrValue`, `revInstrValue` s ±1 v jádře zůstaly, obrazovka je nepoužívá).

V příběhu je obrazovka zamčená (`body.pres-locked main { pointer-events: none }`) – na posuvník se v ukázce nedá táhnout, stejně jako dřív nešlo klepat do mřížky; ovládání jsem ověřil v prohlížeči s odemčenou obrazovkou (klepnutí na dráhu, tažení, šipky, Enter, −/+, konce, Uložit, dotyk na 390 px).

## 2. Co jsem změnil v `demo/` (selektory a texty, zvoleno bez dotazu)

| Soubor, místo | Dřív | Nyní |
|---|---|---|
| `tour-content.js` firstMeal „Hodnota ze senzoru: 7“, zpětný zápis „Hodnota při jídle: 7“, noční pokles „Hodnota teď“ | `.slider.glu[data-vs="before"]` (G to připravil s chybnou třídou) | `.vslider.glu[data-vs="before"]` (sel i watch) |
| `tour-content.js` firstResult „Nejvyšší po snídani: 12“ | `[data-action="peakChip"][data-value="E1:12"]` | `.vslider[data-vs="peak-E1"]` (akce `peakChip E1:12` beze změny) |
| `tour-content.js` lateMeal „nad 15“ | `[data-action="mealPeak"][data-value="high"]` | `.vslider[data-vs="peak"] .vs-end.high` |
| `tour-content.js` reviewProposals „Souhlasím: zvýšit snídani“ (2×) | `curSel('PR-BREAKFAST', '.stepper button:last-child')` | `curSel('PR-BREAKFAST', '.vslider .vs-head .vs-step:last-child')` (akce `propUnits` beze změny) |
| `explain.js` `glu-low`, `glu-high`, `glu-none`, `glu` | `.chips.glu …` | `.vslider.glu .vs-end.low`, `.vs-end.high`, `.vs-none`, `.vs-track` |
| `explain.js` `baseline`, `targets` | `has: '[data-action=baseline]'`, `'[data-action=target]'` | `'[data-action=baselineSet]'`, `'[data-action=targetSet]'` |
| `tour-content.js` texty | „Obojí pacient zadá čipem.“ · „Pacient klepl na 12: …“ · „Čipy jsou po celých mmol/l …“ · „víc, než čipy nabízejí“ · „díky čipu“ · „Sestra vybrala mřížkou hmotnost“ | „Hodnotu pacient nastaví posuvníkem, na pokles odpoví ano nebo ne.“ · „Pacient posunul na 12 a uložil …“ · „Posuvník jde po celých mmol/l, −/+ doladí o jedno a slovo u čísla řekne, co hodnota znamená …“ · „kam posuvník končí“ · „díky volbě „nad 15““ · „Sestra nastavila posuvníkem hmotnost“ |
| `guide.js` (D-PRAND/B-HYPO/Z-GLUKOZA/I-VYSOKA) | „hranice 4 z čipů“, „mřížka „teď“ se sbalí na řádek“, „celé číslo z čipu“, „jen čipem „pod 4““, „po klepnutí na čip „nad 15““ | „z posuvníku“, „Vybraná hodnota je velké číslo se slovem stavu …; bez volby je jezdec jen naznačený a „Další“ zamčené.“, „volbou „pod 4““, „po volbě „nad 15““ |
| `fixtures.js` otázka pro garanta | „celá čísla (čipy)“ | „celá čísla (posuvník po celých mmol/l)“ |
| `scene-items.js` | mapa scén ze starých selektorů (Z-GLUKOZA se nabízela až v lateMeal, krok peakChip byl při zamítnuté B-HYPO „skip“) | přegenerováno generátorem `navrhy-designu/04-pohledy-2026-10-05/scene-items.cjs` (389 s): Z-GLUKOZA a B-HYPO se nabízejí v první snídani, krok „Nejvyšší po snídani“ je při zamítnuté B-HYPO „note“ |

Slovník (`15` odst. 19, zvoleno bez dotazu): **„posuvník“** (slovo, které člověk zná z telefonu; „volba hodnoty“ je abstraktní). „Čip“ zůstává jen pro noční pokles a odpovědi ano/ne, „volič“ jako obecné slovo pro výběr v ordinaci. Věty o čipu nočního poklesu (`tour-content.js` scéna 1. ledna) jsem nechal – ten čip zůstal.

## 3. Co zůstává (není způsobeno posuvníkem, červené už ve výchozím běhu 5. 11. ráno)

Poslední běh celé sady na kopii (stav Disku po všech změnách): **132 prošlo, 2 selhala**; výchozí běh před mou prací 117 / 17.
- Hlavní sada „Průchod pro garanta (8. 10. 2026)“: v panelu scény 3 chybí věta „Z této scény ještě ke schválení“ / „Ke schválení teď“ (text panelu, `presenter.js`).
- `faze2-pribeh` C01: v odbočce „nemám to doma“ (scéna 31) kroky ponechají oběd, `apply` (`D.reviewStory`) ho zvýší na 12 j.

## 4. Token

`--nf-demo-sheet-h-decide` je `50vh` (`08` odd. 1).
