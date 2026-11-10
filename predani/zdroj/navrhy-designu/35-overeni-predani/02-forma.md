# Ověření předání 02 – Je forma předávky nejlepší cesta k prvnímu demu?

*Pohled technického vedoucího. Posuzovaný stav: publikační kopie `~/Documents/Nutrifee/nutrifee-rozhodovaci-maketa/`, commit `0478226` (SCHEMA 88), složka `predani/`. Všechna čísla jsou změřená v repozitáři 9. 11. 2026; sondy jsem spouštěl v čistém `node:vm` kontextu bez `window`, `document` a `localStorage` (skripty jsou jen ve scratchpadu, do repozitáře jsem nic nezapsal).*

## Verdikt v pěti větách

1. Předávka je **obsahově velmi dobrá, ale má špatně zvolenou formu pro cíl „první demo rychle a věrně“**. Je napsaná jako zadání pro přepis celé ostré aplikace (17 etap až po server a schvalování podpisem), ne jako cesta k demu.
2. Nejcennější věc v repozitáři, **jádro `app/core.js`**, se v ní používá jen jako „specifikace chování“ k převodu. Ve skutečnosti ale běží beze změny v každém prostředí JavaScriptu: ověřil jsem to v holém kontextu bez DOM.
3. Pro demo je nejrychlejší a nejvěrnější **převzít jádro a data jako knihovnu (varianta a)**. Doplnit k tomu je potřeba **zlaté výstupy z příběhu jako spustitelnou specifikaci nezávislou na jazyce (b)**, **soubor instrukcí a malé úkoly pro AI asistenta (f)** a **zkrácenou „demo cestu“** místo 17 etap. Atlas zůstane jako příručka k jednotlivým obrazovkám.
4. Předtím je potřeba v maketě opravit tři věci, bez kterých jádro jako knihovna není úplné. Rozhodování větve postupu `V.proposalBranch` leží v obrazovkách. 75 kontrol `fail(` a 167 přímých zápisů do stavu leží v akcích `ui.js`. Otisk položky se liší podle toho, zda je načtená prezentační vrstva.
5. Odhad: příprava nové formy zabere **4–6 dní práce na straně makety** a ušetří řádově **týdny** na straně programátora. Hlavně odpadne riziko tichého rozdílu v klinické logice při přepisu asi 350 funkcí.

---

## 1. Jak předávka funguje teď

### 1.1 Co programátor dostane

| Část | Rozsah (změřeno) | Role |
|---|---|---|
| `predani/README.md` | 250 slov | rozcestník |
| `predani/00-postup.md` | 420 řádků, 9 769 slov | úvod, zásady, architektura, **17 etap** s cílem, vstupy (`NF.*`), testy a „hotovo, když“ |
| `predani/10-atlas-pacient.md` | 994 řádků, 14 630 slov | 57 obrazovek P01–P57, u každé 9 oddílů |
| `predani/20-atlas-ordinace.md` | 699 řádků, 11 218 slov | 30 obrazovek O01–O30 |
| `predani/30-prilohy.md` | 810 řádků, 16 024 slov | slovník, registr (28 + 14 položek), katalogy, zavržené varianty, seznam 376 testů |
| `predani/zdroj/15-ZDROJ-PRAVDY-MAKETA.md` | 727 řádků, 48 145 slov | zdroj pravdy |
| `predani/zdroj/navrhy-designu/` | 31 souborů, 588 kB | podklady, na které texty odkazují |
| `predani/obrazovky/` | 87 PNG, **22 MB** | snímky k atlasům |
| soukromá webová stránka | stejné čtyři dokumenty v záložkách | druhá kopie téhož |

**Celkem asi 100 000 slov** (52 000 předávka + 48 000 zdroj pravdy). Při běžném technickém čtení (200–250 slov za minutu) to je **7–8 hodin čtení**, než programátor napíše první řádek. Prakticky víc, protože atlasy odkazují do kódu.

### 1.2 Implicitní strategie

Tabulka v `00-postup.md` odst. 1.3 říká u `app/core.js` „přenáší se: **ano, jako specifikace chování**“. Etapa 3 vyjmenovává zhruba 150 funkcí `NF.*` v osmi skupinách k „převodu“ a etapa 0 chce „převod testů“ do cílového jazyka. Předávka tedy počítá s tím, že **programátor jádro napíše znovu** a ověří ho přepsanými testy. Etapy 11 (server), 12 (import), 15 (schvalovací registr s podpisy) a 16 (provoz) míří na ostrý provoz.

### 1.3 Silné stránky (a ty je potřeba zachovat)

- **Úplnost a dohledatelnost.** Každá obrazovka atlasu má oddíly „Co se na ní počítá“ (konkrétní `NF.*`), „Co jde do stopy“ a „Testy“. Atlas pacienta obsahuje 94 odkazů na `NF.*`, atlas ordinace 95. Takovou vazbu obrazovka → funkce → test běžná předávka nemá.
- **Ověřitelná „hotovo, když“ s čísly.** Etapa 3 je kotví na modelovém pacientovi: „doplněno 37 jídel a 14 nocí“, shoda vrcholů u 36 z 37 jídel, čas v cíli 68 %, bazál 88 z 92 dnů, větve „zvýšit“ u snídaně i oběda. To jsou skutečné akceptační body.
- **Zásady a zavržené varianty na jednom místě** (`00-postup.md` odst. 1.2, příloha 4). Zabraňují tomu, aby programátor „vylepšil“ věci, které vlastník vědomě zrušil.
- **Otevřené otázky jsou označené** („otevřené“ vs. „na programátorovi“, oddíl 5). Programátor nemusí hádat.
- **Rozdělení jádro / prezentační vrstva** (`app/` vs. `demo/`) a produkční sestavení bez `demo/` je hlídané testem. To je předpoklad pro variantu (a).

### 1.4 Slabé stránky (s doklady)

1. **Cíl předávky neodpovídá úkolu.** Pro první demo nejsou potřeba etapy 11, 15 a 16 a z etapy 12 stačí převodník makety. Dokument to nikde neodlišuje. Pořadí „nejdřív doména bez obrazovek“ (etapy 1–3) znamená, že **první obrazovku programátor uvidí až po přepisu celého jádra**.
2. **Přepis jádra je drahý a rizikový.** Jádro má 2 760 řádků a 356 funkcí (420 klíčů na `NF`), z toho 244 funkcí bere stav `S`. Etapa 3 sama vyjmenovává nejtěžší místa: dvě okna včasného inzulinu, hysterezi „známého“ jídla, učení podle dávky, přednost nízkých hodnot a zdroj nocí. Každé z nich se dá přepsat „skoro stejně“, a v klinické logice je „skoro“ chyba.
3. **Část doménové logiky není v jádře, i když to atlas tvrdí.**
   - `V.proposalBranch` (`app/screens-clinic.js:468`) vybírá větev postupu D-POSTUP (čeká / ponechat / zvýšit / volně / blok při poklesu pod 4). Je to klinicky nejcitlivější rozhodnutí v ordinaci a volají ho `ui.js:524, 530, 538` i `demo/fixtures.js:361–382`. Když jsem přehrával příběh jen s jádrem, spadl v kapitole kontroly na `NF.screens.proposalBranch` undefined.
   - `app/ui.js` má ve 153 akcích **75 volání `fail(`** (doménové podmínky typu „Ke shrnutí zatím nelze. Chybí: …“) a **167 přímých přiřazení `S.… =`**. Přechody stavu tak zčásti leží ve vrstvě, kterou předávka označuje jen jako „seznam interakcí“.
4. **Otisk položky závisí na prezentační vrstvě.** `NF.itemRefs` (`core.js:304–311`) přidává do otisku text „Co schvalujete“ ze slotu `NF.slots.itemGuide`, který dodává `demo/guide.js`. Změřeno: D-POSTUP má bez `demo/` otisk `fp-bf49017463463d0c`, s `demo/guide.js` `fp-13494abce7a30c1f`. U C-CILE a B-HYPO je to stejné. Etapa 2 přitom žádá, aby otisky „se shodovaly s maketou“, a neříká, se kterou variantou.
5. **Testy jsou spíš zábradlí makety než přenositelná specifikace.**
   - Hlavní sada používá prezentační vrstvu `D.` 311krát a skok na kapitolu příběhu `chapter(` 194krát. `ukladani.test.cjs` používá `D.` 152krát a `kontrola4-panel` 93krát.
   - Velká část porovnává vykreslené HTML. Etapa 0 to sama přiznává („porovnávejte stav a obsah obrazovky stejnými větami“).
   - Celý běh trval na tomto počítači **přes 15 minut**, ne „několik minut“ (`00-postup.md` odst. 1.4). Jako rychlé zábradlí pro AI asistenta je to nepoužitelné.
   - Dvě sady čtou soubory mimo repozitář (`kontrola2-obsah.test.cjs:186` čte `../15-ZDROJ-PRAVDY-MAKETA.md`, `kontrola3-panel.test.cjs:125` čte `../navrhy-designu/…/scene-items.cjs`). Repozitář se navíc musí jmenovat `maketa-rozhodovaci` (README předávky). Čerstvý klon tedy neprojde bez ručního kopírování.
6. **Drobné rozpory, které podkopávají důvěru.** README říká SCHEMA 88, atlas pacienta v hlavičce „SCHEMA 87“. `00-postup.md` uvádí „17 testových souborů, 376 testů“ a o pár řádků níž „142 prošlo, 0 selhalo“ jako referenci. Tabulka uvádí „asi 400 funkcí“, skutečně jich je 356.
7. **Atlas neříká, jak obrazovku vyvolat.** U snímku chybí kapitola nebo scéna příběhu (`D.chapters`, 27 kapitol; `D.scenes`, 32 scén), ze které vznikl. Maketa nemá hluboký odkaz na scénu: `ui.js:733` čte z adresy jen `?role=`. Programátor tak vidí obrázek, ale nemůže si otevřít přesně ten stav a prohlédnout data.
8. **Pro programátora s AI asistentem chybí vstupní bod.** V repozitáři není `CLAUDE.md` ani `AGENTS.md`. Instrukce projektu existují jen na Disku, mimo repozitář, a jsou psané pro práci na maketě, ne pro stavbu aplikace.
9. **Dvě kopie téhož.** Markdown v `predani/` a soukromá webová stránka se stejnými čtyřmi dokumenty se při každé opravě rozejdou, pokud stránka nevzniká automaticky.

---

## 2. Alternativy pro tento projekt

Hodnocení „rychlost / věrnost“ je pro první demo; „cena“ je práce na straně makety (vlastník a autor), ne programátora.

### (a) Převzít jádro `app/` přímo jako knihovnu, nové je jen UI a úložiště

- **Co přinese:** nulový rozdíl v klinické logice mezi maketou a demem; etapy 1–3 (asi třetina postupu) se pro demo smrsknou na „zabalit a napojit“. Programátor začne obrazovkami první den. Čísla „37 jídel, 14 nocí, 68 %“ vyjdou automaticky.
- **Proč to jde:** v holém `vm` kontextu bez `window`, `document` a `localStorage` se `core.js` a `app/data/*` (229 řádků) načtou bez chyby. `NF.createState()` a `NF.seed()` dají registr se **42 položkami a 171 jídel**. Na prostředí jádro závisí jen na čtyřech místech: `new Date()` v `NF.now` (ř. 44), `localStorage` v `NF.load`/`NF.save` (ř. 244–282), jmenný prostor `global.NutriFee` a volitelný slot `NF.slots.itemGuide` (ř. 307). HTML vrací jedna funkce, `NF.instrHtml` (ř. 199).
- **Cena:** 1–2 dny v maketě na přesun `proposalBranch` a doménových kontrol z `ui.js` do jádra (viz kap. 4) a na tenký modulový obal (ESM/CommonJS) s injektovatelnými hodinami a úložištěm.
- **Rizika:**
  - Funguje jen v prostředí JavaScriptu: web, React Native (ES5 bez závislostí Hermes zvládne), Node na serveru. **Pro Flutter ne**, tam by šlo jen o vložený JS stroj (QuickJS), což je pro demo zbytečná komplikace, nebo o přepis.
  - Jádro je psané pro maketu: proměnlivý stav, který funkce mění na místě, globální počítadlo ID `seq` (ř. 30), globální `NF.hooks` a `NF.clockModel` a stav, ve kterém se míchá doména s UI (`page`, `wizardStep`, `toast`, `draft`, `meal`). Pro demo to nevadí. Pro ostrý zdravotnický software to bude potřeba přezkoumat (původ kódu, revize), ale to není úkol prvního dema.
  - Velikost stavu: v kapitole `reviewProposals` má JSON 617 kB (256 zápisů, 477 událostí). V telefonu to stačí, server později potřebuje model po entitách.

### (b) Testy makety jako spustitelná specifikace

- **Současná podoba** (převést 376 testů do cílového jazyka) je drahá a křehká: testy jsou navázané na příběh, prezentační vrstvu a HTML (viz 1.4 bod 5).
- **Lepší podoba pro tento projekt: zlaté výstupy.** Skript přehraje všech 27 kapitol a 32 scén jen nad jádrem a uloží JSON s klíčovými výstupy (`NF.summary`, `NF.proposals`, větve, `NF.mealState`/`NF.daySlots`, `NF.advise`, výsledky importu, `polozky` ve stopě). Ověřil jsem, že přehrání všech kapitol jen s jádrem a `demo/fixtures.js` trvá zlomek sekundy (pro `week` 18 zápisů, `reviewSummary` 256 zápisů) a zastaví se jen na `proposalBranch`.
- **Co přinese:** specifikaci nezávislou na jazyce. Platí pro variantu (a) jako regresní zábradlí i pro případný přepis do Dartu nebo na server.
- **Cena:** asi 1 den (generátor + porovnávač + výstupy v repozitáři).
- **Riziko:** zlaté výstupy „zmrazí“ i chyby makety. To je ale přesně požadavek vlastníka („co maketa dělá, platí“).

### (c) Strukturovaná specifikace: datový model, stavový automat, akce a události, kontrakty funkcí

- **Co přinese:** jednoznačný tvar stavu (`NF.createState`, ř. 121–158), 153 akcí s podmínkami a seznam druhů událostí stopy (`NF.TRACE_ITEMS` a další). Nejvíc pomůže při návrhu serveru (etapa 11).
- **Cena:** psaná ručně 4–6 dní a hned zastarává. **Generovaná** (typové deklarace `.d.ts` z tvaru stavu a podpisů 60 nejpoužívanějších funkcí, tabulka akcí z `ui.js`) asi 1 den.
- **Riziko:** třetí zdroj pravdy vedle `15` a kódu. Pro demo stačí generovaný kontrakt veřejného rozhraní jádra. Plný stavový automat má smysl až pro server.

### (d) Uživatelské scénáře a akceptační kritéria místo atlasu

- **Co přinese:** kratší a lépe plánovatelné úkoly („Jako pacient po menší porci s inzulinem uvidím pravidlo hned a za 60 min otázku…“). Základ už existuje: 7 scénářů v `D.acts` (`demo/fixtures.js:625`) a „hotovo, když“ u etap.
- **Cena:** 2–3 dny, když vzniknou ze scén příběhu.
- **Riziko:** **nahradit** atlas by byla chyba. Pravidla obsahu P1–P11, stavy a hraniční případy a „Co jde do stopy“ jsou v atlasu a ve scénářích by se ztratily. Správně je scénáře **přidat jako index nad atlas**, ne místo něj.

### (e) Průchod maketou na videu nebo klikací průvodce

- **Co přinese:** rychlé pochopení celku. Klikací průvodce už existuje: tlačítko **Další ▶** projde asi 60 minut příběhu (`demo/tour.js`, `demo/tour-content.js` 575 řádků).
- **Cena:** video zhruba 0,5 dne (nahrát hlavní linii, 15–20 min).
- **Riziko:** video zastarává s každou SCHEMA a nedá se v něm hledat. Je to doplněk na první hodinu, ne specifikace. Větší přínos má **hluboký odkaz na scénu** (`?scena=N`), protože ze snímku atlasu udělá živý stav.

### (f) Příprava pro programátora s AI asistentem

- **Co přinese:** u tohoto projektu nejvíc. Předávka je obsahově hustá a dobře strukturovaná, takže ji AI asistent čte lépe než člověk. Chybí mu ale tři věci:
  1. vstupní soubor `AGENTS.md`/`CLAUDE.md` v novém repozitáři (9 zásad, příkazy, „jádro neměň, zlaté výstupy musí projít“, kde je co);
  2. **malé ověřitelné úkoly** (jedna obrazovka = jeden úkol se snímkem, stavem ze scény, akceptací z atlasu a testem);
  3. **rychlé zábradlí**: zlaté výstupy a jádrové testy pod 1 minutu, ne 15 minut.
- **Cena:** asi 1–1,5 dne.
- **Riziko:** AI asistent bez zábradlí „opraví“ klinickou logiku nebo vrátí zavržené chování. Proto patří do instrukcí výtah přílohy 4 („co se nesmí vracet“) a test „Aplikace nikde nepočítá ani nenavrhuje dávku“ jako první.

### (g) Kombinace: doporučená

**Jádro jako knihovna (a) + zlaté výstupy jako spustitelná specifikace (b) + příprava pro AI asistenta s malými úkoly (f) + atlas ponechaný jako příručka s indexem scénářů a hlubokými odkazy (d a e v lehké podobě) + generovaný kontrakt rozhraní jádra (lehké c).**

| Varianta | Přínos pro rychlost | Přínos pro věrnost | Cena (dny, maketa) | Hlavní riziko |
|---|---|---|---|---|
| a | velmi vysoký | velmi vysoký | 1–2 | jen JS prostředí; kód makety v produktu |
| b (zlaté výstupy) | střední | velmi vysoký | 1 | zmrazí i chyby (záměrně) |
| c (generovaná) | nízký | střední | 1 | další zdroj pravdy, když se píše ručně |
| d (index nad atlasem) | střední | nízký | 1–2 | nahradit atlas = ztráta pravidel |
| e (video, hluboký odkaz) | střední | nízký | 0,5–1 | video zastará |
| f | vysoký | vysoký | 1–1,5 | bez zábradlí AI „opraví“ logiku |

Proč ne opačně, tedy přepis podle specifikace: demo má být **věrné maketě** a maketa je podle rozhodnutí vlastníka 15. 10. 2026 zdroj pravdy. Nejvěrnější kopie chování je to samé chování. Přepis dává smysl jen tehdy, když vlastník zvolí Flutter, nebo až při přechodu na ostrý provoz. I tehdy jsou zlaté výstupy z (b) nejlevnější cesta k důkazu shody.

---

## 3. Kolik toho maketa převeditelně obsahuje

### 3.1 Měření

| Soubor | Řádky | Obsah | Převeditelnost |
|---|---|---|---|
| `app/core.js` | 2 760 | 356 funkcí, 420 klíčů `NF.*`; 244 funkcí bere `S`; 608 českých textových literálů | **kód 1:1 v každém JS prostředí** |
| `app/data/registry.js`, `catalogs.js`, `foods.js` | 95 + 28 + 106 | 42 položek, 7 pravidel I-*, 6 návyků, 171 jídel | **data 1:1** (lze vyexportovat do JSON) |
| `app/ui.js` | 753 | 153 akcí; 75 `fail(`, 167 `S.… =`, morph, posuvník | logika přechodů ano (po přesunu do jádra), DOM ne |
| `app/screens.js`, `app/screens-clinic.js` | 1 594 + 983 | šablony HTML řetězců (`btn`, `choice`, `card` …), `V.proposalBranch` | **kód jen pro web**; obsah, pořadí a stavy ano přes atlas |
| `app/tokens.css`, `design.css`, `icons.js` | 241 + 1 012 + 68 | tokeny `--nf-*`, komponenty, ikony SVG | tokeny 1:1 (do tématu RN/Flutter převodem), komponenty podle katalogu |
| `demo/fixtures.js` | 704 | modelový pacient, 27 kapitol, 32 scén, `D.play` | **jako testovací data a generátor stavů** |
| `demo/guide.js` | 394 | texty „Co schvalujete“, `ucinek` | obsah; dnes ovlivňuje otisky (viz 1.4 bod 4) |

### 3.2 Závislosti jádra

- **DOM:** žádné. `document` ani `window` se v `core.js` nepoužívají, jen `global` z obalu `(typeof window !== 'undefined' ? window : globalThis)` (ř. 2760).
- **Úložiště:** `global.localStorage` jen v `NF.load`/`NF.save`. Bez něj `NF.save` **mlčky nic neuloží a `NF.storageOK` zůstane `true`** (ověřeno sondou). V novém prostředí je to past: úložiště se musí předat adaptérem, ne spoléhat na globální objekt.
- **Čas:** `new Date()` jen v `NF.now`. Model času už existuje (`NF.clockModel`, `NF.tick`), takže hodiny jdou podstrčit.
- **Globální proměnné:** `NF` jako jmenný prostor, počítadlo `seq` v uzávěru, `NF.hooks`, `NF.clockModel`. V jednom procesu se dvěma pacienty (server) by se sdílely. V telefonu s jedním pacientem to nevadí.
- **Vazba zpět na UI:** jediná, `NF.slots.itemGuide` v `NF.itemRefs`. Opačným směrem ale chybí `proposalBranch`, který jádro potřebuje.
- **Síť a AI:** žádné (hlídá test).

### 3.3 Lze jádro použít beze změn?

- **Web (jakýkoli framework):** ano, beze změn. Stačí `<script>` nebo obal do modulu.
- **React Native:** ano. ES5 bez závislostí, jen `JSON`, `RegExp`, `Date`. Úložiště přes adaptér (AsyncStorage/MMKV), protože `localStorage` není.
- **Node (server, testy):** ano, ověřeno.
- **Flutter:** ne přímo. Buď vložený JS stroj, nebo přepis do Dartu se zlatými výstupy jako důkazem shody.
- **Podmínka pro všechny:** nejdřív přesunout `V.proposalBranch` a doménové kontroly z `ui.js` do jádra. Bez toho knihovna neumí rozhodnout větev návrhu a přechody stavu by se musely psát znovu.

---

## 4. Konkrétní doporučení, seřazená podle poměru přínosu a práce

| # | Změna | Typ | Pracnost | Přínos |
|---|---|---|---|---|
| 1 | **Rozhodnout formu „jádro jako knihovna pro demo“** a zapsat to do `predani/README.md` a `00-postup.md` odst. 1.3: u `app/core.js` napsat „přenáší se jako kód (demo), jako specifikace (ostrý provoz)“ | změnit | 0,5 h + rozhodnutí vlastníka | odpadne přepis 356 funkcí pro demo |
| 2 | **Přesunout `V.proposalBranch` do jádra** jako `NF.proposalBranch` (obrazovky, `ui.js` a `fixtures.js` ho jen volají), nový SCHEMA | změnit (maketa) | 0,5 dne | klinická větev D-POSTUP v jádře; příběh se dá přehrát bez obrazovek |
| 3 | **Zlaté výstupy:** skript `predani/zlate/vytvor.cjs` přehraje 27 kapitol a 32 scén jen nad jádrem a uloží JSON klíčových výstupů; `porovnej.cjs` je kontroluje | přidat | 1 den | spustitelná specifikace nezávislá na jazyce; zábradlí pod 1 minutu |
| 4 | **Odstranit závislost otisku na `demo/guide.js`:** přesunout „Co schvalujete“ do `app/data/registry.js`, nebo jednoznačně napsat, že referenční otisk je s průvodcem, a dát do zlatých výstupů obě sady | změnit (maketa) | 0,5 dne | otisky v demu sedí s maketou |
| 5 | **`AGENTS.md` / `CLAUDE.md` pro nový repozitář** (šablona v `predani/`): 9 zásad, příkazy, „jádro je závislost, neměň ho“, zlaté výstupy a test „nepočítá dávku“ jako první, výtah přílohy 4, kde je atlas | přidat | 0,5 dne | AI asistent pracuje se zábradlím od první hodiny |
| 6 | **„Demo cesta“ na 2 strany místo 17 etap pro demo:** jádro jako závislost → úložiště v zařízení → designový systém → obrazovky ordinace do vydání plánu → převzetí a Dnes → zápis jídla → kontrola a nový plán. Etapy 11, 15 a 16 označit „až ostrý provoz“, z 12 brát `NF.parseSensorCsv` makety | zkrátit | 0,5 dne | programátor ví, co **nedělat** |
| 7 | **Malé úkoly:** pro každou obrazovku P/O jedna karta (snímek, scéna, ze které vznikla, akce, `NF.*`, akceptace z atlasu, test). Generovat z atlasu do `predani/ukoly/` nebo jako úkoly v repozitáři | přidat | 1 den | práce po kouscích s jasným „hotovo“ |
| 8 | **Hluboký odkaz na scénu** v maketě (`?scena=N`, jen s prezentační vrstvou) a u každé obrazovky atlasu řádek „Scéna: N“ | přidat (maketa) | 0,5 dne | ze snímku živý stav s daty |
| 9 | **Obal jádra do modulu** s injektovatelnými hodinami a úložištěm (`NF.configure({ now, storage })`); `NF.save` bez úložiště hlásí `storageOK = false` | změnit (maketa) | 0,5 dne | použití v RN/webu bez hacků; konec tiché ztráty dat |
| 10 | **Přesunout doménové kontroly z akcí `ui.js` do jádra** (75 `fail(`, přechody kroků zařazení a kontroly) jako `NF.can…`/příkazy vracející chybu | změnit (maketa) | 1–2 dny | UI v jiné technologii nepřepisuje pravidla |
| 11 | **Opravit rozpory:** hlavička atlasu SCHEMA 87 → 88, „142 prošlo“ vs. 376 testů, „asi 400 funkcí“ → 356, doba běhu testů; testy číst `15` z `predani/zdroj/`, ne z `../` | změnit | 2 h | důvěra v dokument |
| 12 | **Rychlá sada testů** `node test-jadro.cjs` (sady jádra + zlaté výstupy, pod 1 min); celá sada zůstane pro maketu | přidat | 2 h | zábradlí pro každý krok AI asistenta |
| 13 | **Generovaný kontrakt jádra:** `.d.ts` pro tvar `S` a veřejné funkce, tabulka akcí | přidat | 1 den | čitelné API pro UI i budoucí server |
| 14 | **Soukromou webovou stránku generovat z `predani/*.md`** (jeden zdroj), nebo ji zrušit | zkrátit | 2 h | konec rozjíždění dvou kopií |
| 15 | **Video 15–20 min hlavní linie** (tlačítko Další) | přidat | 0,5 dne | rychlý celkový obraz pro první hodinu |
| 16 | **Atlas ponechat, nezkracovat obsah**, jen nad něj přidat index scénářů z `D.acts` a pořadí obrazovek podle demo cesty | změnit | 0,5 dne | atlas jako příručka, ne povinné čtení předem |

**Součet bodů 1–12: asi 5–6 dní.** Body 1–6 a 11–12 (asi 3 dny) přinesou většinu užitku.

### Co dostane programátor první den

1. **Repozitář šablony dema** se jádrem `app/core.js` a `app/data/` jako závislostí (bod 9), rychlými testy a zlatými výstupy, které projdou hned po klonu (body 3, 12), a s `AGENTS.md` (bod 5).
2. **„Demo cestu“ na 2 strany** (bod 6) a hodinu času na živou maketu s tlačítkem Další, případně video (bod 15). Účet do makety mu založí vlastník.
3. **Povinné čtení předem jen tři části:** zásady odst. 2 (v `00-postup.md` odst. 1.2 už zkrácené), P1–P11 z odst. 15b a příloha 4 „co se nesmí vracet“. Zbytek `15` a atlasy až podle úkolu.
4. **První úkol (do večera):** vykreslit obrazovku pacienta P08 „Dnes – první den“ nad stavem ze scény `handover` (přes `D.play`) jen voláním `NF.focusMeal`, `NF.daySlots`, `NF.howAmI`, s tokeny z `tokens.css`. Hotovo, když text a stavy sedí se snímkem `obrazovky/pacient-P08-…png` a projde test „Aplikace nikde nepočítá ani nenavrhuje dávku“.

---

## Co jsem ověřil a co ne

- **Ověřeno sondou:** jádro a data se načtou a fungují bez `window`, `document` a `localStorage` (42 položek, 171 jídel, `save`/`load` bez chyby, ale bez uložení). Přehrání kapitol příběhu jen s jádrem funguje až po kontrolu, kde chybí `proposalBranch`. Otisky se s průvodcem a bez něj liší (tři položky změřené).
- **Změřeno:** řádky, počty funkcí a akcí, výskyty `fail(`, `S.… =`, `D.` a `chapter(` v testech, rozsah dokumentů, velikost snímků, doba běhu celé sady (přes 15 minut, výsledek PASS/FAIL tohoto běhu v této zprávě neuvádím).
- **Neověřeno:** běh jádra skutečně v React Native nebo Hermes. Tvrzení vychází z toho, že kód je ES5 bez závislostí a bez DOM. Obsah soukromé webové stránky jsem neotevíral, vycházím ze zadání, že skládá tytéž čtyři dokumenty.
