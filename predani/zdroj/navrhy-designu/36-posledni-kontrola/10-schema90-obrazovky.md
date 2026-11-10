# 36/10 SCHEMA 90 fáze 2: obrazovky, vzhled, písmo pacienta, přístupnost

Datum: 10. 11. 2026. Zadání: `08-schema90-jadro.md` odd. 6, `05-rozhodnuti.md` bod 10, `07-pristupnost.md` (V1–V3, S1, S2, S4, N1–N3), `09-schema90-garant.md` (diff V2).

Měněné soubory (na Disku, nic necommitováno ani nepublikováno): `app/screens.js`, `app/screens-clinic.js`, `app/design.css`, `app/tokens.css`, `tokeny.test.cjs`, `design-system/index.html`. Soubory `app/core.js`, `app/ui.js`, `app/data/` a `demo/` jsem neměnil. `NF.SCHEMA` ani `?v=` jsem nezvyšoval, to patří k závěrečnému sestavení.

## Testy

- Pracoval jsem na kopii `scratchpad/t90s/maketa-rozhodovaci`, vedle ní byly `15-…md` a `navrhy-designu/04…` a `32…`.
- `node rychle.test.cjs`: **15 prošlo, 0 selhalo** (44 s). Výchozí stav před změnami byl také 15/0. Test jsem pustil znovu po dorovnání kopie s Diskem: od začátku práce se na Disku nic jiného nezměnilo, ani `demo/`.
- `tokeny.test.cjs`: **8 prošlo, 0 selhalo**, z toho jeden test je nový (písmo pacienta).
- Celou sadu jsem nespouštěl, pustí ji koordinátor.

## Hotovo

### 1. V2 z `09` (oznámení po zamítnutí na kartě poklesu)
Diff z `09` jsem použil beze změny:
- nová funkce `ruleOff()`, kterou volá `ruleCard`,
- `lowNoticeCard` při prázdném pravidle (zamítnutá I-HYPO nebo R-POKYNY) vloží za větu „Pokles jsme zapsali“ oznámení „Tahle část nefunguje“.

Týká se dne i noci. Doporučení z `09`, doplnit do `ucinek` v `guide.js` `oznameni: true`, zůstává na prezentační vrstvě.

### 2. Styly nových prvků z `08` odd. 6 (jen tokeny)
- **Věta o českém čase** `.hint.tz-note`: odstup nad první kartou.
- **Slot „před plánem“**: `screens.js` přidá uzlu třídu `before` (dál zůstává `wait`). `.dnode.before` je tečkovaný kroužek na `--nf-surface-2` s tlumeným popiskem. Čtečka ho čte jako „Snídaně · před plánem“ (text uzlu, bez tlačítka).
- **„Co teď“**:
  - vedlejší tlačítka (`Doplnit …`, `Na řadě je … · Chystám se jíst`, dvojice v `.actions.split`) se zalamují a nikdy neořezávají,
  - hlavní `.btn.big` se při velkém písmu zalomí,
  - **ověřeno při 390, 320 a 320 px s písmem 160 %**: nic nepřetéká, na 320 px jsou vedlejší tlačítka pod sebou.
- **Panel opravy zápisu** `.fix-ins`:
  - volby porce se roztahují,
  - potvrzení smazání `hint warn` má akce s odstupem,
  - ověřeno při 390 a 320 px (stav „Opravit zápis“ → „Smazat zápis“).
- **Karta I-VYSSI** (`doctorCard … 'low'`) používá existující `.card.doc.low`, nový styl nepotřebuje.
- **Dlaždice „few“** (ordinace): `cmpTile` dostává stav `few`. Ukazuje ho třídou `c-none few` a slovem „– bez hodnocení · málo dní dat“, i když se čas v cíli zlepšil. Dřív to byla zelená „zlepšuje se“, což by odporovalo „bez hodnocení“. Vzhled je neutrální vložená plocha.
- **Štítek „sedí podle dat“**: `.tag.ok` se nezalamuje.
- **Lišta pro novější verzi** (`.error[role=alert]`) má řádkování, tlačítko „Začít znovu“ v nápovědě o migraci má odstup.
- **Katalog** `design-system/index.html` má novou kartu `#c-schema90` se všemi novými prvky. Snímek: `scratchpad/t90s/snimky/katalog-c-schema90.png`.

### 3. Písmo pacienta (rozhodnutí 10)
- **Drobné tokeny:** v obálce pacienta (`.patient-shell`, tedy i v náhledech telefonu v ordinaci, a v listu `.drawer.sheet`) se `--nf-fs-2xs` a `--nf-fs-xs` skládají na `--nf-fs-sm` (15 px). Všechno, co bylo u pacienta 13–14 px, je teď 15 px: `.vs-tick`, `.box .k`, `.advice .lever`, `.anim-cap`, `.not small`, `.eyebrow`, `.hint` a další.
- **`<small>` bez třídy** má u pacienta 15 px místo „smaller“ prohlížeče.
- **Volby a malá tlačítka** mají 17 px: `.btn.sm`, `.choice.sm`, `.reasons .choice`, `.actions.split` a `.choice.plate` u pacienta a `.sick-chip`.
- **Ilustrace „Jak to funguje“ (P04):** popisky se přesunuly ze SVG do HTML seznamu `.kleg` v rem, se stejnou animací zvýraznění (`kB1–3`, při `reduce` bez animace). SVG má viewBox 320 × 112. Text „v cíli“ u pruhu odpadl, obsah nese první řádek seznamu a `aria-label` obrázku. Dřív vycházely 8,5–12 px.
- **Test** `tokeny.test.cjs` „Písmo pacienta“ počítá z tokenů a tříd:
  - každý `font-size` v design.css je token nebo `inherit`,
  - každý textový token má u pacienta po složení aspoň 15 px,
  - pravidlo pro `<small>` existuje,
  - `.patient` má aspoň 17 px a malé volby aspoň 17 px,
  - P04 nemá text v SVG.
- **Ověřeno v prohlížeči** (měřil jsem vykreslenou velikost každého textového uzlu včetně SVG přes `getScreenCTM`) při 390, 320 a 320 px se 160 % na 16 stavech: P04, P05, Dnes P08, P09, P11, P17, oprava zápisu, opravit inzulin, krok 1 P26 a P27, glukóza P29, svačina P41, krok 3 P43 a P44, Můj plán, Bezpečí. **Žádný text pod 15 px.**
- **Zbývá:** jiné SVG texty u pacienta (`--nf-fs-fig-*`: osa inzulinu `.ins-axis .axl/.axc`, `.lever-anim`) se v prošlých stavech nevykreslily, takže jsem je neměřil. Pokud se někde ukazují, mohou být pod 15 px. Test je hlídá jen u P04.

### 4. Přístupnost
- **V1:** náhled telefonu u sestry i v kroku 4 se vykresluje přes `previewBody()`. Obsah je v `<div class="preview-inert" inert aria-hidden="true">` a rámeček je `.preview-scroll` s `tabindex="0"`, `role="region"` a popiskem „… (náhled jen ke čtení; posunete šipkami)“. Ověřeno: v náhledu nejde zaostřit žádné tlačítko (0 při 1440 i 640).
- **V2:** `@container (max-width:900px){.split .phone-preview{width:100%}}`. Ověřeno: O22 má náhled široký 440 px při 1440 i při 640 × 400.
- **S4:** rolovat se dá rámeček (`.preview-scroll`) kolečkem, dotykem i šipkami, vnitřní `.patient-shell` už nemá vlastní `max-height`. Ověřeno při 640 × 400: O05 má obsah 749 px v okně 328 px a O22 má 1337 px v okně 328 px.
- **S1:**
  - `.head-row` a „Není mi dobře“ se zalamují (na 320 px je chip pod pozdravem),
  - `.hweek` a fajfky se zalamují,
  - `.nots` je mřížka `auto-fit` s tokenem `--nf-nots-min:6.5rem`, při velkém písmu tedy jeden sloupec,
  - popisky lišty záložek se zalamují,
  - `.patient-shell` má místo `overflow:hidden` `overflow-x:clip`,
  - ověřeno při 320 px se 160 %: Dnes, P04, P05, krok 1, oprava zápisu a Bezpečí bez přetečení.
- **S2:**
  - `html:has(.nextbar){scroll-padding-bottom:var(--nf-nextbar-reserve)}` s tokenem 9rem,
  - při výšce okna do 37,5rem je lišta `position:static` na konci obsahu, takže při zvětšení 200 % nic nezakrývá.
- **N1:** `.flow .step small` má `--nf-fs-2xs`. Fajfka jako ikona SVG neřešena, je v jádře.
- **N2:** u pacienta mají `.vs-step` a `.vs-scale .vs-end` („pod 4“, „nad 15“) 48 px a krátký `.btn.link` („Zavřít“) má `min-width` 48 px. Ověřeno: žádný cíl pacienta pod 48 px.
- **N3:** první tři prvky listu mají vpravo místo pro „×“.

## Zbývá

1. **V3 (fokus v kroku 1)** je v `ui.js`, návrh je níže.
2. **Oprava jídla a hodnot (`NF.editEpisode` s `foodId`, `before`, `peak`):** obrazovku jsem nestavěl, protože `ui.js` nemá akce, které by ji obsloužily (umí jen `mealEditPortion` a `mealEditDelete*`). Návrh je níže.
3. **Detail jídla při 320 px se 160 %:**
   - popisek „hranice cíle 10,0 mmol/l“ přečnívá o 24 px (poloha se počítá v `screens.js` u stupnice; popisek zarovnat k pravému okraji, když je čára blízko kraje),
   - v Mém plánu přečnívá „dnes“ u týdne o 5 px.
4. **Ostatní SVG texty u pacienta** (`.ins-axis`, `.lever-anim`) neměřené, viz bod 3 výše.
5. **Katalog:** náhledy `.preview.patient` nemají obálku `.patient-shell`, takže v katalogu se drobné tokeny ukazují v hodnotách pro ordinaci. Karta to říká. Pokud to vadí, je potřeba přidat do katalogu obálku s `min-height:auto`.
6. **N1 fajfka ✓ jako ikona, N4 (akutní odkaz v červené), S5 (titulky a nadpisy)** nebyly v zadání.
7. Před commitem zvýšit `NF.SCHEMA` a `?v=` a pustit celou sadu.

## Návrh V3 pro `app/ui.js` (fokus po odpovědi v kroku 1)

V `focusAfterRender` (asi ř. 128) přidat do klíče obrazovky u jídla text nového `h1`. Když se otázka zavře a otevře další, změní se nadpis a fokus na něj přejde. Výběr na posuvníku nadpis nemění, takže fokus zůstane na jezdci.

```diff
 function focusAfterRender(root) {
   var r = S.review, t = S.training;
   var key = S.role + '/' + S.page + (S.meal ? '/k' + S.meal.step : '') + …;
+  /* 36/07 V3: v kroku jídla je otevřená otázka samostatná obrazovka – po odpovědi dostane fokus nový h1 (dřív padal na body) */
+  if (S.meal && S.page === 'meal' && root && typeof root.querySelector === 'function') { var qh = root.querySelector('main h1'); key += '/h:' + (qh ? qh.textContent : ''); }
   if (NF.focusSel && root && …
```

Totéž řeší po „Opravit zápis“, „Smazat“ a „Nebudu jíst“ (`08` odd. 6) jen zčásti, protože tam se `h1` nemění. Pro ně doporučuji v akcích `mealEditOpen`, `mealEditDeleteAsk` a `mealSkipAsk` nastavit `NF.focusSel`:
- `'.fix-ins .choice-row .choice'` (první volba porce),
- `'.fix-ins .hint.warn .btn.danger'`,
- `'.skip-ask .choice'`, podle skutečné třídy panelu „Nebudu jíst“.

## Návrh pro opravu jídla a hodnot (bod 5 zadání, nepostaveno)

- **`ui.js`:**
  - `mealEditFood: id:foodId → NF.editEpisode(S, id, { foodId })`,
  - `mealEditValue: id:before|peak:chip → NF.editEpisode(S, id, { [k]: chip })`.
- **`screens.js`, panel `.fix-ins`:**
  - pod porci řádek „Jídlo: <název> · Změnit“ s výsledky hledání (`foodResults`) jako v kroku 2,
  - pod ním dva řádky „Glukóza před jídlem / nejvyšší po jídle“ s posuvníkem glukózy (`vslider glu`) a čipy „pod 4“, „nad 15“ a „nemám“,
  - jedno tlačítko „Uložit opravu“.
- Styly vystačí stávající (`.choice-row`, `.vslider`, `.fix-ins`).

## Snímky a skripty

- Snímky: `scratchpad/t90s/snimky/` (`p390-*`, `p320-*`, `p320t160-*`, `o1440-*`, `o640-*`, `katalog-c-schema90.png`).
- Skript s měřením: `scratchpad/t90s/br/check.cjs` (`S=<scratchpad> node check.cjs p390,p320t160,o1440 [filtr]`, server na portu 8910).
