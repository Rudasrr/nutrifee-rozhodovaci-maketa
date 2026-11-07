# Kontrola 4 · pohled přístupnost (WCAG 2.2 AA) a čitelnost pro starší uživatele

29. 10. 2026 · maketa SCHEMA 77 (kopie `maketa-rozhodovaci/` beze změny, vlastní server 127.0.0.1:8772) · Chrome for Testing (Playwright) + axe-core 4.10.2. V projektu se nic neměnilo.

## Co a jak se ověřovalo

| Oblast | Postup |
|---|---|
| axe (wcag2a/aa, 21a/aa, 22aa, best-practice) | celý průchod hlavní linií a dodatkem **156 kroků × 2 rozvržení** (1440×900 desktop, 390×844 telefon), axe po každém kroku, po rozhodnutí a na souhrnu; zvlášť úvod, zásuvka „Vaše rozhodnutí“, přehled scén, souhrn, Výsledky garanta (správce), přihlašovací brána, produkční sestavení bez `demo/` |
| Klávesnice | Tab/Shift+Tab, Enter, mezerník, Esc: start ukázky, Dál/Zpět, sbalení panelu, karta položky, poznámka, zásuvka, přehled scén, vysvětlující bublina, souhrn, výsledky správce; pokus ovládat zamčenou obrazovku |
| Čtečka | strom přístupnosti přes CDP (`Accessibility.getFullAXTree`) pro pacienta (Dnes, před jídlem, nemoc) a ordinaci; záznam změn ve všech živých oblastech (MutationObserver) při rozhodnutí a uložení poznámky |
| Kontrast | všechny dvojice barevných rolí z `app/tokens.css` výpočtem (WCAG relativní jas) + axe color-contrast ve všech krocích |
| Zvětšení | prohlížeč 125/150/200 % (ekvivalentní výřezy 1024×576, 853×480, 960×600, 720×450, 960×540), samotné písmo 200 % (1440×900, `html{font-size:200%}`), písmo telefonu 160 % (390×844), reflow 320×568, mezery textu 1.4.12 |
| Cíle dotyku | změřeny všechny viditelné ovládací prvky v každém kroku obou průchodů |
| Pohyb | `document.getAnimations()` po 50 ms během 36 kroků s `reduce` a bez něj |

**Co je v pořádku (krátce):** `lang="cs"`; odkaz „Přeskočit na obsah“; viditelný fokus všude (3 px, petrolejově tmavý `--nf-focus` 15–16 : 1, fialový `--nf-demo-focus` 5,2–5,6 : 1, na plných tlačítkách bílý dovnitř 5,7 : 1); axe ve 312 krocích nenašel **žádný** problém kontrastu textu, názvů tlačítek, štítků polí ani ARIA; pacientské volby mají `aria-pressed`, čipy glukózy jsou skupina „Glukóza v mmol/l“, přepínač „Není mi dobře“ je `switch` se stavem, záložky mají `aria-current="page"`; stupnice a pruh času v cíli mají textovou alternativu (`role="img"` + `aria-label`); poznámka garanta má štítek „Poznámka (nepovinná)“ a stav uložení se hlásí („Neuloženo: uloží se, až pole opustíte.“ → „Uloženo 18:06.“); bezpečnostní zamítnutí se ptá v `role="alert"`; oznámení „Tahle část nefunguje“ je `role="status"`; zásuvky jsou `role="dialog"` `aria-modal="true"`, Tab v nich krouží, Esc zavře a fokus se vrátí na otvírací tlačítko; vysvětlující bublina se otevře Enterem, fokus jde na „×“, Esc vrací fokus zpět; toast drží nejméně 6 s a při fokusu/najetí nezmizí; s `prefers-reduced-motion: reduce` **neběží žádná animace** a posun je okamžitý; `forced-colors` i `prefers-contrast: more` mají vlastní pravidla; mezery textu 1.4.12 nic neořežou; reflow 320 px a písmo telefonu 160 % bez vodorovného posunu; pacientské cíle dotyku na telefonu ≥ 44–48 px, ordinace ≥ 40 px (AA 2.5.8 vyžaduje 24 px); stav ve štítcích nese slovo a ikonu (10 variant štítků s ikonou).

## Souhrn nálezů

| Závažnost | Počet |
|---|---|
| **A** – blokuje použití | **1** |
| **B** – vážně ztěžuje | **6** |
| **C** – drobnost / doporučení | **14** |

Pozn. k opravám: „jen přes tokeny“ jde u vzhledu (barvy, rozměry, výšky panelu, pohyb). Nálezy chování (fokus, živé oblasti, klávesnice) tokenem opravit nejdou – u nich je návrh v kódu prezentační vrstvy a výslovně to uvádím.

---

## A – blokuje použití

### A1 · Při zvětšení prohlížeče 150–200 % zbude pro obrazovku i vyprávění pár řádků (garant na notebooku)

- **Kde:** prezentační vrstva, všechny scény; panel vyprávění + lišta ukázky pod šířkou 1100 CSS px (`D.narrow`, `demo.css` `@media (max-width:1100px)`).
- **Kritérium:** 1.4.4 Změna velikosti textu, 1.4.10 Přeformátování, 2.4.11 Fokus není zakrytý (AA).
- **Důkaz:** pod 1100 CSS px se panel přesune z boku dolů jako list. Viditelná výška obrazovky (mezi lištou a panelem), panel rozbalený:

  | Zařízení · zvětšení | CSS výřez | lišta | panel | **obrazovka** |
  |---|---|---|---|---|
  | 1440×900 · 100 % | 1440×900 | 53 | bok 380 px | 847 px |
  | 1280×720 · 125 % | 1024×576 | 53 | 288 | **227 px** |
  | 1440×900 · 150 % | 960×600 | 53 | 300 | **239 px** |
  | 1280×720 · 150 % | 853×480 | 53 | 240 | **179 px** |
  | 1440×900 · 200 % | 720×450 | **97** (lišta na dva řádky) | 225 | **120 px** |

  Vyprávění kroku má 530–730 px textu a v listu 225–300 px se posouvá uvnitř; při 200 % z něj jsou vidět dva řádky („Krok 2 z 9 / Na obrazovce…“, snímek `k4-a11y/z200/s6.png`), u kroku s rozhodnutím je karta položky celá mimo výřez a vidět je jen „Rozhodněte 1 položku výše ↑“ a šedé Dál (`z200/s7.png`). Při 200 % je **15 ze 46** zastávek fokusu v obrazovce celých pod panelem a 19 dalších zčásti (`obs.js`). Vše je formálně dosažitelné posouváním, ale garant kolem šedesáti, který si písmo zvětšuje zoomem, nemá na čem číst ani obrazovku, ani panel.
- **Návrh opravy:**
  1. tokeny: přidat `--nf-demo-side-min` (šířka, od které je panel po boku; dnes natvrdo 1100 px) a snížit ji na ~640 px s užším panelem `--nf-demo-panel-w: clamp(280px, 34vw, 380px)` – při 200 % na 1440×900 (720 px) zůstane panel po boku v plné výšce a obrazovka má 450 px výšky místo 120 px. Media query proměnnou nepřečte, takže hodnota se v `demo.css` zapíše jednou u tokenu a media query ji opíše (komentář „= --nf-demo-side-min“), jak je to dnes u 1100 px;
  2. lišta: kompaktní varianta (štítek DEMO + „Zbývá N“ + „⋯“), kterou už má telefon, i pro rozvržení s panelem dole – lišta neskočí na dva řádky (97 → 53 px);
  3. pro 2.4.11: `html{scroll-padding-top:var(--barh); scroll-padding-bottom:var(--panelh)}` (proměnné už JS nastavuje), aby prohlížeč fokus posunul nad panel.

---

## B – vážně ztěžuje

### B1 · Zámek obrazovky platí jen pro myš a dotyk; klávesnice mění příběh potichu

- **Kde:** všechny scény příběhu, `main` s `body.pres-locked` (`demo.css` `pointer-events:none`, `D.lockedTap` v `presenter.js`).
- **Kritérium:** 4.1.2 Název, role, hodnota (ovládací prvky se hlásí jako aktivní, i když jsou zamčené), 3.2.2 Při vstupu / 2.4.3 (nečekaná změna kontextu); zásada `15` odst. 15 „Obrazovka je v příběhu zamčená vždy“.
- **Důkaz:** scéna 2 krok 1: fokus na „Kontrola“ v levém pruhu + Enter → stránka `review`, panel „Mimo příběh · Prohlížíte kontrolu“ (`kb-nav.png`); fokus na první zaškrtávátko podmínek zařazení + mezerník → podmínka zaškrtnutá (`falsefalse…` → `truefalse…`), krok příběhu se nezměnil, bublina „Tohle za vás klepne ukázka“ se neukázala. Klávesnicí je v obrazovce 20–57 zastávek (nav, kroky průvodce, zaškrtávátka, volby, Pokračovat), přes které garant musí Tabovat, než se dostane k panelu (DOM pořadí: lišta → obrazovka → panel).
- **Návrh opravy (kód, ne token):** klávesový ekvivalent `D.lockedTap` – při `pres-locked` zachytit `keydown` Enter/mezerník na ovládacím prvku v `main`, zrušit výchozí akci a ukázat tutéž bublinu (je v živé oblasti, čtečka ji přečte); na `main` doplnit `aria-describedby` s větou „Ukázka: obrazovku ovládá panel vpravo/dole“. Pořadí Tab: panel vyprávění dát v DOM hned za lištu (vizuální pozici neměnit), aby Dál byl na druhém Tabu.

### B2 · Zásuvka „Vaše rozhodnutí“ po každém úkonu vrací fokus na „×“ nahoře

- **Kde:** zásuvka z lišty „Ke schválení · zbývá N“ (`NF.slots.drawer` → `renderDrawer` v `app/ui.js`, který po každém překreslení fokusuje `.close`).
- **Kritérium:** 2.4.3 Pořadí fokusu.
- **Důkaz:** fokus na „Nízká glukóza…“ + Enter (rozbalit) → fokus na „×“; „Zamítnout“ + Enter → fokus na „×“ (dotaz „Zamítnutím přestane fungovat ochrana pacientů…“ se objeví v `role="alert"`, ale fokus na „Ano, zamítnout“ nejde); „Ano, zamítnout“ → opět „×“ (`rej.js`). Rozhodnout 28 položek z klávesnice znamená po každém Enteru znovu Tabovat seznamem od začátku; čtečka pokaždé hlásí „Zavřít, tlačítko“ místo výsledku.
- **Návrh opravy (kód):** `renderDrawer` fokusovat „×“ jen při otevření; při překreslení otevřené zásuvky vrátit fokus na prvek se stejným `data-action`+`data-value` (nebo na řádek `.gh` položky, jako to dělá panel), po dotazu na zamítnutí na „Ano, zamítnout“.

### B3 · Fokus se ztrácí na `body` po startu, sbalení panelu a rozhodnutí v souhrnu

- **Kde:** panel vyprávění a souhrn ve finále.
- **Kritérium:** 2.4.3 Pořadí fokusu.
- **Důkaz (`fl.js`, `sum.js`, desktop i telefon):** „Začít ukázku ▶“ + Enter → `BODY`; „Sbalit panel“ / „Rozbalit“ + Enter → `BODY` (tlačítko se překreslí jako jiný prvek); v souhrnu „Rozhodnout“ → fokus „Zavřít“ (správně), „Schválit“ → `BODY`. Garant s klávesnicí nebo čtečkou začíná po každém z těchto kroků znovu od „Přeskočit na obsah“. (Dál a Zpět fokus drží správně – na nadpis kroku, resp. na Zpět.)
- **Návrh opravy (kód):** po startu stejně jako po Dál fokus na nadpis kroku (`h2[tabindex=-1]`); po přepnutí panelu fokus na nové přepínací tlačítko (stejný `data-action="tourToggle"`); v souhrnu po rozhodnutí fokus na řádek položky (tlačítko „Změnit“).

### B4 · Celé vyprávění kroku je živá oblast; čtečka ho čte dvakrát a znovu po každé změně v panelu

- **Kde:** `.tour-body` s `aria-live="polite"` (`presenter.js` ř. 1079), `aside.tour-panel` v režimu Mimo příběh a Konec.
- **Kritérium:** 4.1.3 Stavové zprávy (nadbytečné hlášení zakrývá skutečnou zprávu).
- **Důkaz:** po Dál se fokus přesune na nadpis kroku (čtečka ho přečte) a zároveň se do živé oblasti zapíše celé vyprávění (~800 znaků, dvakrát po sobě kvůli morph překreslení). Po „Schválit“ a po uložení poznámky se živá oblast znovu ohlásí celým textem „Krok 2 z 3 Na obrazovce: … Co se děje …“ – vlastní potvrzení („Uloženo 18:06.“, „schváleno“) v tom zanikne (`dec.js`).
- **Návrh opravy (kód):** `aria-live` z `.tour-body` odebrat (fokus na nadpis kroku stačí); pro hlášky ponechat malé oblasti, které už existují (`.gsaved`, `.tour-status`, `#lock-bubble`), a po rozhodnutí zapsat do `.tour-status` jednu větu „Schváleno: Podmínky zařazení.“.

### B5 · Cíl kroku pulzuje bez konce, dokud garant nepokročí

- **Kde:** `.tour-focus` (`@keyframes tourPulse`, 1,1 s, `infinite`), `.tour-running::before` (`tourBlink`, infinite), `demo.css` ř. 69, 224.
- **Kritérium:** 2.2.2 Pozastavit, zastavit, skrýt (úroveň A): pohyb trvá déle než 5 s souběžně s textem, který se čte, a nedá se zastavit. Vypne ho jen systémové „omezit pohyb“, které starší uživatelé obvykle nemají.
- **Důkaz:** bez `reduce` běží `tourPulse` na cíli kroku po celou dobu čtení (v 36 krocích 127–687 vzorků na animaci); s `reduce` žádná animace.
- **Návrh opravy (token):** v `tokens.css` `--nf-demo-pulse-iter: 3` a v `demo.css` `animation-iteration-count: var(--nf-demo-pulse-iter)` u `.tour-focus` (po ~3 s zůstane jen statický fialový rámeček, který cíl označuje dál); `tourBlink` je jen během přehrávání kroku – v pořádku.

### B6 · Fokus a ovládací prvky schované pod panelem, lištou nebo toastem i na telefonu

- **Kde:** telefon 390×844 a 160 % písma; scény 10 a 21.
- **Kritérium:** 2.4.11 Fokus není zakrytý (minimum, AA); 2.5.8 (axe `target-size`: prvky zčásti zakryté).
- **Důkaz:** při Tabování 3 z 50 (scéna 10: „Návyky dnes…“) a 3 z 57 (scéna 21: „Pokračovat k návrhům →“, „Zařazení a plán“ pod toastem) zastávek celé zakryté; axe na telefonu hlásí zakryté cíle v krocích 3:6 (volič I-VYSOKA ±), 21:4, 21:7, 22:7 (volič dávky snídaně, cíl kroku), 29:2 (Sedí/Nesedí) – viditelný pruh 7–16 px. Toast v ukázce leží nahoře pod lištou a v pěti scénách zakrývá cíl kroku (`m160/s22.png`).
- **Návrh opravy:** stejný `scroll-padding` jako v A1 (token `--panelh`, `--barh`); toast v prezentační vrstvě posadit nad list panelu (`bottom: calc(var(--panelh) + var(--nf-s3))`) místo pod lištu.

---

## C – drobnosti a doporučení

| # | Kde | Kritérium | Důkaz | Návrh |
|---|---|---|---|---|
| C1 | zásuvky Vaše rozhodnutí, Přehled scén, Výsledky garanta | 2.4.6, 4.1.2 | všechny mají `aria-label="Podrobnosti"` | název podle obsahu („Vaše rozhodnutí“, „Přehled scén“, „Výsledky garanta“) |
| C2 | souhrn ve finále | 2.4.6 | 28 tlačítek se stejným názvem „Rozhodnout“ (v tabulce je kontext řádku, v seznamu tlačítek čtečky ne) | `aria-label="Rozhodnout: Podmínky zařazení"` |
| C3 | panel „Jak ukázku ovládat“ (i) | 2.5.8 (projde výjimkou rozestupu) | 22×22 px; lišta 36 px, telefon „Zbývá 28“ 36 px | min. `--nf-tap-desk` (40 px) – garant je senior; telefon `--nf-tap` |
| C4 | ilustrace rad a osa jídla (SVG) | 1.4.4 | popisky „30 min před“, „15 min po“, „v cíli“ mají 10–13 px a s písmem telefonu 160 % nerostou (jsou `aria-hidden`, informace je i v textu pod nimi) | ponechat, ale `--nf-fs-fig-*` nesmí nést jedinou informaci; větu pod obrázkem držet úplnou |
| C5 | report lékaře, scéna 21 krok 4–6 | 1.3.1 (axe heading-order) | `h3` „S radou bývalo níž?“ bez `h2` nad ním | `h2` nebo nadpis sekce |
| C6 | `#nf-explain-hint`, přihlašovací brána | 1.3.1 (axe region, landmark-one-main) | skrytý text mimo orientační body; brána bez `main` | hint do `main`/`body>main`; bránu obalit `<main>` |
| C7 | `#explain-bubble` | 4.1.2 | prázdný `role="dialog"` je v DOM trvale | `hidden`, dokud není otevřený |
| C8 | stupnice „Kam se po něm glukóza dostane“ (ukázka) | 4.1.2 | v `role="img"` jsou fokusovatelné `.goal`, `.win` (`tabindex=0`, vysvětlení) – čtečka na nich nemá název; popis „Bez rady 12 až 12 mmol/l“ | vysvětlitelné prvky mimo `role=img` nebo vysvětlení na celou stupnici; při jedné hodnotě „Bez rady 12 mmol/l“ |
| C9 | barevné role (tokeny) | 1.4.11 | `--nf-over` 2,72 : 1 na bílé, 2,54 na `--nf-bg` (pásmo nad cílem, okraj vybraného „Nesedí“, tečka vynechaného jídla); `--nf-ok` 2,97 na `--nf-bg`; zelená/oranžová vedle sebe 1,17, červená/oranžová 1,58 (pruh času v cíli, stupnice). Zmírněno: všude je slovo, ikona nebo `aria-label` | `--nf-over:#D2632B` (3,78 / 3,52) a `--nf-ok:#268F61` (4,05 / 3,78); mezi segmenty pruhu `--nf-tir-gap: 2px` bílé mezery |
| C10 | „✓ Uloženo“ na zeleném tlačítku, čísla kroků | 1.4.3 | bílý text na `--nf-ok` 3,18 : 1 (tlačítko je v tu chvíli `disabled`, proto jen C) | s úpravou `--nf-ok` z C9 → 4,05 : 1 |
| C11 | stavové texty bez ikony | `15` odst. 15a | „potvrzeno“ (zelený `.state` v návrhu), „– v normě (pod 7 dny)“ | doplnit ikonu jako u štítků |
| C12 | lišta ukázky | 2.4.6, 4.1.2 | název scény se při 150/200 % zkrátí na 147/55 px („Scénář…“); telefon „Zbývá 28“ bez „Ke schválení“; „Rozbalit“ bez `aria-expanded`; „⋯“ bez `aria-haspopup` | `aria-label="Ke schválení · zbývá 28"`; stav panelu v `aria-expanded` |
| C13 | přihlašovací brána | 3.3.1 | chyba „Nesprávný e-mail nebo heslo.“ je `role="alert"`, pole nemají `aria-invalid` ani `aria-describedby` | doplnit obojí |
| C14 | stránka, zamčené tlačítko pacienta, zásuvka | 2.4.2, 3.3.2, 1.3.1 | `<title>` je pořád „NutriFee · maketa“; „Další: co budete jíst →“ je `disabled` a věta „proč“ není svázaná (`aria-describedby`); při otevřené zásuvce je `inert` jen `#app`, panel vyprávění ne (pomáhá `aria-modal`) | titulek podle obrazovky/scény; `aria-describedby` na důvod; `inert` i na `.tour-panel` |

## Výsledky axe (souhrn)

| Běh | Kroků | Porušení |
|---|---|---|
| desktop 1440×900, celý příběh | 156 (+ rozhodnutí, souhrn) | `region` (jen `#nf-explain-hint`), `heading-order` (sc. 21), `target-size` 3× (tlačítko „Náhled“ u sestry zakryté spodní lištou, sc. 5 a dodatek 27) |
| telefon 390×844, celý příběh | 156 | `region`, `heading-order`, `target-size` 8× (zakryté panelem, B6) |
| zásuvky, souhrn, výsledky správce | – | jen `region` |
| přihlašovací brána | – | `landmark-one-main`, `region` |
| produkční sestavení bez `demo/` | – | žádné |

Žádné porušení `color-contrast`, `button-name`, `label`, `aria-*`, `nested-interactive`, `html-has-lang`.

## Podklady

Skripty a snímky: scratchpad `k4-a11y/` (`walkaxe.js` + `out-d/axe.json`, `out-m/axe.json`, `kb.js`, `kb2.js`, `dec.js`, `drw.js`, `rej.js`, `sum.js`, `fl.js`, `obs.js`, `zoom.js`, `zp.js`, `spacing.js`, `mot.js`, `ax.js`, snímky `z200/`, `z150/`, `t200/`, `m160/`, `r320/`).
