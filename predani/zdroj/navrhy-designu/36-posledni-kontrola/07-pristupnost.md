# 36/07 Přístupnost, vzhled a konzistence UI (poslední kontrola, SCHEMA 89, 10. 11. 2026)

Kontrolu jsem prováděl na kopii makety (`scratchpad/k36-a11y/maketa-rozhodovaci`), kterou podával `python3 -m http.server 8905`. Supabase byl zablokovaný a v makete jsem nic neměnil. Snímky jsou ve složce `snimky-a11y/` (107 souborů). Jejich názvy mají tvar `<konfigurace>-<stav>.png`, kde `p390` znamená pacienta v šířce 390 px, `p320t160` šířku 320 px s písmem 160 % a `o640z200` ordinaci 1280 px při zvětšení 200 %. Soubory `prod-*` jsou snímky z produkčního sestavení bez `demo/`.

## Jak jsem měřil

- **axe-core nebyl k dispozici**, složka `k4-a11y/node_modules/axe-core` je prázdná. Kontroly jsem proto napsal sám (`scratchpad/k36-a11y/br/checks.js`):
  - **Kontrast** se počítá ze skutečně vykreslené barvy textu proti složenému pozadí pod textem (`elementsFromPoint`, průhlednosti a `opacity` předků), a to pro každý textový uzel včetně textů v SVG. Práh je 4,5 : 1, pro velký text 3 : 1.
  - **Cíle klepnutí:** u pacienta se hlídá 44 px a vlastní token 48 px, v ordinaci 24 px (WCAG 2.2) a vlastní token 40 px.
  - **Přístupná jména:** jméno musí mít každý ovládací prvek, pole i SVG.
  - **Struktura:** duplicitní a rozbitá `id`, nadpisy a počet `h1`, živé oblasti, stav vyjádřený jen barvou.
  - **Přetékání a ořez:** vodorovné rolování stránky, prvky za pravým okrajem, kontejnery s `overflow:hidden`, které obsah ořezávají, a překryvy textů.
  - **Pohyb:** běžící a nekonečné animace.
- **Pacient:** všech 57 stavů z atlasu P01–P57 jsem prošel v těchto konfiguracích:
  - šířky 390, 360 a 320,
  - 390 a 320 s písmem 160 %, které jsem emuloval přes `html{font-size:160%}` (velikosti jsou v `rem`; texty v SVG mají jednotky obrázku, a proto nerostou),
  - telefon na šířku 844 × 390,
  - doplňkově 360 s písmem 160 % u šesti stavů.
- **Pohyb:** ve výchozím nastavení `prefers-reduced-motion: reduce` a pro srovnání `no-preference`, obojí u 11 stavů.
- **Ordinace:** 30 stavů O01–O30 v rozlišení 1440, 1280 a 1024 a při zvětšení 200 %. Zvětšení jsem emuloval viewportem 720 × 450, 640 × 400 a 512 × 384, tedy 1440, 1280 a 1024 při 200 %.
- **Klávesnice** (`kbd.cjs`, `kbd2.cjs`): testoval jsem **na produkčním sestavení bez `demo/`**. Stav jsem převzal z příběhu přes `localStorage`, takže fokus nepřebírá vrstva ukázky. Kontroloval jsem:
  - pořadí tabulátoru, viditelnost a kontrast fokusu,
  - zakrytí fokusu pevnými lištami,
  - kam padne fokus po stisku Enter,
  - posuvníky (šipky, Home, End, PageUp, `aria-valuetext`),
  - zásuvky (fokus dovnitř, past, Esc, návrat fokusu).
- **Prezentační vrstva** se při auditu jádra skrývala. Zvlášť jsem ji prošel v šířce 390 a 1440.

## Co prošlo bez nálezu

- **Kontrast textu: 0 porušení** ve všech 57 stavech pacienta v šesti konfiguracích a ve 30 stavech ordinace v šesti konfiguracích. Jedinou výjimkou je znak „✓“ v krokovníku ordinace (N1).
- **Žádné vodorovné rolování stránky** v žádné konfiguraci.
- **Pohyb:** při `reduce` neběží žádná animace. Při `no-preference` žádná animace není nekonečná (pulz zvýraznění ukázky má 2–3 opakování).
- **Posuvníky:**
  - Ovládají se šipkami, Home, End i PageUp, fokus po změně zůstává na nativním `input type=range` a morph ho nepřepíše.
  - `aria-valuetext` nese slovo stavu, například „pod 4 mmol/l, nízká glukóza“, „56 mmol/mol, nad cílem“ nebo „11 j.“, a bez volby „nevybráno“.
  - Fokus je kolem jezdce vidět.
- **Zásuvky** (Bezpečí z kroku jídla, Pravidla a kontakty, položka registru):
  - mají `role=dialog` a `aria-modal=true` a jsou pojmenované,
  - `#app` je pod nimi `inert`,
  - fokus jde na „Zavřít“, Tab z dialogu neuteče,
  - Esc dialog zavře a fokus se vrátí na otvírající tlačítko.
- **Fokus** je viditelný u všech prvků, kam vede tabulátor (obrys 3 px). Kladný `tabindex` se nikde nepoužívá. U plných petrolejových prvků je bílý obrys uvnitř tlačítka (5,7 : 1).
- **Struktura:**
  - `#toast` je trvalá živá oblast `aria-live=polite`, odpovědi v kroku 1 a výsledky hledání se ohlašují přes `role=status`,
  - `lang="cs"` je nastavené, odkaz „Přeskočit na obsah“ existuje,
  - stránka nemá duplicitní ani rozbitá `id`.
- **Stav nikdy jen barvou:**
  - štítky, dlaždice i pás dne nesou slovo,
  - týdenní fajfky v Mém plánu mají `role=img` s popiskem,
  - uložená poloha glukózy je vyjádřená slovem i ikonou.
- **Telefon na šířku:** obsah je vystředěný ve sloupci 480 px a lišta záložek se zúží na 57 px.
- **Pevné hodnoty v jádře:**
  - `app/design.css` nemá pevné barvy ani rozměry (hlídá to `tokeny.test.cjs`),
  - `app/*.js` nemá žádné hex barvy ani px v atributech `style`, jen procentní proměnné poloh `--vs-m`, `--from` a `--goal`.

---

## Nálezy podle závažnosti

### Vysoká

**V1 Statický náhled telefonu u sestry jde ovládat klávesnicí a čtečkou a mění stav pacienta**
- **WCAG:** 2.1.1 Klávesnice, 4.1.2 Název, role, hodnota, 1.3.1 Informace a vztahy.
- **Místo:** sestra, zaučení (O05–O07) `div.phone-preview.preview-static`, `app/screens-clinic.js:933`, `app/design.css:667`.
- **Co se děje:** náhled je „jen ke čtení“ pouze pro myš (`pointer-events:none`). Tabulátor v něm najde 5–14 tlačítek (Není mi dobře, Ano, byla, lišta záložek, …). **Ověřeno:** v O06 stisk Enter na „Ano, byla“ v náhledu přepne stav na `page: meal` a založí rozpracované jídlo pacienta. Čtečka navíc čte celou pacientskou obrazovku včetně druhého `h1`.
- **Návrh:** dát `.preview-static` atribut `inert` a k němu buď `aria-hidden="true"` s textovým popiskem vedle („Takto to vidí pacient · …“ už existuje jako `.preview-label`), nebo `role="img"` s `aria-label`. Totéž zvážit u živého náhledu v kroku 4 (`screens-clinic.js:618`): lékař v něm teď může klepnout na „Ano, souhlasí“ i „Rozumím, pokračuji“ za pacienta. Pokud to není záměr, i tady `inert`.

**V2 Náhled telefonu v kroku 4 „Předat pacientovi“ se zhroutí na proužek 56 px**
- **WCAG:** 1.4.10 Přizpůsobení obsahu; vizuální chyba.
- **Místo:** O22, `app/design.css:659` (`@container (max-width:900px){.split{grid-template-columns:1fr}.split .phone-preview{…max-width:var(--nf-preview-w);margin-inline:auto}}`).
- **Co se děje:** když je pracovní sloupec užší než 900 px, má náhled jen `max-width` bez šířky a jako blok s `margin:auto` v mřížce se smrští na šířku obsahu. V produkčním sestavení k tomu dochází od 1180 px dolů, tedy i při 1024 a ve všech zvětšeních. V ukázce s panelem vyprávění se to stane i při 1440. Lékař pak v posledním kroku nevidí, co pacient dostane. Snímky: `prod-o1024-O22-predani.png` a `o1440-O22-…png`.
- **Návrh:** do pravidla doplnit `width:100%` (stejně jako `.preview-wrap .phone-preview` na ř. 670).

**V3 Krok 1 jídla: po odpovědi klávesou nebo čtečkou se fokus ztratí na `body`**
- **WCAG:** 2.4.3 Pořadí fokusu; při čtečce i 3.2.2.
- **Místo:** krok 1 (P26, P27), `app/ui.js:128–130` (`focusAfterRender`: klíč obrazovky obsahuje `S.meal.step`, ale ne otevřenou otázku `mealQ`). Akce `mealBolus` jsou na `app/ui.js:369`, `mealQ` na `app/ui.js:372`.
- **Co se děje:** po Enter na „Ano, 8 j.“ zodpovězená otázka zmizí, změní se i `h1` („Kolik ukazuje senzor teď?“) a fokus spadne na `body`. Další Tab začne znovu od „Přeskočit na obsah“. Ohlásí se jen „Inzulin zapsán.“ (`role=status`). Jde o nejčastější tok aplikace, který pacient prochází u každého jídla.
- **Návrh:** přidat otevřenou otázku do klíče obrazovky (`'/q' + m.q`), aby fokus dostal nový `h1`. Jiná možnost je nastavit `NF.focusSel` na nadpis otevřené otázky `.q-open` po akcích, které otázku zavřou (`mealBolus`, `mealTime*`, `mealBefore`, `mealPeak*`, `mealQ`).

### Střední

**S1 Úzký telefon s velkým písmem: ořezané ovládací prvky**
- **WCAG:** 1.4.4 Změna velikosti textu, 1.4.10.
- **Místo:** 320 px a 360 px s písmem 160 %; při 390 px se 160 % vejde. Ořez dělá `.patient-shell{overflow:hidden}` (`app/design.css:395`), stránka proto vodorovně neroluje, ale obsah je useknutý.
  - **Dnes, chip „Není mi dobře“** je za okrajem, viditelné je jen „Není mi do“ (360: pravý okraj 372, 320: 372), `.head-row` na `design.css:981` a `.sick-chip` na ř. 984. Jde o bezpečnostní vstup.
  - Na Dnes je pod okrajem i část hlavního tlačítka „Chystám se jíst“ a v liště záložek nápis „Bezpečí“ (snímek `p320t160-P08-dnes-prvni-den.png`).
  - **Můj plán, týdenní fajfky** `.hweek .marks` (ř. 1006, `flex:none`, 7 × 24 px) přečnívají o 11–30 px.
  - **Převzetí plánu, krok „Co neděláme“:** třetí položka „nikdo nečte zápisy mezi kontrolami“ je za okrajem (`.nots`, ř. 765, vždy tři sloupce).
  - **Detail jídla:** popisek „hranice cíle 10,0 mmol/l“ (ř. 601, `white-space:nowrap`, vystředěný na čáře) přečnívá o 3–23 px.
- **Návrh:**
  - `.head-row{flex-wrap:wrap}` a chipu povolit zalomení,
  - `.hweek` zalamovat (fajfky pod název),
  - `.nots` na jeden sloupec v kontejneru pod ~22 em,
  - popisek cíle zarovnat k pravému okraji, když je čára blízko kraje,
  - lišta záložek: dvouřádkové popisky nebo menší mezera.
  - Ořez `overflow:hidden` na `.patient-shell` nahradit `overflow-x:clip` jen u dekorací. Teď skrývá chyby rozvržení místo toho, aby je ukázal.

**S2 Ordinace při zvětšení 200 %: lišta „Další krok“ zabere třetinu výšky a zakrývá fokus**
- **WCAG:** 2.4.7 Viditelný fokus (2.1); ve WCAG 2.2 jde přímo o 2.4.11 Fokus není zakrytý, k tomu 1.4.10.
- **Místo:** O12 a O15 při 640 × 400. `.nextbar{position:fixed}` je na `app/design.css:294` a 881, `html{scroll-padding-bottom:calc(var(--nf-tabbar-h) + var(--nf-s8))}` na ř. 22.
- **Co se děje:** lišta je vysoká 133 px z 400. Při Tab bylo 8 z 79 prvků v O12 a 9 z 79 v O15 zakrytých z 59–72 %, například „Ne/Ano“ u jiného léku, „Souhlasím · z 8 na 10 j.“ nebo „Jiné rozhodnutí“. Rezerva pro rolování počítá s lištou pacienta (104 px), ne s lištou ordinace. Při 1024 × 768 je zakrytí 0. Snímek: `prod-o640z200-O12-posunuto.png`.
- **Návrh:** nastavit `scroll-padding-bottom` podle skutečné výšky `.nextbar` (proměnná měřená po vykreslení, podobně jako `--barh`). Při nízkém okně (`@media (max-height:600px)`) nebo úzkém sloupci dát liště `position:sticky` až na konci obsahu, případně jen jeden řádek s tlačítkem.

**S3 Text pacienta pod vlastním minimem a ilustrace, která neroste s písmem**
- **WCAG:** 1.4.4 u textu v SVG; jinak porušení vlastního pravidla z `15` odst. 15a a z `tokens.css` ř. 4 a 59 („pacient nikdy pod 14 px“, „text pacienta od 17 px“).
- **Místo:** 13 px (`--nf-fs-2xs`, „jen ordinace“) u pacienta:
  - `.vs-scale` / `.vs-tick` „předepsáno 8 j.“, „0“ a „120“ (P10, P22, P27; `design.css:222`),
  - `.box .k` „Nemoc: inzulin k jídlu“ (P19, P20; ř. 334),
  - `.advice .lever` „Obvyklá porce“ (P43, P44; ř. 636),
  - `.anim-cap` a `.not small` (P05; ř. 744 a 770),
  - `span.name small` „učíme se · 2 ze 4“ (P41).
- **Ilustrace „Jak to funguje“ (P04):** texty v SVG `.kt` a `.kl` (`design.css:751` a 758, tokeny `--nf-fs-fig-*` v px jednotkách obrázku) se vykreslí na 10,9–11,9 px při 390 a **8,5–9,2 px při 320**. Se zvětšeným písmem nerostou.
- **Širší rozpor:** na Dnes má 21 z 29 textů méně než 17 px (`.eyebrow`, `.small`, `.muted` mají 14–15 px). Pravidlo „text pacienta od 17 px“ tak aplikace v praxi nedodržuje. Rozhodnutí: buď pravidlo upřesnit na „hlavní text od 17 px, doplňky od 14 px“, nebo doplňky zvětšit.
- **Návrh:**
  - u pacienta nahradit `--nf-fs-2xs` za `--nf-fs-xs` (14 px),
  - texty ilustrace P04 přesunout pod SVG jako HTML popisky v `rem`, nebo zvýšit `--nf-fs-fig*` tak, aby při 320 px vycházely aspoň 14 px,
  - test `obsah-pacienta.test.cjs` rozšířit o vykreslenou velikost písma ≥ 14 px.

**S4 Náhled u sestry nejde posunout: spodek pacientské obrazovky je nedostupný**
- **WCAG:** 1.4.10; funkční vada.
- **Místo:** O05–O07, `app/design.css:661` (`.phone-preview .patient-shell{overflow-y:auto;max-height:…}`) a ř. 667 (`.preview-static .patient-shell{pointer-events:none}`).
- **Co se děje:** obsah náhledu má 977 px, okno 828 px při 1440 × 900 a jen 312 px při zvětšení 200 %. Kontejner by se rolovat dal, ale `pointer-events:none` vypíná kolečko myši i dotyk. Sestra spodní část obrazovky pacienta neuvidí.
- **Návrh:** `pointer-events` vypnout jen u vnitřního obsahu a nechat rolovat rámeček, nebo, při řešení V1, nechat obsah `inert` a rámeček rolovatelný (`tabindex="0"` s popiskem). Případně náhled zobrazit v plné výšce bez `max-height`.

**S5 Nadpisy a titulek stránky neříkají, kde uživatel je**
- **WCAG:** 2.4.2 Název stránky, 2.4.6 Nadpisy a popisky, 1.3.1.
- **Místo a co se děje:**
  - **Produkce:** `document.title` je vždy „NutriFee · maketa“. Titulek po obrazovkách nastavuje jen prezentační vrstva (`demo/presenter.js:1696` `docTitle`), jádro (`app/ui.js` `NF.render`) ne.
  - **Ordinace:** `h1` je ve všech čtyřech krocích kontroly stejné („Pacient · plán P1“). Název kroku (Souhrn / Návrhy / Potvrdit plán / Předat) je jen v krokovníku, ne v nadpisu. V O12 nemá souhrn dlaždic vlastní `h2`.
  - **O13:** `h3` „Čas v cíli (TIR) 68 %“ stojí před prvním `h2` (skok h1 → h3).
  - **O21:** `h3` „Cíle glukózy Cíle glukózy“, text je ve stromu zdvojený.
  - **O05–O07 a O22:** dvě `h1`, protože se počítá i `h1` z náhledu (viz V1).
  - **Pacient, Dnes:** `h1` je pozdrav („Dobré ráno“), slovo „Dnes“ nezazní.
- **Návrh:**
  - jádro ať nastavuje `document.title` („Krok 1 ze 3 · snídaně · NutriFee“, „Kontrola · Návrhy · NutriFee“),
  - v ordinaci `h2` s názvem kroku hned pod `h1`,
  - detail dlaždice jako `h3` pod `h2` „Souhrn“,
  - u Dnes `<h1><span class="sr-only">Dnes · </span>Dobré ráno</h1>`.

### Nízká

**N1 Krokovník ordinace: drobné písmo a znak ✓ s nízkým kontrastem**
- **WCAG:** 1.4.3; vlastní token.
- **Místo:** `.flow .step small` „přečteno“, „0 z 8“, „vydán“ (`app/design.css:293`) nemá velikost písma, prohlížeč použije `smaller`, takže vyjde **11,7 px**, pod nejmenším tokenem 13 px. Hotový krok má v kolečku textový znak „✓“, bílý na `--nf-ok` = **4,05 : 1** při 13 px.
- **Návrh:** `font-size:var(--nf-fs-2xs)` a fajfku jako ikonu SVG (grafický prvek, stačí 3 : 1), stejně jako jinde.

**N2 Cíle 44 px u pacienta místo vlastních 48 px**
- **WCAG:** 2.5.5 (AAA, informativně); vlastní token `--nf-tap`.
- **Místo:**
  - `.vs-step` −/+ u posuvníků jednotek a času (P27, 44 × 44; podle `15` odst. 15a záměr „≥ 44 px, u glukózy 48 px“),
  - **bezpečnostní volby „pod 4“ a „nad 15“** na posuvníku glukózy (`.vs-scale .vs-end`, `design.css:228`, `min-height:var(--nf-tap-sm)` = 44 px).
- **Návrh:** u pacienta všude `--nf-tap`, zvlášť u „pod 4“ a „nad 15“, které nesou bezpečnostní signál. Na jedné obrazovce jsou teď vedle sebe tlačítka −/+ 44 px a 48 px.

**N3 Zásuvka Bezpečí při písmu 160 %: „×“ překrývá text**
- **WCAG:** 1.4.4.
- **Místo:** P56, `.drawerpanel .close` (`app/design.css:714`, absolutní poloha) přes `p.eyebrow` „Zápis jídla zůstává rozpracovaný“. Snímek `p390t160-P56-…png`.
- **Návrh:** hlavičce listu dát `padding-right: calc(var(--nf-tap) + var(--nf-s4))`.

**N4 Barevné role a ikony stavu**
- **WCAG:** 1.4.1 je splněné (vždy se slovem), jde o konzistenci s `15` odst. 15a.
- **Místo a co se děje:**
  - `.btn.acute` „Pravidla a kontakty“ (`app/design.css:139`) je **akce v červené**. Petrolejová má být jediná akční barva. Při najetí myší (ř. 849) se odkaz přebarví na petrolejovou, takže barva se mění podle stavu, ne podle role.
  - `.vs-end` „pod 4“ (červená) a „nad 15“ (oranžová) jsou tlačítka obarvená stavem. Dává to smysl, jen to v katalogu není popsané jako výjimka.
  - Dlaždice ordinace vyjadřují stav typografickými znaky „✓ ! ✕ –“ (`app/screens-clinic.js:173` a 177), jinde v aplikaci jsou ikony Lucide v SVG.
- **Návrh:** rozhodnout a zapsat do katalogu výjimku „akutní odkaz = červená“, nebo ho dát petrolejově s ikonou štítu. Dlaždice převést na `NF.icon`.

**N5 Pevné hodnoty mimo `tokens.css` (jen mimo jádro)**
- **Místo:**
  - `demo/demo.css` má asi 100 pevných rozměrů v px, ukázkově ř. 28 (`64px`, `40px`, `560px`), 34 (`70px`, `360px`), 66 (`18px`), 97 (`44px`), 108 (`560px`, `40px`), 109 (`160px`), 128 (`48px`), 175 (`8px`) a 179 (`60px`),
  - `design-system/index.html` má inline styly na ř. 195 (`gap:14px`, `min-width:260px`), 213 (`padding-bottom:20px`) a 274 (`height:64px`, `margin-top:12px`, `bottom:8px`).
- **Návrh:** demo.css přenést na `--nf-*` / `--nf-demo-*` (tokeny pro to už částečně existují, například `--nf-demo-panel-w` nebo `--nf-tap-sm`). V katalogu použít pomocné třídy. Jádro je čisté.

**N6 Katalog neodpovídá aplikaci v několika bodech**
- **Místo a co se děje:**
  - Karta `#c-formular` (`design-system/index.html:195`) ukazuje **`.stepper` −/+**, který aplikace od SCHEMA 84/87 nepoužívá (posuvník `.vslider`). V `app/design.css` zůstává 10 mrtvých pravidel `.stepper`.
  - Karta `#c-kroky` ukazuje hotové kroky s číslem, aplikace má v kolečku „✓“.
  - Třída `.tiny` v design.css se nikde nepoužívá.
  - `predani/40-design-system.md` odst. 1 uvádí „text pacienta od 17 px“ a „cíl dotyku aspoň 48 px u pacienta“. Aplikace se od toho odchyluje (S3, N2).
- **Návrh:** kartu `#c-formular` přestavět na `.vslider` + `.field`, mrtvá pravidla `.stepper` odstranit (nebo je výslovně ponechat pro kompatibilitu). Po rozhodnutí o S3 a N2 sjednotit text přílohy.

**N7 Prezentační vrstva (nepřenáší se)**
- **WCAG:** 2.1.1, 4.1.2, 2.5.5.
- **Místo a co se děje:**
  - `demo/explain.js` dává ne-ovládacím prvkům `tabindex="0"`: kolečko jídla `.emoji`, tokeny dávky, štítky, čáru cíle a okénko na stupnici.
  - Kolečko jídla nemá přístupné jméno (jen `aria-describedby`).
  - Čára cíle je cíl 2 × 66 px, okénko 5 × 26 px.
  - Na telefonu má lišta ukázky tlačítka „←“ a „Rozbalit“ vysoká jen 40 px.
- **Návrh:** fokusovatelné vysvětlivky pojmenovat (`aria-label` „Vysvětlit: prstenec učení“). Úzké prvky zpřístupnit přes rodičovský řádek a tlačítka lišty dát na `--nf-tap-sm`.

---

## Co bych opravil před předáním (pořadí)

1. **V1** `inert` na náhledech: jeden atribut, odstraní změnu stavu klávesnicí.
2. **V2** `width:100%` u `.split .phone-preview`: jeden řádek CSS.
3. **V3** klíč fokusu v kroku 1 (`'/q' + m.q`).
4. **S1** zalamování `.head-row`, `.hweek` a `.nots` a revize `overflow:hidden` na `.patient-shell`.
5. **S2** výška lišty „Další krok“ při zvětšení.
6. **S3–S5** podle rozhodnutí vlastníka o minimální velikosti písma u pacienta.

Skripty měření (pro opakování po opravě) jsou v `scratchpad/k36-a11y/br/`:
- `checks.js` je knihovna kontrol,
- `pac.cjs W H mobil textPct štítek` je audit pacienta,
- `cli.cjs W H štítek` je audit ordinace,
- `kbd.cjs` a `kbd2.cjs` testují klávesnici,
- `demo.cjs` kontroluje vrstvu ukázky.

Výsledky po stavech jsou v `scratchpad/k36-a11y/out/*/res.json`.
