# Předávka J → G a P (jádro SCHEMA 84, 4. 11. 2026)

Stav jádra je v `07-schema84-jadro.md`. Tady je jen to, co potřebuji mimo své soubory: akce v `app/ui.js` a pravidla v `app/design.css` (agent P), vyprávění, průvodce a panel v `demo/` (agent G). Vše, co níže jmenuji, jádro už vykresluje (`app/screens-clinic.js`) a má k tomu funkce v `app/core.js`; bez akce v `ui.js` klepnutí zatím nic nedělá (žádná chyba, jen bez účinku).

## 1. `app/ui.js` (agent P) – nové a změněné akce

Všechny akce jen volají jádro; žádná z nich nenavrhuje výši dávky. `reviewLocked()` a `hbaLocked()` už v souboru jsou.

```js
  /* SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026, bod 1): volič „jiná dávka“ u každé dávky – i u větve „ponechat“ a u řádků „Dávky bez návrhu“ (pr.row) */
  propUnits: function (v) {
    if (reviewLocked()) return; var p = String(v).split(':'); var pr = S.review.proposals.filter(function (x) { return x.id === p[0]; })[0]; if (!pr || !pr.dose) return;
    if (!pr.row) { var br = V.proposalBranch ? V.proposalBranch(S, pr) : null; if (!br || br.action === 'wait') return fail('Nejdřív dokončete ověření; dávku jde nastavit, až postup ukáže větev.'); }
    var d = NF.int(p[1], -60, 60, null); if (d == null) return;
    NF.setReviewDose(S, pr.dose, Math.max(1, Math.min(60, S.review.newDoses[pr.dose].units + d)));
  },
  propDoseSet: function (v) {
    if (reviewLocked()) return; var p = String(v).split(':'), pr = S.review.proposals.filter(function (x) { return x.id === p[0]; })[0]; if (!pr || !pr.dose) return;
    if (!pr.row) { var br = V.proposalBranch ? V.proposalBranch(S, pr) : null; if (!br || br.action === 'wait') return fail('Nejdřív dokončete ověření.'); }
    if (!NF.setReviewDose(S, pr.dose, NF.int(p[1], 1, 60, null)).ok) return fail('Vyberte dávku.');
  },
```

V `propDecide` doplnit větev `other` **hned za** řádek `if (waiting) branch = { action: null };`:

```js
    /* SCHEMA 84 (bod 1): „Jiná dávka“ – jednotky z voliče; zapíše se jako rozhodnuto jinak než postup (+ proti datům při blokujícím poklesu, jádro) */
    if (p[1] === 'other') {
      if (pr.kind !== 'dose') return;
      var ro = NF.decideOtherDose(S, pr.id, S.review.newDoses[pr.dose].units, pr.row ? null : (branch.action || null)); if (!ro.ok) return fail(ro.error);
      S.review.other = null; S.error = ''; NF.focusSel = pr.row ? '.prop.rows h3' : '.prop.current h3'; return;
    }
```

(U řádku `pr.row` je `V.proposalBranch` „free“ – `waiting` je false, takže průchod je stejný jako u karty; `keep` u řádku vrátí dávku na plán, `NF.decideProposal` to u řádku dovolí.)

Nové akce (krok 3, sestra, zdravotní stav, platnost):

```js
  /* SCHEMA 84 (bod 1): volič u každé dávky v kroku 3 – změna vytvoří nebo přepíše rozhodnutí u karty / řádku dané dávky */
  revDose: function (v) { if (reviewLocked()) return; var p = String(v).split(':'), d = NF.int(p[1], -60, 60, null); if (d == null || !S.review.newDoses[p[0]]) return; var r = NF.stepPlanDose(S, p[0], d); if (!r.ok) return fail(r.error || 'Dávku nejde nastavit.'); },
  revDoseSet: function (v) { if (reviewLocked()) return; var p = String(v).split(':'); var r = NF.setPlanDose(S, p[0], NF.int(p[1], 1, 60, null)); if (!r.ok) return fail(r.error || 'Vyberte dávku.'); },
  /* SCHEMA 84 (bod 6): návyky přepínačem a platnost plánu voličem v kroku 3 */
  revHabit: function (v) { if (reviewLocked()) return; NF.toggleReviewHabit(S, v); },
  revValidity: function (v) { if (reviewLocked()) return; if (!NF.setReviewValidity(S, NF.int(v, 1, 365, null)).ok) return fail('Vyberte platnost plánu.'); },
  /* SCHEMA 84 (bod 5, C8): zdravotní stav je druhá otázka sestry a kroku 1 */
  nurseHealth: function (v) { if (!NF.setNurseHealth(S, v).ok) return fail('Vyberte, zda se změnil zdravotní stav.'); },
  reviewHealth: function (v) { if (reviewLocked()) return; if (!NF.setReviewHealth(S, v).ok) return fail('Vyberte, zda se změnil zdravotní stav.'); },
  /* SCHEMA 84 (bod 6): hmotnost pro kontrolu vybere sestra (mřížka po 5 kg a ±1); zámek jako u HbA1c sestry */
  nurseWeightSet: function (v) { if (hbaLocked('sestra')) return; var r = NF.setWeight(S, 'sestra', NF.int(v, 30, 250, null)); if (!r.ok) return fail(r.error); },
  nurseWeightStep: function (v) { if (hbaLocked('sestra')) return; var w = NF.weightFor(S, NF.activePlan(S), S.clock).now, d = NF.int(v, -10, 10, null); if (!w || d == null) return; var r = NF.setWeight(S, 'sestra', w.kg + d, w.date); if (!r.ok) return fail(r.error); },
```

Zrušit: `enrollPad` (záznam „bere i tablety“ zmizel ze zařazení, `S.enrollment.pad` se už nečte). `nurseMeds` a `reviewMeds` zůstávají – hodnoty jsou teď `no` / `yes` (`NF.NURSE_MEDS`), starší `same` / `changed` / `health` jádro přemapuje (`NF.medsValue`, `health` → `NF.setReviewHealth(S, 'yes')`). Hlášky `fail('Vyberte, zda se léky měnily.')` přepsat na „Vyberte, zda pacient začal brát jiný lék na diabetes.“. Štítek zásuvky `name === 'acute'` → „Pravidla a kontakty“ (řádek 170; tlačítko i nadpis zásuvky v jádru už tak zní, C2).

`propReopen` nechat: po znovuotevření vrací volič na dávku plánu; u řádků se nevolá (řádky nemají `.bar` tlačítko).

## 2. `app/design.css` (agent P) – nová pravidla (jen z tokenů)

- `.prop.rows .keep-list.dose-rows li` – jako `.keep-list li`, ale `.keep-act` je `display: flex; flex-wrap: wrap; align-items: center; gap: var(--nf-space-2)`; uvnitř je `.stepper` (stejný vzhled jako v `.decide`), tlačítko `.btn.sm` „Jiná dávka · 8 → 9 j.“, štítek `.tag.info` a tlačítko `.btn.quiet.sm` „Ponechat 8 j.“ a `.small.muted` věta o rozhodnutí proti datům.
- `.decide.other-dose` – stejné jako `.decide` (stepper · `.diff` · tlačítko), ale bez horního okraje bloku; pod ním `.chips.num-grid.dose-grid` (už stylovaná – mřížka 1–40 jako v zařazení). Blok sedí v `.box` „Jiné rozhodnutí“ pod tlačítkem „Ponechat beze změny“ a nad „Zamítnout s důvodem“.
- `.weight-field` – jako `.hba-field` (stepper + mřížka pod ním), v části `.nurse-part` mezi otázkou na zdravotní stav a HbA1c.
- `.card.meals-overview .tablewrap table` – 6 sloupců, první `th[scope=row]` tučně; na úzkém okně vodorovný posuv jako ostatní `.tablewrap`.
- Krok 3: `.dose-field` v „Dávky“ nového plánu (stepper + `.small` s rozdílem + mřížka `revDoseSet`) – stejná komponenta jako v zařazení; `.habit-opt` přepínače (už stylované) s `tag` „beze změny“ / „nový“ / „vyřazen“; `.timechips` platnosti.
- Dlaždice `.tile[data-value="weight"]` – obyčejná `c-none` dlaždice, nic nového.

## 3. `demo/tour-content.js`, `demo/guide.js`, `demo/presenter.js` (agent G)

Co už G převzal (viz `08-predavka-G.md` odd. 5), tady jen doplnění a přesná místa:

- **Scéna 22 (reviewSummary):** po kroku „Sestra: jiný lék na diabetes“ přibyly v jádru dvě otázky/voliče: `[data-action="nurseHealth"][data-value="no"]` („Změnil se zdravotní stav (ledviny, játra, hospitalizace)?“ – u modelového muže bez těhotenství, C8) a hmotnost `.nurse-part .weight-field` (`fn: NF.setWeight(S, 'sestra', D.WEIGHT_REVIEW.kg, D.WEIGHT_REVIEW.date)`; `D.WEIGHT_REVIEW = { kg: 90, date: '2027-01-05' }`, při zařazení `D.WEIGHT_CARD` 92 kg). Příběh (`D.nurseCheckApply`) obojí už nastavuje, v kroku stačí `fn` jako u HbA1c. V souhrnu je dlaždice `.tile[data-value="weight"]` („Hmotnost · 90 kg · – o 2 kg méně · dříve 92 → teď 90 · −2 kg · 5. 1. 2027“) a pod kartou léků karta `.card.meals-overview` „Jídla dne za období“ (snídaně · oběd · večeře · ráno před snídaní: čistých jídel, nad cílem, medián, „první polovina → poslední 4 týdny · zhoršuje se“, výsledek „karta“ / „bez návrhu“) – vhodný cíl kroku k rozhodnutí 4 (S-SEMAFOR má u ní štítek). Věta „Co se dělo“ končí „Pacient si sám dal 6× nižší dávku ke snídani (6 j.) a 4× nižší bazál (16 j.); zeptejte se proč.“ (B5). Karta léků: `.card.meds` s otázkou „Začal pacient brát jiný lék na diabetes?“ (`reviewMeds` `no`/`yes`) a druhou otázkou (`reviewHealth`).
- **Scéna 23 (reviewProposals), hlavní linie:** pořadí `PR-BREAKFAST (2) · PR-LUNCH (2) · PR-BAZAL (2.5) · PR-KEEP-addon (4) · PR-KEEP-walk, PR-KEEP-order (5) · PR-POKYNY (6)` + sekce `.prop.rows` „Dávky bez návrhu (1)“ s řádkem večeře (`li` v `.keep-list.dose-rows`: „Večeře · dnes 8 j. – 37 z 75 nad cílem · medián vrcholu 10,0 mmol/l · bez návrhu (práh 2/3 nad cílem)“, stepper `propUnits` `PR-DINNER:±1`). Karta snídaně má 10 bodů (bod 10 „Pacient rady k jídlu zkoušel (přijal aspoň 3× z nejméně 5 nabídek)“ s faktem „nabídnuto 73×, přijato 40×, odmítnuto 15×“), řádek „Vývoj vrcholů v čase: první polovina období medián 12,0 mmol/l (n = 34) · poslední 4 týdny 14,0 mmol/l (n = 23) · zhoršuje se“ (`.why-row`) a v „Co návrh oslabuje“ první položku o 6× nižší dávce. Oběd: bod 8 „U jídla nebyl v období pokles pod 4 při obvyklé porci a dávce podle plánu“ sedí (fakt „žádný pokles při obvyklé porci a dávce podle plánu; 2 poklesy po menší porci nebo s jinou dávkou (16. 10., 17. 10.) je varování“), řádek `.why-row.lows` „Poklesy pod 4 po obědě v období: 16. 10. 12:20 · hlásil pacient · menší porce; 17. 10. 12:30 · hlásil pacient · menší porce“, „Co návrh oslabuje“ první položka „2 poklesy pod 4 po obědě po menší porci (16. 10., 17. 10.) – poučit pacienta; větev „zvýšit“ neblokují, o dávce k obvyklé porci nic neříkají“; „Vše sedí“ → větev „zvýšit dávku k obědu“; modelový lékař: `propOther` → `propDecide PR-LUNCH:keep` (`D.decideSingles` zapisuje `{ choice: 'keep', branch: null }`). Bazál: `why` končí „Sestra s pacientem uvedla jídlo pozdě večer a v noci, proto karta nemá přednost před ostatními.“, bod 2 má štítek „sestra s pacientem: nesedí“ (sestraBody) a fakt „ráno po těch nocích 6,3, 6,3 mmol/l · ranní hodnoty před snídaní opsané za období: medián 7,0 mmol/l · nad 7,2: 1 z 83“, řádky `.why-row` „Noc na 25. 12.: večeře 18:30 … (obvyklá porce) · bazál 21:05 podle plánu · před spaním 5,7 mmol/l · ráno 6,3 mmol/l“, „Noc na 1. 1.: …“, „Ranní hodnoty za období: …“, „Vývoj ranních hodnot v čase: … beze změny (rozdíl pod 1,0 mmol/l)“; v „Co návrh oslabuje“ „2 noci následují po dnech, u kterých sestra s pacientem uvedla jídlo pozdě večer a v noci (bod 2 podle sestry nesedí); ranní hodnoty po těch nocích 6,3 a 6,3 mmol/l – snížení bazálu by zhoršilo hodnoty po jídle“. „Vše sedí“ u bazálu body 1 a 3 (bod 2 je sestry). Krok, který by ukázal volič „jiná dávka“: `.prop.current [data-action="propOther"]` → `.prop.current .decide.other-dose` (jen ukázat, neklepat; modelový lékař dávku nemění).
- **Scéna 23, odbočky:** `declines`: `PR-BREAKFAST-RADY (3) · PR-LUNCH-RADY (3) · PR-BREAKFAST (3.5) · PR-LUNCH (3.5) · PR-SWAP-order, PR-SWAP-addon (4) · PR-POKYNY · řádky PR-DINNER, PR-BAZAL`; karta k dávce ke snídani je hned za „Nejdřív rady“, bod 10 podle dat nesedí (štítek „data říkají jinak“), modelový lékař ho označí „nesedí“ (`D.storyVerify`) → větev „ponechat dávku, posílit radu“ → `keep`. `impractical`: `PR-LUNCH (2)` je první a postup u něj ukáže „zvýšit“ (poklesy po menší porci neblokují) – `D.reviewStory` tu zvýší oběd o 2 j. (první prandiální karta se zvýšit/snížit), pak `PR-BREAKFAST-RADY (3) · PR-BREAKFAST (3.5) · PR-SWAP-order (4) · PR-KEEP-walk (5) · PR-POKYNY`. Text karty „Nejdřív rady“: „… rada k jídlu: nabídnuto 96×, přijato 13×, odmítnuto 69× (nejčastěji odmítnutá rada „Procházka po jídle“). Podle schváleného postupu jde jídlo před dávkou; návrh k dávce je další karta a lékař o ní rozhodne.“ V obou odbočkách není karta bazálu (jiná historie nocí), jen řádek „Bazál – bez návrhu“ s ranními hodnotami.
- **Scéna 24 (reviewConfirm):** „Shrnutí rozhodnutí“ bez řádků bez návrhu (ledaže lékař zvolil jinou dávku); „Nový plán P2“: u každé dávky `.dose-field` se stepperem (`revDose`) a mřížkou (`revDoseSet`), volič platnosti `.timechips` (`revValidity` 92 / 42, „Do 7. 4. 2027.“), „Cíle glukózy“ voličem (`revTarget`), návyky `.habit-opt` (`revHabit`) se štítky „beze změny“ / „nový“ / „vyřazen“, pod „Bezpečnostní pravidla“ věta „Platí obecná pravidla NutriFee v1 · beze změny u pacienta“ se štítkem rozhodnutí a štítkem R-POKYNY (B12). Po vydání (krok 3 znovu) jsou tam jen hodnoty bez voličů.
- **Zařazení:** podmínka zní „Inzulin v pevných dávkách a žádný jiný lék na diabetes (ani tablety, ani GLP-1; premixy ne)“, zaškrtávátko „Bere i tablety nebo GLP-1“ zmizelo, pod podmínkami věta „Pacient s jiným lékem na diabetes (tablety, GLP-1) do NutriFee nepatří…“; karta pacienta má řádek „Jiné léky na diabetes: žádné (ani tablety, ani GLP-1)“ (`D.patientContext`).
- **Průvodce (`demo/guide.js`):** K-KRITERIA `jak` musí obsahovat „žádný jiný lék na diabetes“ a „Premixované inzuliny ne“ (hlavní test, řádek ~1406) a nikde „navíc nevadí“ (test průvodce); D-PRAND: karta k dávce vždy, bod 10, „nabídnuto N×, přijato M×“, brána od `odmitnutiMin` nabídek, řádek „bez návrhu (práh 2/3)“ se stejným voličem; D-POSTUP: bod 10 a větev „ponechat dávku, posílit radu“, parametr `poklesy_jen_ciste` („větev „zvýšit“ blokují jen poklesy při obvyklé porci a dávce podle plánu (1 = ano, 0 = každý pokles); ostatní poklesy jsou varování“), volič „jiná dávka“ u každé dávky, `bazalLow` bod 2 od sestry; D-BAZAL: okolnosti nocí, ranní hodnoty za období, přednost jen bez „jídla pozdě večer“ nebo pod 3,0; S-SEMAFOR: `smer_mmol` 1,0 a `vyvoj_tydny` 4 (labels v registru); B-HYPO: „pokles při obvyklé porci a dávce podle plánu blokuje větev „zvýšit“, pokles po menší porci nebo s jinou dávkou je v kartě lékaře varování“; I-NEMOC-JIDLO (řádky ~188–190): bez věty o tabletách („Berete-li i tablety na cukrovku…“ zmizela z registru i katalogu). `presenter.js` `SAFE_MORE['B-HYPO']` („… u oběda nic nezablokuje“) přepsat: se zamítnutou B-HYPO lékař poklesy po menší porci neuvidí ani jako varování v kartě k obědu ani v Bezpečnosti.
- **Stopa (`EVENT_LABEL`, jádro):** `kontrola.leky` → „Jiný lék na diabetes ověřen“, nové `kontrola.stav` „Zdravotní stav ověřen“, `hmotnost` „Hmotnost zapsána“.

## 4. Obrazovky pacienta (`app/screens.js`, agent P)

- Bezpečí čte větu K-KRITERIA z `texts.bezpeci` – nové znění „Když otěhotníte, když vám lékař změní druh léčby (například jiný inzulin nebo inzulinovou pumpu) nebo vám přidá jiný lék na diabetes, NutriFee pro vás přestává platit. Řekněte to lékaři.“ přijde samo, pokud obrazovka text nekopíruje.
- „Nový plán“ ukazuje u dávky bez návrhu, kterou lékař změnil, řádek „Inzulin k večeři – lékař nastavil 9 j. (dřív 8 j.). Po večeři bývala glukóza častěji nad cílem.“ (`plan.decisions`, jádro) – žádná změna obrazovky.

## 5. Co nemohu udělat sám

- `app/tokens.css` (`--nf-demo-sheet-h-decide: 60vh` → `50vh`, požadavek G v `08` odd. 1) – soubor nevlastním; jednořádková změna pro P nebo vlastníka.
