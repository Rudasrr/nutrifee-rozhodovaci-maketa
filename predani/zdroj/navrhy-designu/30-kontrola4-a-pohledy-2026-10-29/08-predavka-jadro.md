# Kontrola 4 – předávka části „jádro“ (30. 10. 2026)

*Agent jádra: `app/core.js`, `app/screens.js`, `app/screens-clinic.js`, `app/data/*`, `demo/fixtures.js`, `demo/guide.js`, `15-ZDROJ-PRAVDY-MAKETA.md`, nový test `maketa-rozhodovaci/kontrola4-obsah.test.cjs`. SCHEMA se neměnila (zůstává 77, zvýší ji integrace na 78). Nic nepublikováno, nic necommitováno. Zálohy před změnami: `scratchpad/k4j/*.orig.js`, `15.orig.md`.*

## 1. Co je hotové (po ID)

### Rozhodnutí vlastníka (00-rozhodnuti.md)

| Bod | Co je v jádře | Kde |
|---|---|---|
| 1 | Každá položka registru má `version` (výchozí „v1“, helper `A()` v `registry.js`; `NF.newVersion` dál zvyšuje). `NF.itemFingerprint(item, guideEntry)` – čistá deterministická funkce: kanonický JSON (`NF.canonJson`, seřazené klíče) z `id, scope, cat, title, summary, detail, text, texts, lists, postup, sestra, params, labels` a `guideEntry.co`; dvě 32bitové FNV-1a → `"fp-" + 16 hex`. Stav, poznámka, časy a verze do otisku nejdou. Bez sítě a bez stavu aplikace. | `core.js` (za `NF.seed`) |
| 3 | B-HYPO `texts.opakovane` a I-HYPO končí doslova větou z rozhodnutí. Karta po poklesech se ukazuje znovu s každým dalším poklesem v okně 7 dní (ověřeno, beze změny kódu). | `registry.js`, `catalogs.js`, 15 odst. 2.3, 4.5, 8, 18 |
| 4 | Data připomínek (`S.reminders`, provozní položka **S-PRIPOMINKY**: `max_denne` 4, texty, nabídky časů `lists.casy`), `NF.reminderSettings`, `NF.setReminderTime`, `NF.toggleReminder`, `NF.notifications(S)` (dnešní oznámení do teď; k zapsanému/vynechanému jídlu ne; + otázka „pod 4?“ ze sledování B-HYPO). Komponenta `V.phoneNotice(S[, list])` (tlačítko → Dnes). Nastavení časů u sestry (`remindersPart` v zaučení), vypnutí u pacienta (`remindersCard` v Plánu). Bod zaučení `reminders`. Fixtures: `D.reminderTimes` (7:00 · 12:00 · 18:00 · 21:00) nastaví `trained()`. | `core.js`, `screens.js`, `screens-clinic.js`, `fixtures.js` |
| 5 | Bez nahraného exportu (žádná noc ze `source: 'import'` v období) je v části Bezpečnost tučně Z-IMPORT `texts.nociChybi` a část je otevřená; v souhrnu části „· noční hodnoty chybí“. | `screens-clinic.js` `safetyPart`, `registry.js` |
| 6 | Provozní položka **S-DAVKA** (`po_sobe` 2, texty). `NF.doseOrigin(S, key)`, `V.doseOrigin` v kroku 1 a na kartě bazálu; volba „Ano, jinak“ v živém kroku 1 se jmenuje **„Píchnuto jinak“** (zpětný zápis beze změny). `NF.doseElsewhere(S)` + karta na Dnes. Bod zaučení `doseElsewhere`. | `core.js`, `screens.js`, `registry.js` |
| 7 | D-POSTUP `sestra` (technika · jidlo · stres) a `sestraBody` u `prandHigh` (body 2, 4, 5) a `bazalHigh` (2, 3). `S.nurseCheck = { points, meds, at }`, `NF.setNurseCheck`, `NF.setNurseMeds` (zapíše i do běžící kontroly), `NF.nurseKeys`, `NF.nurseAnswer`. `NF.verifyState` bere odpověď sestry jako výchozí stav, lékař ji může přepnout; `NF.verifyAll` body sestry nepřepíná. Část „Sestra · S pacientem před lékařem“ na kartě před zahájením kontroly (`V.nurseCheckPart`), u bodu štítek „sestra s pacientem: sedí / nesedí / sestra zatím neověřila“. `NF.startReview` převezme léky od sestry. Léky mají třetí volbu `health` (`NF.NURSE_MEDS`). Fixtures: `D.nurseCheckApply` v apply scény reviewSummary. | `core.js`, `screens-clinic.js`, `registry.js`, `fixtures.js` |
| 8 | C-CILE: `tbrGoal` 4, `tirGoalMirnejsi` 50, `tbrGoalMirnejsi` 1 (s popisky a mezemi). `NF.targetPreset`, `NF.setTargetPreset`, `t.preset`. Volba sady v zařazení (krok 2, oddíl 3) + věta o starších a křehkých; volič má řádek „Čas pod cílem méně než“. **C15:** semafor (summary `tirState`, dlaždice, detail) čte zelenou hranici a mez pod cílem z cílů pacienta; z S-SEMAFOR zrušeny `tir_zelena` a `tbr_max`. | `registry.js`, `core.js`, `screens-clinic.js`, `guide.js` |
| 10 | Bezpečí: „Pravidla jsou stejná pro všechny pacienty NutriFee. Tato pravidla připravil NutriFee a posoudil je lékař. Nic k nim nepřidáváme.“ Zásuvka položky u pacienta (02 B9): štítek „posouzeno / čeká na posouzení“, „Tato pravidla připravil NutriFee a posoudil je lékař. Každá rada vychází ze schváleného pravidla. Nic si nevymýšlíme.“ 15 odst. 1 a 18 „Lékař návrh ověří s pacientem a rozhodne“. | `screens.js`, `screens-clinic.js`, 15 |
| 11 | Karta „Podnět z provozu“: tlačítka **„Navrhnout vypnutí položky“** (`impulseOff`) a **„Navrhnout novou verzi ke schválení“** (`impulseVersion`), věta o řízení změn výrobce (níže doslova). Štítek po vypnutí zůstal „položka vypnuta“. | `screens-clinic.js`, 15 odst. 13 |

### 02 obsah
- **B6** (varianta 1): `NF.dropRuleRefs(S, text)` vynechá větu, která jmenuje chybějící pravidlo (I-HYPO, I-MENE) – použito v kartě po poklesech a v textech rad (v2 rady k pořadí). `NF.instrTextOf(S, c)`: katalog `odkazy` (I-NEVIM: vynechá jen chybějící část „k vysoké nebo nízké“) a `bez` (I-NEMOC-BAZAL bez I-HYPO). Bez plánu se znění ukazuje celé. Průvodci I-HYPO, I-MENE, I-VYSOKA, I-NEVIM to říkají.
- **B7**: `NF.addonTries` + `NF.addonWithdrawn` počítají všechny zápisy s přijatým doplňkem a známou nejvyšší hodnotou (i nezapočítané). Řada ve fixtures to dodržuje.
- **B8**: `NF.addFood` s `like` převezme `bilkovina`, `jednolite`, `doplnek` (`likeFrom`); `NF.leverFits`/`NF.addonList` je čtou i u nového jídla. Řízek „jako smažený řízek“ doplněk nedostane, pořadí zůstává obecné.
- **B9, B10, B11**: viz bod 10; Plán pacienta „V cíli 4–10,0 mmol/l“ + „Pod 4 mmol/l je nízká glukóza.“; bod zaučení `t-prochazka` podle R-PROCHAZKA se štítkem položky (`item`), bez „Náhled“.
- **C4**: oběd 6. 10. (E1l, svíčková) ve fixtures (setup scény „week“, ne apply firstResult – kvůli testu C01).
- **C5–C7**: koblihy `b`; nugety mražené `jb`; smažený sýr / nugety s hranolkami bez složek. **C6**: skupina „slané jídlo bez přílohy“.
- **C8**: S-SILNA – kód chce u **každého** ze dvou zápisů vzestup ≥ vzestup_max + dvaNad (6,0), návrh kontroly („u obou 3,0“) by kódu odporoval; souhrn proto říká „u každého z nich vzestup aspoň 6,0 mmol/l (hranice vzestupu 3,0 a k ní 3,0 …; nejde o součet)“.
- **C9**, **C10** (milník usual10 bez svačin), **C11** (milník „teď víme, jak na něj obvykle reagujete“), **C12** (přehled před kontrolou bez „pomohl“, srovnání „bez ní“ jen od 4 + 4), **C16** (průvodce D-POSTUP).
- **Hermelín** → „Nakládaný sýr s bílou plísní s chlebem“.
- Nedělám (prezentace): B1–B5, B12, C1–C3, C13, C14 – viz oddíl 3.

### 01 prohlížeč
- **M3**: oznámení k zamítnutým C-CILE je pod řádkem „Dlaždice vycházejí z:“, štítky C-CILE i S-SEMAFOR v řádku zůstávají.
- **M6**: volby „Je to jako“ mají `data-value` = id jídla (`[data-action="mealLike"][data-value="<id řízku>"]`) – selektor opraví prezentace.

### 06 regulace
- **A2**: text převzetí (níže doslova) + bod zaučení `alerts`; I-VYSOKA souhrn a průvodce bez „upozorňuje aplikace senzoru“; 15 odst. 7b.1.
- **A3** = bod 6. **B1**: I-HYPO (příznaky, glukometr), akarbóza jako vylučovací kritérium. **B2**: věta o alkoholu a námaze v I-MENE (bez „jezte jako obvykle“ – v kontextu menší porce by to byla rada jíst víc). **B3**: I-NEMOC-BAZAL a I-NEMOC-JIDLO. **B4**: `NF.EXCLUSION` (páté zaškrtnutí, `NF.excluded`, blokuje vydání plánu i „Pokračovat“), K-KRITERIA `texts.bezpeci` v Bezpečí, léky `health`. **B5**: bod 9 `prandHigh` (fakt `shoda`, D-POSTUP `shoda_podil` 0,8, `shoda_min` 5, větev „bod 9 nesedí → ponechat, posoudit příště z exportu“) + v „Co návrh oslabuje“ „N z M vrcholů v návrhu je jen opsaných, bez průběhu z exportu“. **B6**: otázka u nového plánu se změněnou dávkou (`S.onboarding.readback` se při vydání nového plánu nuluje; tlačítko „Rozumím, pokračuji“ je zamčené do „Ano“). **B7**: „Kam se po něm glukóza dostávala“, u podobného „Podobné jídlo bývalo spíš v cíli / spíš nad cílem. Jak je to u tohoto jídla, ukážou vaše zápisy.“, krok 3 „Zatím ho neznáme – podobné jídlo bývalo …“. **B8**: „S čím u vás bývalo v cíli“, „Po prvním pokusu uvidíte, jak to dopadlo.“, „Když ji držíte, můžeme výsledky jídel lépe porovnávat.“ **B9, B10** = bod 10. **B12** = bod 11. **B13**: připomínky existují (bod 4) + bod zaučení. **B14** = bod 8.
- **C**: C1 mrtvý `peakAskCard` smazán; C7 věty pro lékaře; C8 S-SILNA; C10 jen „Mezi kontrolami je nikdo z ordinace nečte.“ v přehledu (piktogram „nikdo nečte zápisy mezi kontrolami“ ponechán – hlídá ho hlavní test ř. 1241); C13 15 odst. 1.
- **Nedělám**: B11 (vlastník zamítl), B15 (dok. 14 není v mém rozsahu – úkol pro vlastníka), C3/C4 (text šablon doplňku a procházky – test `kontrola3-obsah` ř. 70 hlídá přesné znění; nechávám na rozhodnutí), C6 (čísla v maketě záměrně ne), C9, C11, C12, C14 (ostrá aplikace).

### 07 reálný provoz
- **A2**: volič dávky mřížkou 1–40 (`NF.DOSE_GRID`, `NF.setDoseValue`) vedle ±1, nepředvyplněný; výchozí hodnoty ze senzoru mřížkou (`NF.setBaselineValue`; čas v cíli po 5 %, čas pod cílem po 1 % + 15, 20).
- **B1**: blok k předchozímu jídlu nad „teď“; vybraná mřížka „teď“ se sbalí do `<details class="more chips-done">` se souhrnem „Vybráno teď: 7 mmol/l · Změnit“ (čipy zůstávají v DOM).
- **B3**: `NF.yesterdayGaps`, karta „Včera chybí … – doplnit?“, `NF.retroAt` bere `S.meal.day` (včerejšek), krok 1 zpětného zápisu „včera · …“ a všechny časy.
- **B4**: věty bez „učení/export“ (níže doslova); řádek „s doplňkem“ u stažené rady se neukazuje.
- **B5**: stupnice v kroku 3 sbalená, když jsou všechny rady rutinní (`routineScale`); „Cesta ke kontrole“ na Dnes od 3. týdne a víc než 7 dní do kontroly jako řádek (`details.path-compact`).
- **B8**: `NF.summary` → `slotsAll`, `withPeak`; dlaždice „Mimo učení“: „· zapsáno X z Y hlavních jídel · nejvyšší hodnota u X z Y“.
- **C1** věta nad tlačítkem; **C2** „právě teď“ předvybrané (jen zobrazení; uložení beze změny); **C3** svačina bez stupnice; **C4** karta „Byl včera večer bazál?“ po poledni jako řádek; **C5** `NF.newDraft` předvyplní startovní návyky.

## 2. Nová znění doslova

- I-HYPO (katalog, `{v}` = 4 mmol/l): „Když glukóza klesne pod {v}, hned vypijte asi 1,5 dl džusu nebo snězte 3–4 kostky cukru. To je léčba nízké glukózy, ne rada k jídlu. Platí to i tehdy, když se cítíte jako při nízké glukóze (třes, pocení, hlad, zmatenost) a senzor ukazuje víc. Za 15 min glukózu změřte znovu; když se cítíte jinak, než ukazuje senzor, změřte ji glukometrem z prstu. Když je pořád pod {v}, dejte si džus nebo cukr ještě jednou a za 15 min změřte znovu; když je pod {v} i potom, volejte záchrannou službu. Když je glukóza zase nad {v} a další jídlo máte až za víc než hodinu, snězte krajíc chleba nebo jinou malou svačinu. Kdo je zmatený, nemůže polknout nebo je v bezvědomí, nesmí nic dostat do úst: okolí volá záchrannou službu. Řekněte to i svým blízkým. Když glukóza klesá pod 4 opakovaně, nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal.“
- B-HYPO `opakovane`: „Při každém poklesu postupujte podle pravidla k nízké glukóze. Mějte u sebe vždy cukr nebo džus. Když sníte méně než obvykle, řiďte se pravidlem „Méně jídla než obvykle“. Dávku inzulinu si sami neměňte, rozhoduje o ní lékař. Když glukóza klesá pod 4 opakovaně, nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal.“
- I-MENE: „Když sníte méně než obvykle a inzulin už je píchnutý, změřte glukózu za {v}. Když je pod 4 mmol/l, postupujte podle pravidla k nízké glukóze. Po alkoholu a po větší námaze než obvykle (sport, práce na zahradě) může glukóza klesnout i za několik hodin, i v noci. Mějte u sebe cukr a před spaním se podívejte na senzor.“
- I-NEMOC-BAZAL: „Bazál si píchejte dál ve stejný čas, i když nejíte. Pijte a měřte glukózu každé {v}. Když je pod 4 mmol/l, řiďte se pravidlem k nízké glukóze; když klesá opakovaně, vyhledejte ještě ten den lékařskou pomoc.“ (bez I-HYPO: „… každé {v}. Když glukóza klesá pod 4 mmol/l opakovaně, vyhledejte ještě ten den lékařskou pomoc.“)
- I-NEMOC-JIDLO (vloženo před větu o záchranné službě): „Berete-li i tablety na cukrovku, při zvracení, průjmu nebo když nemůžete pít, se ještě ten den poraďte s lékařem, které z nich vynechat.“
- Převzetí, Co neděláme: „Nízkou ani vysokou glukózu nehlídáme. Upozornění na ni si nastavte v aplikaci senzoru – sestra vám s tím pomůže. Když vám není dobře, řiďte se pravidly v Bezpečí.“ (bez pravidel: „… Když vám není dobře, v Bezpečí najdete, kam se obrátit.“)
- Bezpečí: „Pravidla jsou stejná pro všechny pacienty NutriFee. Tato pravidla připravil NutriFee a posoudil je lékař. Nic k nim nepřidáváme.“ + K-KRITERIA `bezpeci`: „Když otěhotníte nebo vám lékař změní druh léčby (například jiný inzulin nebo inzulinovou pumpu), NutriFee pro vás přestává platit. Řekněte to lékaři.“
- Vylučovací kritéria (lékař): „Pacient nemá žádné vylučovací kritérium: těhotenství nebo jeho plánování, opakované těžké poklesy glukózy nebo jejich nepoznávání, těžké onemocnění ledvin nebo jater, léčbu akarbózou, potíže se zrakem nebo pamětí, které znemožní ovládat telefon.“
- S-DAVKA: `puvod` „Podle plánu z {date}: {units} j.“ (v příběhu „Podle plánu z 5. 10.: 8 j.“), `jinde` „Když vám lékař dávku mezitím změnil, řiďte se jím a klepněte na „Píchnuto jinak“.“, `jindeBazal` „… klepněte na „Jinak“.“, `karta` „Inzulin {meal} jste dvakrát po sobě zapsali jako {other} j. místo {units} j. podle plánu. Ukažte prosím na kontrole sestře, že máte jinou dávku.“ (nadpis karty „Máte jinou dávku než v plánu?“)
- S-PRIPOMINKY: „Chystáte se ke snídani? Otevřete NutriFee a snídani zaznamenejte.“ · „Chystáte se k obědu? Otevřete NutriFee a oběd zaznamenejte.“ · „Chystáte se k večeři? Otevřete NutriFee a večeři zaznamenejte.“ (bez „zapište“ – test tykání v hlavní sadě bere „zapiš“ jako slovo) · „Je čas na inzulin na noc. Až bude píchnutý, potvrďte ho v NutriFee.“ · „Klesla glukóza pod 4? Odpovězte v NutriFee.“
- Body zaučení (sestra ústně): „Pacient má v aplikaci senzoru zapnuté upozornění na nízkou glukózu“ · „Pacient ví, že když mu dávku změní jiný lékař (třeba při hospitalizaci), řídí se jím, zapíše „Píchnuto jinak“ a řekne to v ordinaci“ · „Pacient si se sestrou vybral časy připomínek v telefonu a ví, že připomínka nemusí přijít a inzulin si píchá podle plánu i bez ní“; návyk procházky: „Pacient ví, že procházku po jídle nabízíme, jen když nehrozí nízká glukóza: ne po menší porci s inzulinem, ne při glukóze pod 4 a ne při nemoci“.
- Z-IMPORT `nociChybi`: „Noční hodnoty nejsou k dispozici – bez exportu nelze posoudit noční poklesy.“
- Scénář 5: „Ve studii a v ostrém provozu se pravidla mění jen postupem výrobce pro změny. Vypnutí položky je bezpečnostní opatření výrobce: zapíše se, oznámí se a nová verze platí až po ověření a uvolnění. Garant vypnutí i novou verzi navrhuje, provádí je výrobce. Ve studii platí jen vypnutí; opravu schválíte až jako novou verzi položky.“
- Ordinace (06 C7): „Aplikace vám mezi kontrolami nic neposílá a nic po vás nežádá.“ (místo „Mezi kontrolami tu nic dělat nemusíte.“ a „Vy už mezi kontrolami nic neděláte.“); předání „Do příští kontroly vám aplikace nic neposílá a nic po vás nežádá.“; S-SILNA „Aplikace u těchto jídel nabízí pacientovi rady k porci, pořadí, doplňku a procházce. Nic nezakazuje, jen tato jídla pacientovi sama nenabízí.“
- Pacient (07 B4): krok 1 „… – jídlo zapíšeme i tak. Hodnotu doplní sestra na kontrole z dat senzoru.“; osa inzulinu „Z jídel, kde byl inzulin v tomto pásmu, se o vás dozvíme nejvíc.“; stupnice „Spočítáno ze 25 vašich zápisů.“ (pod 8: „…, s dalšími se upřesní.“; v detailu jídla navíc „Po prvních N zápisech bylo rozmezí X–Y, krajní hodnoty se nepočítají.“); výsledek „Podle hodnot, které jste opsali; na kontrole je upřesníme.“
- Přehled před kontrolou: „U jídla „Müsli s mlékem a medem“ bylo s radou „doplněk k jídlu“ 5 ze 7 zápisů v cíli.“ (+ „, bez ní X z Y“ od 4 zápisů bez rady); „Mezi kontrolami je nikdo z ordinace nečte.“
- Nový plán: „Inzulin ke snídani: 10 j. (dřív 8 j.). Souhlasí s tím, co vám řekl lékař?“ · Ano, souhlasí / Ne, něco nesedí → „Ukažte telefon sestře. Plán zatím nepřebírejte; sestra dávku ověří s lékařem.“
- Milník known: „Jídlo {food} už známe. Zápisů se všemi údaji máme už {n}, takže teď víme, jak na něj obvykle reagujete.“

## 3. Požadavky na ostatní

### Prezentace – `app/ui.js` (nové akce; bez nich klepnutí nic neudělá)
```js
doseSet: function (v) { var p = String(v).split(':'); if (S.draft) NF.setDoseValue(S, p[0], NF.int(p[1], 1, 40, null)); },
baselineSet: function (v) { var p = String(v).split(':'); NF.setBaselineValue(S, p[0], NF.int(p[1], 0, 100, null)); },
exclusion: function () { NF.setEligibility(S, NF.EXCLUSION[0], NF.excluded(S)); },
targetPreset: function (v) { if (S.draft) NF.setTargetPreset(S, S.draft.targets, v); },
nurseCheck: function (v) { var p = String(v).split(':'), cur = NF.nurseAnswer(S, p[0]), val = p[1] === 'yes' ? true : p[1] === 'no' ? false : null; NF.setNurseCheck(S, p[0], cur === val ? null : val); },
nurseMeds: function (v) { if (!NF.setNurseMeds(S, v).ok) return fail('Vyberte, zda se léky měnily.'); },
reminderTime: function (v) { var i = String(v).indexOf(':'); NF.setReminderTime(S, String(v).slice(0, i), String(v).slice(i + 1)); },
reminderToggle: function (v) { NF.toggleReminder(S, v); },
mealRetroYesterday: function (v) { if (!validMeal(v) || NF.isSnack(v)) return fail('Neznámé jídlo dne.'); S.meal = newMeal(v); S.meal.retro = true; S.meal.at = null; S.meal.day = NF.day(NF.addDays(S.clock, -1)); S.ask = null; S.page = 'meal'; S.error = ''; },
```
- `wizardGo` na krok 1 by měl kromě `S.enrollment.eligible` chtít i `!NF.excluded(S)` (vydání plánu to hlídá `NF.planBlockers`).
- `reviewMeds` už přijme `health` (jádro), `doseReadback` funguje i na obrazovce nového plánu.
- `S.meal.day` musí přežít `stateShapeOK` (je volitelné, beze změny).

### Prezentace – CSS (`design.css`/`tokens.css`)
Nové třídy: `.chips.num-grid`, `.dose-grid` (40 čipů; doporučuji 8 sloupců), `.phone-notices`, `.phone-notice`, `.pn-head`, `.pn-app`, `.pn-time`, `.pn-text` (oznámení telefonu nad obrazovkou pacienta), `details.chips-done`, `details.scale-compact`, `details.path-compact`, `.card.reminders`, `.card.dose-else`, `.card.yesterday`, `.card.readback`, `.dose-origin`, `.nurse-part`, `.verify.nurse`, `.nights-missing`.

### Prezentace – příběh, vyprávění, mapa scén
- **Zaučení (scéna 5, krok „Zaučení dokončeno“)**: přidat `trainingCheck` pro `alerts`, `doseElsewhere`, `reminders` (jinak `finishTraining` selže „Dokud některý bod chybí…“ – test faze2-pribeh C01 a průchod). Případně krok s výběrem časů připomínek (`reminderTime`), fixtures je nastaví v apply (`D.reminderTimes`).
- **Zařazení**: krok se zaškrtnutím vylučovacích kritérií (`exclusion`); apply ho nastavuje (`enrolled`).
- **Kontrola krok 1 (scéna 21)**: kroky sestry (`nurseMeds` same, `nurseCheck` technika/jidlo/stres :yes) – apply je nastaví přes `D.nurseCheckApply`; vyprávění, že sestra převzala léky a tři body (bod 7). Ve scéně 22 se u snídaně ukáže štítek „sestra s pacientem: sedí“ a „Vše sedí“ body sestry nepřepíná; přibyl bod 9 (shoda s exportem: v příběhu sedí).
- **Nový plán (scéna 25)**: krok `doseReadback` yes před „Rozumím, pokračuji“ (fixtures to v apply dělají).
- **Ukázka oznámení telefonu (bod 4)**: `NF.screens.phoneNotice(S)` vykreslit v příběhu nad rámečkem telefonu (např. scéna „otevřel aplikaci až v 10:15“ nebo před obědem).
- **Čísla v příběhu se změnila** (C4 oběd 6. 10., B7 stažení doplňku): jídel 239 → **240**, obvyklá porce 236 → **237**, inzulin podle plánu 230 → **231**, „rada k jídlu byla přijata u 22“ → **21**, jídel s přijatou radou 52 → **51**. „52 ze 72 snídaní“, medián 12,0, čas v cíli 72 % beze změny.
- **Texty, které vyprávění cituje a změnily se** (T4): „Ano, jinak“ → „Píchnuto jinak“; „Kam se po něm glukóza dostane“ → „dostávala“; „Zatím odhad z podobného jídla, upřesní ho vaše zápisy.“; „vám pomohl doplněk k jídlu“; „Co u vás pomohlo“; „Rozmezí je ze … bez krajních hodnot“; „Uprostřed je pásmo, kdy se zápis počítá do učení.“; „Na nízkou či vysokou glukózu vás upozorňuje…“; „Vypnout položku hned“ / „Založit novou verzi ke schválení“; věta Bezpečí; I-HYPO, I-MENE, I-NEMOC-* znění; B-HYPO poslední věta; milník „umíme poradit“. Krok 1: blok k předchozímu jídlu je nad „Kolik ukazuje senzor teď“ a vybraná mřížka „teď“ se sbalí (cíl `[data-action="mealBefore"][data-value="7"]` je po kroku v zavřeném `details`).
- **02 B1–B5, B12, C1–C3, C13, C14, M2, M4, M6** (vyprávění po zamítnutí, režim note, deps): beze změny v mém rozsahu. Poznámka k B4: průvodce D-POSTUP i 15 říkají, že bez postupu karta o poklesu u oběda předem řekne (`pr.lowBlock`) – kroky s ní nepřeskakovat.
- **Přegenerovat `demo/scene-items.js`** (nové štítky: D-POSTUP v části sestry, R-PROCHAZKA u bodu zaučení, C-CILE oznámení pod řádkem).
- **`demo/intro.js`** (06 B10, bod 10): „Lékař dostane na kontrole souhrn a návrhy, ověří je s pacientem a rozhodne.“; tvrzení „připomíná inzulin“ teď odpovídá (bod 4).
- **`demo/explain.js`**: `prm(S, 'S-SEMAFOR', 'tbr_max')` a `tir_zelena` už neexistují → číst cíle pacienta (`NF.targets(S).tbrGoal`, `.tirGoal`).

### Ukládání
- U každého rozhodnutí uložit `version` položky a `NF.itemFingerprint(NF.item(S, id), D.guide[id])`; „rozhodnuto k předchozímu znění“ = uložený otisk ≠ aktuální. Export pro správce může text položky skládat z týchž polí (`NF.FINGERPRINT_KEYS`).

### Testy, které je nutné upravit (nejsou v mém rozsahu; selhávají kvůli rozhodnutím vlastníka)
- hlavní test ř. 179 a 1207: registr **42** položek (14 provozních: + S-PRIPOMINKY, S-DAVKA); ř. 1311 `prov.length` **14**; ř. 1783 `tir_zelena` zrušen (semafor z C-CILE).
- `faze2-jadro.test.cjs` A15 (ř. 202): nové znění u podobného jídla; A33: tlačítka „Navrhnout …“.
- `kontrola74-obsah.test.cjs` ř. 110: Bezpečí „Tato pravidla připravil NutriFee a posoudil je lékař.“
- `faze2-pribeh.test.cjs` C01 a průchod: kroky zaučení pro nové body (viz výše).
- hlavní test „Zařazení: podmínky zamykají pokračování“ („chybí jen dávky“): blokátory nově obsahují i „potvrzení, že pacient nemá vylučovací kritérium“ (06 B4) – v testu zaškrtnout `NF.EXCLUSION[0]`.
- hlavní test „Nové jídlo jen názvem“ (ř. ~404): jídlo „jako smažený řízek“ doplněk už nedostane (02 B8) – očekávat, že se nenabídne.
- hlavní test „Pacient 6. 10. 2026 … rozmezí min–max do 8“: věta „Spočítáno ze N vašich zápisů, s dalšími se upřesní.“ (07 B4).
- hlavní test „Rozhodnutí 20. 10. 2026 (SCHEMA 62) LF-06“: „Vše sedí“ nepřepíná body sestry (bod 7) – u bodů s `NF.nurseKey` čekat odpověď sestry (`NF.verifyState`), ne `r.verify`.
- hlavní test „Vysvětlivky … prahy ze S-SEMAFOR“ a ř. 1783: semafor z cílů pacienta (C15).
- hlavní testy „Průchod pro garanta … mapa scén“, „Nová verze z příběhu“, „Souhrn rozhodnutí“: po přegenerování `scene-items.js` (ve scéně 14 se u nového jídla nenabízí doplněk).
- Nový `kontrola4-obsah.test.cjs` zařadit do hlavního běhu.

### Vlastník
- 06 B15: aktualizovat `navrhy-designu/14-ucel-urceni-a-dpia-2026-10-18.md` podle 15 (bez výzvy volat, bod 3, připomínky, NutriFee není systém upozornění, třída IIb).
- 06 C3/C4 („pokud vám nevadí“, „pokud vám to zdravotní stav dovolí“) – změna šablon rad, nechal jsem na rozhodnutí.
- S-DAVKA a S-PRIPOMINKY jsem dal jako provozní (texty obrazovky); S-DAVKA nese bezpečnostní informaci – zvažte, zda ji nemá schvalovat garant (pak 29 klinických položek a úprava testů).
- 02 C8: návrh kontroly („u obou 3,0“) by odporoval kódu; text upřesněn na „u každého 6,0“.

## 4. Testy (stav na konci mé práce)
- `kontrola4-obsah.test.cjs`: 16 prošlo, 0 selhalo.
- `kontrola2-obsah`, `kontrola3-obsah`, `kontrola3-panel`, `robustnost`: prošly.
- Hlavní sada (běh za souběžné práce ostatních agentů): 98 prošlo, 28 selhalo. Rozlišení:
  - **souběžná práce** (selhávají i s mými soubory vrácenými na SCHEMA 77, ověřeno ONLY na kopii): „Jádro bez sítě…“, „Přihlášení…“, oba testy „SCHEMA 72 …“, „Souhrn rozhodnutí na celou šířku“, „Nová verze z příběhu“; pravděpodobně i `kontrola74-panel` B1 („Děkujeme…“).
  - **očekávané podle rozhodnutí vlastníka, čekají na úpravu testů / integraci** (oddíl 3): počty registru 42/14, `faze2-jadro` A15 a A33, `kontrola74-obsah` B16, „Zařazení … chybí jen dávky“, „Nové jídlo jen názvem“, „Pacient 6. 10. … s dalšími se upřesní“, „LF-06“, „Vysvětlivky“ (explain.js čte zrušené `tir_zelena`), mapa scén a `pravdivost` T1–T4 (přegenerovat `scene-items.js`, nové kroky a citace), `faze2-pribeh` C01 a „Celou maketu … Další“ (kroky zaučení pro nové body).
  - opraveno během práce: ikona v pacientské kartě (SCHEMA 61), slovo „nemocnic“ (zásada 9), „Zapište“ (test tykání), `defaultTargets` bez `preset` (R13).
