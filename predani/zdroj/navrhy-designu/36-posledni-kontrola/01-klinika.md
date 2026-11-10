# 36 / 01 – Poslední kontrola před vývojem: klinická bezpečnost

Datum: 10. 11. 2026. Stav kódu: `maketa-rozhodovaci/` na Disku (SCHEMA dle `app/core.js`). Nic se neměnilo, síť ani Supabase se nevolaly.

**Úhel:** zásady z `15` odst. 2, 7, 8, 9, 10 ověřené v jádře i na obrazovkách pacienta a lékaře, včetně okrajových případů. Hledal jsem skutečné chyby, ne styl.

**Skripty** (načítají jádro stejně jako `zlate-vystupy/generuj.cjs`, resp. celou maketu jako `pravdivost.test.cjs`), složka
`/private/tmp/claude-501/-Users-ngmacminim4pro-Library-CloudStorage-GoogleDrive-rehor-rudolf-gmail-com-M-j-disk-NutriFee-NutriFee-new-look/91a20ff2-da8d-4e57-8d3a-d33240768b1a/scratchpad/k36-klinika/`:

| Skript | Co dělá |
|---|---|
| `a-rady-matice.cjs` | 97 320 kombinací `NF.advise` / `NF.adviseAfter`: 6 scén (rady, po píchnutí, pokles, nemoc, jídlo v nemoci, nový plán) × jídla (snědená, vzorek ze seznamu, nové jídlo jen názvem) × snídaně/oběd/večeře/svačina × porce (menší, obvyklá, větší, „nevím“, prázdná) × inzulin (ještě ne, ano, jinak, nevím, ne, čeká) × glukóza (pod 4, číslo 3, 4–15, nad 15, nemám); zpětný zápis 10/50/90/200 min po jídle. Hledá zakázané věty a porušení zásady 3. |
| `b-toky-pacienta.cjs` | Toky přes akce obrazovek (`app.act`) a vykreslený text: menší porce, „Nepíchnuto“ + oprava, „píchnu za chvíli“, pod 4 před jídlem, nad 15, vynechané jídlo, druhý pokles, nemoc, noční čip, průchod všech kapitol. |
| `c-navrhy-lekari.cjs`, `c4-dolni-cil.cjs` | Návrhy lékaři: velikost kroku, málo dat, noci, dolní cíl, směr rozhodnutí, okna D-CISTA na hranách a přes půlnoc, meze registru. |
| `d-export-pokles.cjs` | Pokles z exportu 3,5–5 h po večeři a těsně před obědem: kam se započítá. |
| `e-nemoc.cjs`, `f-vyssi-davka.cjs`, `g-tbr.cjs` | Nemoc; dávka vyšší než předepsaná; čas pod cílem a větev „zvýšit“. |

---

## Nálezy (seřazené podle závažnosti)

Kritický nález (rada „sněz víc“, aplikace navrhuje výši nebo směr dávky, rada při glukóze pod 4) **jsem nenašel**. Šest nálezů je vysokých. Čtyři z nich jsou chyby v kódu (K1–K4), dva jsou mezery v `15`, o kterých musí rozhodnout vlastník (K5, K6).

### K1 – vysoká: Pokles z exportu 3–4 h po jídle (typicky 22–24 h po večeři) se nikam nezapočítá

- **Reprodukce** (`d-export-pokles.cjs`): večeře v 18:30, export 11:00 až 7:30 s glukózou 3,2 mmol/l mezi 22:00 a 23:30, jinak 7,0. Po nahrání má večeře body jen do 180 min a její nejnižší hodnota je 7,0. `NF.lowEvents` pokles nemá a noc (0–6 h) má minimum 7,0. Pokles tedy nevidí karta „pod cílem“, blokace větve „zvýšit“ (bod 8), návrh k bazálu ani výčet v části Bezpečnost. Lékař ho uvidí jen jako procento času pod cílem.
- **Podle `15`:** odst. 10 říká „≥ 2 poklesy < 3,9 mmol/l **do 4 h** po daném jídle“. Odst. 8 říká „pokles po večeři bývá mezi 22. a 24. hodinou“, proto se na něj ptá až ráno.
- **Příčina:** import připojí k jídlu jen body do `Z-IMPORT.po_jidle_min` = 180 min (`app/core.js:1811`). `NF.lowEvents` sice hledá `x.min <= 240` (`app/core.js:1654`), ale body za 180 min nemá. Noc z exportu je jen 0–6 h (`app/core.js:1819`), takže úsek 21:30–24:00 nepokryje nic. Navíc o tom rozhoduje provozní položka Z-IMPORT, kterou garant neschvaluje.
- **Soubor:** `app/core.js:1811`, `1654`, `1819`; `app/data/registry.js:18` (Z-IMPORT).

### K2 – vysoká: Glukóza „teď pod 4“ (čip v kroku 1) se nepočítá jako pokles

- **Reprodukce** (`b-toky-pacienta.cjs`, B4): oběd s čipem „pod 4“ (obrazovka správně neradí a hlavní tlačítko je „Uložit, inzulin zatím ne“). Za 4 h večeře znovu s „pod 4“. `NF.lowEvents(S, 7)` vrátí 0 a `NF.hypoAlert` null, takže se karta „Glukóza vám za posledních 7 dní klesla pod 4 dvakrát“ neukáže. V Bezpečnosti podkladů kontroly to není (`safetyPart` čte jen `lowEvents`). Pokles neblokuje větev „zvýšit“ a nevstupuje do návrhu „pod cílem“. Bez exportu ho lékař najde jen ve stopě (`pravidlo.nizka`).
- **Podle `15`:** odst. 2.3 a 8 počítají „poklesy“ z odpovědi na otázku, z čipu „pod 4“ u předchozího jídla, z nočního čipu a z exportu. Hodnota před jídlem „pod 4“ tam výslovně není, ale klinicky to pokles je a pacient ho v aplikaci nahlásil. **Je to mezera v `15`, rozhodnutí patří vlastníkovi:** má se pokles před jídlem počítat do B-HYPO a do Bezpečnosti, a ke kterému jídlu dne ho připsat (k předchozímu, nebo jako samostatný)?
- **Soubor:** `app/core.js:1650–1667` (`NF.lowEvents` čte jen `manual.low` a body), `app/core.js:1482` (`manual.beforeBound` se ukládá, ale nikdo ho nečte), `app/screens-clinic.js:302–303`.

### K3 – vysoká: Oprava inzulinu z „Nepíchnuto“ na „podáno“ u menší porce nezaloží sledování nízké glukózy

- **Reprodukce** (B2): oběd „Ještě ne“ → menší porce → rada k porci „Tentokrát ne“ → „Píchnuto jinak“ → „Nepíchnuto“ (uloží `none`). Za 10 min „Opravit inzulin“ → „podle plánu“ (`correctInsulin`, `confirmed = 'as'`). Nevznikne `hypoWatch`, za 65 min na Dnes není otázka „Klesla glukóza pod 4?“ a nikde není pravidlo „Méně jídla než obvykle“.
- **Podle `15` (zásada 3):** menší porce s píchnutým inzulinem → pravidlo hned a za 60 min otázka. Analogická cesta „píchnu za chvíli“ → potvrzení sledování zakládá (`app/core.js:1547`), oprava ne.
- **Soubor:** `app/core.js:1529–1540` (`NF.correctInsulin`). Opačný směr (podáno → nepíchnuto) sledování nechá, viz K12.

### K4 – vysoká: Dolní cíl lékaře pod 3,9 vyřadí pacientem hlášené „pod 4“ z návrhu „pod cílem“

- **Reprodukce** (`c4-dolni-cil.cjs`): 19 ze 76 večeří s „pod 4“ (opsané nebo odpověď). Při dolním cíli 3,9 vznikne karta „Posoudit prandiální dávku k večeři – hodnoty pod cílem“. Při cíli 3,5 nebo 3,0 (volič C-CILE dovolí 3,0–5,0) karta zmizí a zbude řádek „bez návrhu (práh 2/3 nad cílem)“. B-HYPO je přitom pořád počítá (19).
- **Podle `15` (odst. 2.3, 10):** „hlášené ‚pod 4‘ se počítá jako < 3,9“ a nízké hodnoty mají přednost.
- **Příčina:** `lowOf(e, lim)` započte ruční pokles jen při `lim >= 3.9`, a to jako pevné číslo (`app/core.js:2376`).
- **Soubor:** `app/core.js:2376–2377`.

### K5 – vysoká (mezera v `15`): Čas pod cílem ani velmi nízké hodnoty nebrzdí větev „zvýšit“

- **Reprodukce** (`g-tbr.cjs`): scéna kontroly, souhrn ze senzoru pod 3,9 = 9 % času (mez 4 %), pod 3,0 = 3 % (mez 1 %), čas v cíli 55 %. U karty ke snídani „Vše sedí“ → větev **„zvýšit dávku ke snídani“**. Žádný bod nemá „data říkají jinak“ a v „Co návrh oslabuje“ o tom nic není, jen řádek „Celkové vyrovnání“. Stejně u „Posoudit bazál – ranní hodnoty nad cílem“: blokují ho jen noci pod 3,9, denní hypoglykemie nebo celkový čas pod cílem ne.
- **Podle `15`:** odst. 10 se opírá o „titrační protokoly … s přednostní hypoglykemie“ a C-CILE má `tbrGoal` i semafor (TBR ≥ 4 % = červená). Pravidlo, že nadlimitní čas pod cílem brzdí zvýšení, ale nikde není. **Rozhodnutí patří vlastníkovi:** nový bod D-POSTUP („čas pod cílem je pod mezí“), nebo aspoň řádek ve „Co návrh oslabuje“?
- **Soubor:** `app/core.js:2340–2343` (bazál ráno), `app/core.js:2448` (prandiální nad cílem); `app/data/registry.js` D-POSTUP `prandHigh` / `bazalHigh`.

### K6 – vysoká (mezera v `15`): Píchnutá dávka vyšší než předepsaná nemá žádnou bezpečnostní větev, a nabídne se procházka

- **Reprodukce** (`f-vyssi-davka.cjs`): večeře „Ano, jinak“ 24 j. (plán 8 j.), glukóza 5, obvyklá porce, ovesná kaše → krok 3 nabídne „Po jídle se asi 15 minut svižně projděte“. Žádné pravidlo k nízké glukóze, žádné sledování, žádná otázka za 60 min. Platí i pro „Píchnuto jinak“ v kroku 3.
- **Podle `15`:** riziko nízké glukózy je definované jen „glukóza teď pod 4, nebo menší porce s inzulinem v těle“ (odst. 7.3). Vyšší dávka k obvyklé porci je stejný mechanismus, ale `15` ho neřeší (S-DAVKA jen pošle větu sestře po dvou opakováních). **Rozhodnutí patří vlastníkovi**, např. jestli se při jednotkách nad plánem chovat jako u menší porce (pravidlo, bez procházky, otázka za 60 min). Práh si aplikace nesmí vymyslet.
- **Soubor:** `app/core.js:1359–1360` (`smallerInBody`, `lowRisk`), `app/core.js:1497` (sledování jen při `portion === 'smaller'`).

### K7 – střední: Hodnota pravidla k vysoké glukóze (I-VYSOKA, u pacienta 10–25) nesedí s pevným čipem „nad 15“

- **Reprodukce** (B5): lékař dá pacientovi I-VYSOKA = 20 → pacient klepne „nad 15“ → karta „Když je glukóza nad **20** mmol/l, vypijte…“ (spouštěč a text si odporují). Při I-VYSOKA = 12 a glukóze 13 se pravidlo neukáže vůbec, protože spouští jen čip „nad 15“.
- **Podle `15` (odst. 7.1, zásada 3):** čip „nad 15“ má ukázat pravidlo k vysoké glukóze. Hodnotu pravidla jde u pacienta měnit voličem (`catalogs.js` min 10, max 25). Buď spouštěč brát z hodnoty pravidla, nebo hodnotu I-VYSOKA zamknout (`fixed`) jako u I-HYPO.
- **Soubor:** `app/core.js:955` (`chip('high')` = 15), `app/ui.js:407–408`, `app/screens.js:458–467`, `app/data/catalogs.js:25`.

### K8 – střední: Jádro samo nehlídá „rozhodnuto jinak než postup“ při souhlasu s jinou dávkou

- **Reprodukce** (C5): `NF.decideProposal(S, id, { choice: 'agree', branch: 'keep', units: plán + 3 })` zapíše `choice: agree`, `againstBranch: false` a novou dávku. Totéž s `branch: 'down'` a vyšší dávkou. Obrazovky lékaře jsou v pořádku: u větve „ponechat“ posílá hlavní tlačítko `keep` a směr proti větvi kontroluje `app/ui.js:555`. Kontrola ale žije v prezentační akci, ne v jádře, které se předává jako kontrakt (zlaté výstupy, `NF.proposalBranch` je od SCHEMA 89 v jádře). Ostrá aplikace, která zavolá jádro přímo, může zapsat „Souhlasím“ u změny proti větvi a stopa pro lékaře i regulátora bude nepravdivá.
- **Podle `15` (zásada 1, odst. 10):** změna proti větvi se zapíše jako „rozhodnuto jinak než postup“.
- **Soubor:** `app/core.js:2647–2669` (`NF.decideProposal`); kontrola dnes jen `app/ui.js:553–556`.

### K9 – střední: Noc pod 3,0 v krátkém exportu (méně než 10 nocí) nedá kartu k bazálu

- **Reprodukce** (C3d): export 6 nocí, jedna s minimem 2,6 mmol/l → PR-BAZAL je jen řádek „bez návrhu (… málo nocí z exportu)“. Pokles je jen v Bezpečnosti (noci z exportu).
- **Podle `15`:** odst. 10 („s exportem musí být posouzených nocí aspoň `minNoci`“) to tak skutečně říká, takže to není rozpor. U prandiální dávky ale jediný pokles pod 3,0 kartu vytvoří bez ohledu na počet jídel, u bazálu ne. **Otázka pro vlastníka:** má se `minNoci` vztahovat i na noc pod 3,0?
- **Soubor:** `app/core.js:2329–2330`.

### K10 – střední: Pokles z exportu těsně před jídlem se připíše následujícímu jídlu jako „čistý pokles po jídle“

- **Reprodukce** (`d-export-pokles.cjs`): glukóza 3,4 v 12:25–12:30, oběd ve 12:30 → bod obědu `min 0, 3,4` → `lowEvents` vrátí `lunch:senzor:čistý`. Ten blokuje zvýšení dávky k obědu (opatrně, ale chybně připsáno) a v kartě „pod cílem“ se počítá jako „glukóza do 4 h po obědě klesla“. Pokles před obědem přitom vypovídá spíš o snídani nebo bazálu, kde se nezapočítá.
- **Soubor:** `app/core.js:1811` (okno −5 min, `min = max(0, …)`), `app/core.js:1654` (bere i `min 0`).

### K11 – nízká: Meze registru dovolí garantovi bezpečnostní prahy oslabit, některé meze chybí

- `D-POSTUP.poklesy_od` má mez [1, 5]: při 5 čtyři čisté poklesy neblokují „zvýšit“. `D-PRAND.hypoPodil` [0, 0,5] (0 vypne podmínku podílu). `B-HYPO.dny` od 3 a `poklesy` do 5.
- `D-CISTA.pred_min` [0, 60] a `pred_uceni_min` [0, 90] se proti sobě nehlídají (okno pro dávku může být širší než okno pro učení, `15` odst. 10 předpokládá opak). Totéž `po_min` / `po_uceni_min`.
- `I-MENE.v`, `I-NEVIM.v`, `I-NEMOC-BAZAL.v`, `I-NEMOC-JIDLO.v`, `I-VYSOKA.v` nemají záznam v `NF.PARAM_BOUNDS`, takže `NF.newVersion` je ořízne jen na ≥ 0. Meze jsou jen v katalogu pravidel (`catalogs.js`, `NF.instrClamp`).
- **Soubor:** `app/core.js:637–646`, `app/core.js:458`.

### K12 – nízká: Oprava „podáno → nepíchnuto“ nechá otázku „Klesla glukóza pod 4?“

- **Reprodukce** (B2b): menší porce „Ano“ → sledování → do 60 min oprava na „Nepíchnuto“ → otázka se za 65 min zeptá dál a odpověď „ano“ se počítá do B-HYPO. Zbytečná zátěž, ale bezpečná.
- **Soubor:** `app/core.js:1529–1540`.

### K13 – nízká: I-MENE „změřte za {v}“ a otázka B-HYPO za `pripominka_min` jsou dva nezávislé časy

- Lékař může u pacienta nastavit I-MENE na 120 min (15–240), ale aplikace se zeptá za 60 min (B-HYPO). Pacient pak čte „změřte za 120 min“ a otázku dostane po 60 min.
- **Soubor:** `app/core.js:1626–1632`, `app/data/catalogs.js:22`.

### K14 – nízká: Klinická čísla napevno v kódu místo parametru registru

- 3,0 mmol/l: `app/core.js:2322` (noc), `2377` (jídlo). 3,9 v `lowOf`: `2376` (příčina K4).
- Noc = 0–6 h, nalačno = první hodnota v 6 h, „před spaním“ ≥ 21 h: `1819`. Otázka po večeři v 5:00: `1622`. Zpětný zápis sleduje do 4 h: `1496`.
- Text „svačina do 2 h“ ve faktu návrhu: `2459`, přitom `D-CISTA.svacina_min` je parametr (při změně bude text lhát).
- Procházka zpětně „do hodiny“ (`soon`, 60): `1459`, ačkoli okno je `R-PROCHAZKA.okno_min`.

### K15 – nízká (jen odolnost jádra): `NF.advise` s inzulinem `none` a větší porcí říká „Inzulin, který už máte v těle…“

- Z obrazovek se tam nedá dostat (živý tok `none` do `advise` neposílá, zpětný používá `adviseAfter`). Jádro by ale `none` mělo brát jako „bez inzulinu“, ne jako „po píchnutí“ (`NF.effectiveBolus`).
- **Soubor:** `app/core.js:1278`, `1375`.

---

## Co jsem ověřil bez nálezu

**Zásada 1 – dávka (jádro i obrazovky)**
- V 97 320 kombinacích rad ani v textech pacienta ve všech kapitolách není věta měnící dávku („zvyšte“, „snižte“, „píchněte si víc“). Pacient čte jen „Dávku inzulinu si sami neměňte“ a „Inzulin navíc si nepíchejte“.
- Návrhy lékaři (všechny scény `reviewProposals` včetně odboček) ani postup D-POSTUP neobsahují velikost kroku (hledáno „o N j.“, „+N j.“, „N %“). Akce větví jsou jen up/down/keep/swap/edit.
- `review.newDoses` na začátku kontroly = dávky plánu, aplikace nic nepředvyplní. Bez nastavené dávky je „Souhlasím · nastavte novou dávku“ vypnuté.
- U jídla s čistým poklesem `decideProposal` převede zvýšení na „jinak než postup + proti datům“, i bez schváleného postupu (`lowBlock`).
- Bod, kterému chybí větev, vede vždy na „ponechat“, nikdy na zvýšení.

**Zásada 3 – množství jídla** (matice A, 0 porušení)
- Po píchnutí, při „nevím“ i „jinak“ je rada k porci jen z větší porce, z menší nikdy.
- Doplněk se po píchnutí nenabízí. U menší porce s inzulinem se nenabízí procházka ani rada, jejíž text mluví o množství (`NF.talksAmount`).
- Při glukóze pod 4 (čip i číslo 3) nejsou žádné rady, živě ani zpětně, a to i se zamítnutou R-REAKCE.
- Ve všech kombinacích není „snězte víc“, „dojezte“ ani „přidejte si přílohu“. Jediné „Dejte si obvyklou porci“ u menší porce je **před píchnutím**, což zásada 3 výslovně dovoluje (oběma směry).
- Rada k porci se nenabízí u svačiny ani v nemoci.
- Zpětný zápis nabízí jen procházku, jen do `R-PROCHAZKA.okno_min`, a nikdy po menší porci s inzulinem nebo po poklesu.

**B-HYPO**
- Menší porce + „Ano“ / „Nevím“ / „jinak“ → pravidlo I-MENE hned a sledování. Menší porce před píchnutím s odmítnutou radou → I-MENE „Až si píchnete…“ a po „Píchnuto“ sledování.
- „Píchnu za chvíli“ → potvrzení → sledování.
- Vynechané jídlo s inzulinem → pravidlo na Dnes, za 60 min otázka, „ano“ → I-HYPO bez výzvy volat.
- Druhý pokles za 7 dní → karta „Glukóza vám za posledních 7 dní klesla pod 4 dvakrát“ s větou „nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal“.
- Po večeři se otázka ptá ráno a noční čip se na tutéž noc nenabízí ani nepočítá dvakrát. Jeden pokles k jídlu dne se počítá jednou.

**Volání a nemoc**
- Na obrazovkách pacienta ve všech kapitolách ani v Bezpečí není „zavolejte“, „kontaktujte ordinaci“ ani „volejte do ordinace“. „Volejte záchrannou službu“ je jen v schválených I-* pro bezvědomí, dušnost a zmatenost a v I-KONTAKT jako informace. To odpovídá `15` (27. 10. a 30. 10. 2026).
- Nemoc: na Dnes obě pravidla (bazál, inzulin k jídlu) a „Už je vám lépe?“, po 3 dnech karta, v kroku 3 žádná rada a věta „K jídlu neradíme, platí pravidla pro nemoc“. Pravidlo I-MENE a sledování po menší porci platí i v nemoci.

**Nad 15**
- Čip „nad 15“ (teď, nejvyšší hodnota zpětně, předchozí jídlo) ukáže I-VYSOKA a zapíše `pravidlo.vysoka` do stopy, vždy s hodnotou 15 (nesoulad s jinou hodnotou pravidla viz K7).

**Návrhy lékaři**
- Při 7 čistých jídlech (pod `minJidel` 8) karta „nad cílem“ nevznikne, jen řádek „méně než 8 čistých jídel“. Karta „pod cílem“ přitom při splněném prahu poklesů vznikne i s málo daty a vytlačí kartu „nad cílem“ k téže dávce.
- Bazál: noc 3,7 v exportu blokuje „ranní nad cílem“. Noc hlášená čipem v okně exportu, kterou export nepotvrdil, se nepočítá a karta to řekne, jak `15` požaduje.
- Okna D-CISTA na hranách: 30/15 min pro dávku, 45/30 pro učení, 31/16 a 46/31 už ne, přes půlnoc (23:50/0:10, 23:55/0:05) správně. Zápis mezi okny jde do učení, ne do návrhu.
- Bod 8 (čistý pokles) se nedá přepnout „Vše sedí“ a vede na „ponechat dávku, řešit jídlo“.

**Registr**
- Všechny číselné parametry klinických a provozních položek kromě I-* (K11) mají meze a výchozí hodnoty leží uvnitř.
- Prahy odpovídají tabulce `15` odst. 10: 28 dní, 8 jídel, 0,67, medián + 0,5, 2 poklesy / 15 % / 6, 1 × < 3,0, bazál 14 dní / 2 noci / 10 nocí, ráno 7,2.
