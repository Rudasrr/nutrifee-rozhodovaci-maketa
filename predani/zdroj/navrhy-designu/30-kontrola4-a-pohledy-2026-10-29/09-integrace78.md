# Integrace SCHEMA 78 (30. 10. 2026)

Spojení tří předávek: `08-predavka-jadro.md`, `08-predavka-ukladani.md`, `08-predavka-prezentace.md`. Nic nepublikováno, nic necommitováno. Testy a prohlížeč běžely na bajtově shodné kopii složky `maketa-rozhodovaci/` na místním disku (`scratchpad/i78`, ověřeno `diff -rq`); na Disku Google trvá celá sada přes hodinu.

## 1. Co integrace udělala

### Požadavky jádra na prezentaci
- `app/ui.js`: akce `doseSet`, `baselineSet`, `exclusion`, `targetPreset`, `nurseCheck`, `nurseMeds`, `reminderTime`, `reminderToggle`, `mealRetroYesterday` (kód z předávky); `wizardGo` na krok 1 chce i potvrzená vylučovací kritéria.
- `app/design.css`: styly nových tříd (`.chips.num-grid`, mřížka dávek 8 sloupců / 5 na telefonu, `.phone-notices`, `.phone-notice` a části, `details.chips-done`, `.scale-compact`, `.path-compact`, `.card.reminders`, `.dose-else`, `.yesterday`, `.readback`, `.dose-origin`, `.nurse-part`, `.nights-missing`) – jen tokeny.
- Příběh (`demo/tour-content.js`): krok „Vylučovací kritéria“ v zařazení; v zaučení „Připomínky v telefonu“ (časy 7:00 · 12:00 · 18:00 · 21:00 jako v kulisách) a „Upozornění v senzoru a dávka jinde“ (body `alerts`, `doseElsewhere`, `reminders`); v dodatku zaučení jsou tyto body kulisa (`demo/fixtures.js`, setup scény – dodatek má dál nejvýš 3 kroky); **oznámení telefonu** (rozhodnutí 4) jako první krok scény „otevřel aplikaci až v 10:15“ (`NF.screens.phoneNotice` nad obrazovkou pacienta přes `pageOverride` prezentace, `S.demoNotice`, další krok ho uklidí); ve scéně „Kontrola, krok 1“ dva kroky sestry před exportem (léky „Beze změny“, tři body postupu „Sedí“, rozhodnutí 7); v novém plánu krok „Nová dávka souhlasí s tím, co řekl lékař“ (06 B6) a v posledním kroku `doseReadback` jako v kulisách; scénář 5 podle rozhodnutí 11 („Návrh vypnout hned“, výrobce provádí); citované texty podle nových obrazovek („Aplikace vám mezi kontrolami nic neposílá a nic po vás nežádá.“, „…uvidíte, jak to dopadlo.“, „Navrhnout vypnutí položky“). `D.itemScene['P-LEKAR']` na novou větu.
- `demo/intro.js`: „Lékař dostane na kontrole souhrn a návrhy, ověří je s pacientem a rozhodne.“
- `demo/explain.js`: dlaždice času v cíli a pod cílem čtou cíle pacienta (`NF.targets(S).tirGoal`, `.tbrGoal`); `tir_zelena`/`tbr_max` se nečtou.
- Čísla 239→240 atd.: vyprávění je nemá natvrdo (počítá je z dat), nic k úpravě.
- `demo/guide.js` (`dopadSceny`): R-POKYNY a I-MENE + `impact`, I-HYPO a I-VYSOKA + `afterBolus` – zamítnutí tam mění text rad a pravidel díky `NF.dropRuleRefs` / `NF.instrTextOf` (jádro, 02 B6); T3 to vyžaduje.

### Požadavky ukládání na prezentaci
- Lišta a řádky stavu čtou `D.sync.status()` (`saved`, `rejected`, `pending`, `lastErr`); odmítnuté zápisy „Server odmítl N zápisy“ + `syncRetryDead`. Řádek pod poznámkou a hláška po rozhodnutí podle `D.sync.state` / `stateText`. Poděkování a konec ukázky podle `allSaved`. `D.sync.onChange` překreslí (bez kroku v běhu).
- `D.garantMerge(list, { replace, other, login })`: obnova nemění „Ukázka skončila“; hláška „Načtena rozhodnutí z jiného okna nebo zařízení (N)“; `replace` pro reset z jiného zařízení.
- Dvě karty: deník se do úložiště zapisuje jako sjednocení podle `sid` (v paměti ho doplní až `garantMerge`, který přehraje scénu); posluchač `storage` na deník a koncepty.
- M8 v historii karty: poznámka a rozhodnutí se stejným textem do 10 s = jeden záznam.

### Testy
- Do hlavní sady přidány `kontrola4-obsah.test.cjs`, `kontrola4-panel.test.cjs`, `ukladani.test.cjs`.
- Upraveno jen pro záměrné změny: hlavní test (registr 42 / 14 provozních, „Pravidla aplikace bez schvalování (14)“, krok 2 zařazení je čtvrtý, vylučovací kritéria v testu zařazení, „Vše sedí“ nepřepíná body sestry ×2, kroky sestry před exportem, nové jídlo „jako řízek“ bez doplňku ×2, „Spočítáno ze N zápisů, s dalšími se upřesní“, `min-width:641px` u souhrnu, semafor z cílů pacienta ×2, stav ukládání kreslí presenter ×2, odhlášení garanta (C5), „Děkujeme…“ podle stavu fronty ×3, `aria-label` u „Změnit/Rozhodnout“, „Zamítnuto: „…“.“, „Schváleno: „…“. Část zase funguje.“, „Uloženo HH:MM v tomto prohlížeči“); `faze2-jadro` A15 (nové znění podobného jídla); `faze2-pribeh` C10 (kroky sestry před exportem); `kontrola74-obsah` B16 (věta rozhodnutí 10); `kontrola74-panel` B1 (poděkování podle fronty).
- `NF.SCHEMA = 78`, `?v=78` (22×), `data-version="78"` v katalogu.
- `demo/scene-items.js` přegenerovaná nad konečným stavem (všech 28 klinických položek má místo v hlavní linii; I-VYSOKA ve scéně 10 krok 9, S-SEMAFOR 21/4, S-SILNA 21/7).

### Dokumenty
- `15`: odst. 12 nový odstavec „Otisk znění a export pro správce“ (rozhodnutí 1 a 2, export pro správce zpět), odst. 14 sjednocen („export JSON stopy zrušen…; export rozhodnutí viz odst. 12“), odst. 16 stavový odstavec SCHEMA 78.
- `10-predani-programatorovi.md`: otisk se počítá po kódových jednotkách UTF-16 (`charCodeAt`), ne po bajtech UTF-8; meze, pokyny I-* a návyky nese `fpCat` ze `sync.js` (jádro beze změny, jak určil koordinátor).

## 2. Ověření

- **Celá sada** (`node nutrifee-rozhodovaci-maketa.test.cjs`, celý výstup přečten): **129 prošlo, 0 selhalo**; podsady faze2-jadro 32/0, faze2-pribeh 15/0, pravdivost T1–T4 4/0, kontrola74-obsah 19/0, kontrola2-obsah 18/0, kontrola74-panel 7/0, kontrola3-obsah 14/0, kontrola3-panel 9/0, kontrola4-obsah 16/0, kontrola4-panel 9/0, ukladani 18/0, robustnost 14/0. Po doplnění stavového odstavce do 15 znovu kontrola2-obsah 18/0 a testy hlavní sady se „15“ 5/0.
- **Prohlížeč** (Chrome for Testing 1243, Playwright z `scratchpad/k4-a11y/node_modules`, falešný Supabase): celý příběh tlačítkem Dál včetně dodatku a rozhodnutí v panelu –
  - 1440×900 bez animací, vše schváleno: 164 kroků, scéna 31/31, 0 chyb konzole, 0 problémů (vodorovný posun, zástupky, zaseknutí);
  - 390×844 dotyk **s animacemi**, zamítnuto R-POKYNY, B-HYPO, D-POSTUP: 161 kroků, 0 / 0;
  - 360×740 dotyk, zamítnuto R-REAKCE, D-CISTA, I-MENE, R-NAVYKY: 148 kroků, 0 / 0;
  - 720×450 (= 1440×900 při 200 %), zamítnuto C-CILE, R-PORCE, D-BAZAL, I-HYPO: 161 kroků, 0 / 0; panel po boku 280×361 px, lišta 57 px na jednom řádku (dřív list 225 px a obrazovka 120 px); 853×480 a 960×600 (150 %) totéž;
  - **výpadek serveru** (POST 503) na 360 a 1440: lišta „Neuloženo: N“ i na telefonu, poděkování „Děkujeme. Rozhodnutí zatím nejsou odeslaná“, „Ukázka skončila“ bez „můžete okno zavřít“; po obnovení sítě se fronta odeslala (server má obě rozhodnutí) a stav je „uloženo“;
  - **dvě karty** téhož prohlížeče offline: karta A po rozhodnutí v kartě B má obě rozhodnutí v deníku i v úložišti a hlášku „Načtena rozhodnutí z jiného okna nebo zařízení (1)“; `beforeunload` s neodeslanými se ptá;
  - **správce na telefonu** 390×844: „⋯“ → Výsledky garanta, dialog „Výsledky garanta“, bez vodorovného posunu, 0 chyb.
- Žádný prázdný soubor v `app/`, `demo/`, `design-system/`; HTML 2,4 kB. Skutečná jména (výrobci senzorů a inzulinů, osoby, instituce, „hermelín“): nic, jen v kontrolách testů.

## 3. Zbývá / pro vlastníka
- Kosm. 9 z 01 (360×740: list panelu vs. cíl kroku nad lištou) beze změny chování; panel zůstává podle M9 a M7 z dřívějších kontrol.
- Body pro vlastníka z předávky jádra (06 B15 dokument 14, 06 C3/C4 šablony rad, S-DAVKA jako klinická položka?, 02 C8) a ukládání (SQL v `05-supabase…` odst. 0 spustit v Supabase).
- Publikace: před commitem znovu `git log origin/main`, rsync s `--exclude /index.html --exclude /.gitignore`, značka `schema-78` (rozhodnutí 1).

## 4. Výsledek celé sady
129 prošlo, 0 selhalo (odst. 2).
