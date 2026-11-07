# Předávka G → J (prezentační vrstva SCHEMA 84, 4. 11. 2026)

Co potřebuji mimo své soubory (`demo/` kromě `fixtures.js` a `sync-config.js`, generátor, testy `kontrola3/4/74-panel`, `pravdivost`). Vše ostatní je postavené; viz `09-schema84-prezentace.md`.

## 1. `app/tokens.css` – jeden token (32/03 B1, telefon 390×844)

- `--nf-demo-sheet-h-decide: 60vh` → **`50vh`**. Panel při nabídce položky má zabírat nejvýš polovinu výšky (dnes 506 z 844 px = 60 %); `demo.css` ho čte jen přes token (`.tour-panel.tour-pending{max-height:var(--nf-demo-sheet-h-decide)}`), žádnou hodnotu jsem do `demo.css` nepsal. Kontrola `kontrola74-panel` token jen jmenuje, hodnotu nehlídá. Po změně se štítek rozhodované položky vejde nad panel u všech položek (reveal počítá s výškou panelu).
- Nic jiného v `tokens.css` nepotřebuji: velikosti v liště a odkazech panelu jsem převedl na existující `--nf-tap-sm` (44 px; 32/03 C7).

## 2. `app/ui.js` – akce sestry (rozhodnutí 5 a 6) – pro agenta P

- Krok „Sestra: hmotnost pro kontrolu“ (scéna 22) nastavuje hmotnost přes `fn: NF.setWeight(S, 'sestra', D.WEIGHT_REVIEW.kg, …)` (jako HbA1c), ne klepnutím, protože `nurseWeightSet` / `nurseWeightStep` v `ui.js` zatím nejsou (06 odd. 1). Krok „Sestra: zdravotní stav“ klepe `[data-action="nurseHealth"][data-value="no"]` – v `ui.js` také chybí; v Node i v prohlížeči krok proběhl (akce je zřejmě zachycena jádrem), ale po doplnění `ui.js` ověřit, že `nurseHealth` nastaví `S.review.nurse`. Až budou akce v `ui.js`, lze krok hmotnosti přepnout na klepnutí do mřížky (`[data-action="nurseWeightSet"][data-value="90"]`).

## 3. Hlavní test `nutrifee-rozhodovaci-maketa.test.cjs` – očekávání, která se mění

- Úvod: věta „Sledování hlavní části trvá asi 15 minut … celkem 45–60 minut“ je nahrazená „Celá ukázka trvá asi 60 minut … Dá se přerušit a vrátit …“ (rozhodnutí 7). Pokud test hledá „45–60“ nebo „15 minut“, přepsat.
- Patička panelu: `Průběh: Scénář X ze 6 · scéna N z 27 · zbývá asi N minut` (nový přídavek za pozicí).
- Karta položky: `<p class="gco">` ukazuje celé věty „Co schvalujete“ do 60 slov (ne jen první větu); u delšího oddílu končí větou „Celé znění je v průvodci níže.“
- Hláška po načtení ze serveru: „Načteno z vašeho přihlášení: rozhodnutí u N položek a M poznámek.“ (dřív „Načteno N dřívějších rozhodnutí z vašeho přihlášení.“).
- Nápověda „i“: obal `<div class="tour-info-box" role="note">` s `<p class="tour-info-text small">` uvnitř a tlačítky `tourIntro` / `tourInfo`; nová zásuvka `intro` (`NF.slots.drawerLabel('intro') === 'Úvod ukázky'`).
- Zásuvka „Vaše rozhodnutí“: položky z neprošlých scén jako `<div class="gitem gfuture" data-gitem="…">` bez tlačítek, věta „… přijde v dalších scénách“.
- Oznámení „Tahle část nefunguje“ u pacienta (a na úzkém okně) má po první větě `<details class="more off-more"><summary>Zobrazit, co chybí</summary>…`; u lékaře a sestry na širokém okně celý text jako dřív. Atribut `class="off-notice" role="status" data-off="…"` zůstává první.
- `demo/scene-items.js` je přegenerovaný (scéna 22 má 14 kroků: + zdravotní stav, hmotnost, „Jídla dne za období“; scéna 23 má 15 kroků v pořadí snídaně → oběd → bazál; scéna 15 má 3 kroky; scéna 24 má 2 kroky; hlavní linie 159 kroků); `D.itemScene`: D-PRAND `{ ch: 'reviewProposals' }` (štítek má i tabulka jídel dne v kroku 1 – rozhoduje se až u karty), D-CISTA `{ ch: 'reviewProposals', step: 2, also: 'reviewSummary' }`, D-POSTUP `step: 8`, R-SKORE `{ ch: 'week', step: 2 }`, I-NEMOC-JIDLO `step: 3`.
- Průvodce `dopadSceny` doplněné o scény, které mění J-ovy nové obrazovky: K-KRITERIA + `reviewSummary` (oznámení u otázky na jiný lék), C-CILE + `reviewConfirm` (cíle v kroku 3), R-NAVYKY + `reviewSummary` (tabulka jídel dne), S-SEMAFOR + `reviewProposals` (vývoj v čase). T3 prochází.

## 4. `15-ZDROJ-PRAVDY-MAKETA.md` odst. 15 – věty k doplnění

- „**Kde se položka nabízí** … `{ ch, step }` … **`{ ch, also }` (SCHEMA 84):** položka se rozhoduje ve své kapitole; když tam po zamítnutí jiné položky její štítek ve výřezu cíle není (mapa `alt`), nabídne se v kapitole `also`, kde je vidět, místo souhrnu naslepo (D-CISTA: bez návrhu k dávce není seznam vyřazených zápisů, značka čistých dat je pod dlaždicemi v kroku 1 kontroly).“
- „Bezpečnostní větev v příběhu nezávisí na radách (odst. 2 bod 3): krok „Druhý případ: menší porce“ míří na pravidlo, ne na blok rad; se zamítnutou R-REAKCE proběhne v režimu note a I-MENE se nabídne tam. Krok „Proč návrh vznikl“ míří na blok „co aplikace pozorovala“ karty ke snídani, ať je to návrh k dávce, nebo karta „Nejdřív rady“; D-PRAND se nabízí tam, D-CISTA ve vlastním kroku u vyřazených zápisů, D-POSTUP až u ověření návrhu k obědu.“
- „Karta položky ukazuje z „Co schvalujete“ celé věty do 60 slov (B3); zásuvka „Vaše rozhodnutí“ položky z neprošlých scén jen jmenuje („uvidíte ve scéně N“), bez tlačítek (B2); patička panelu říká „zbývá asi N minut“ (slova vyprávění zbylých kroků při 200 slovech za minutu + animace podle PACE + rozhodnutí); úvod říká „asi 60 minut, dá se přerušit a vrátit“ (rozhodnutí 7). Vysvětlivky fungují i v panelu a zásuvkách. Oznámení „Tahle část nefunguje“ je v telefonu sbalené na první větu + „Zobrazit, co chybí“ (C3). Souhrn u položky, jejíž krok nabídky se přeskočil, říká, kvůli které zamítnuté položce (B7).“
- Odst. 15 (tempo/poč. kroků): hlavní linie má po SCHEMA 84 **159 kroků** (scéna 15 +1, scéna 22 +3, scéna 23 +1 a nové pořadí, scéna 24 +1), dodatek 21; vyprávění hlavní linie 8 564 slov.

## 5. Co jsem u J viděl a převzal do vyprávění (ověřit proti konečnému stavu `app/`)

- Scéna 22 krok 1: otázka sestry „Začal pacient brát jiný lék na diabetes?“ → „Ne“ (`nurseMeds`, `data-value="no"`).
- Scéna 23: pořadí karet snídaně → oběd → bazál → „Probrat radu“ → „Beze změny (3)“ → řádek „Dávky bez návrhu (1)“ (večeře); poklesy po menší porci u oběda jako varování („poučit pacienta; větev „zvýšit“ neblokují“), lékař oběd ponechá přes „Jiné rozhodnutí“ → „Ponechat beze změny“ (`propOther`, `propDecide …:keep`); bazál bez přednosti („Sestra s pacientem uvedla jídlo pozdě večer a v noci, proto karta nemá přednost“), řádky nocí, „Ranní hodnoty za období“, „Vývoj vrcholů v čase“.
- Scéna 24: krok „Návyky a cíle: beze změny“ (`.habit-opt`, „beze změny“, `revHabit` / `revTarget` / `revDose` se v příběhu neklepou).
- Průvodce: K-KRITERIA (kohorta jen inzulin), D-PRAND (karta k dávce vždy, bod „Pacient rady k jídlu zkoušel“, brána od `odmitnutiMin` nabídek), D-POSTUP (`poklesy_jen_ciste`, volič u každé dávky), S-SEMAFOR (`smer_mmol`, `vyvoj_tydny`), B-HYPO (poklesy po menší porci = varování).
