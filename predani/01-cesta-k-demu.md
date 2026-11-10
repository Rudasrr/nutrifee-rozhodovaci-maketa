# Cesta k prvnímu demu

*Vlastník rozhodl 9. a 10. 11. 2026, že první demo se postaví nad převzatým jádrem makety, ne přepisem. Stav makety je SCHEMA 89. Pokyny pro AI asistenta jsou v [`AGENTS.md`](AGENTS.md). Atlasy obrazovek ([`10-atlas-pacient.md`](10-atlas-pacient.md), [`20-atlas-ordinace.md`](20-atlas-ordinace.md)) slouží jako příručka k jednotlivým obrazovkám. Plán ostré aplikace v 17 etapách je v [`00-postup.md`](00-postup.md) a pro demo ho nepotřebujete.*

## Co je první demo

Demo má **vypadat a chovat se jako ostrá aplikace**. Lékaři a garant ho dostanou k vyzkoušení a používají ho sami, bez prezentujícího a bez vysvětlování.

- **Lékař a sestra** pracují ve webové aplikaci na počítači.
- **Pacient** má webovou aplikaci s ikonou na ploše (PWA). Běží na iPhonu i na Androidu: otevře odkaz a dá „přidat na plochu“. Z obchodu s aplikacemi se zatím neinstaluje.
- **Přihlášení** probíhá e-mailem a heslem. Účty zakládá vlastník. Pacient vidí jen sebe, lékař a sestra své pacienty.
- **Čas běží skutečně**, v českém časovém pásmu (Europe/Prague). Nic se nepřeskakuje.
- **Pacienti:** ordinace má seznam pacientů. V demu jsou připravení 2–3 syntetičtí pacienti s historií, která končí dnes, takže lékař hned vidí kontrolu s daty. Lékař může zařadit i nového pacienta od začátku.
- **Data jsou jen syntetická.** Stav pacienta se sdílí přes server mezi telefonem a ordinací.
- **Pravidla jsou schválená.** Všechny položky registru působí jako schválené. Schvalovací registr garanta ani nic z prezentační vrstvy makety se v demu neukazuje. Lékař vidí u pravidel štítek „✓ schváleno“, pacient štítky nevidí.

Klinická logika je tentýž kód jako v maketě.

## Co převzít beze změny

| Co | Odkud | Poznámka |
|---|---|---|
| jádro celé | `app/` (`core.js`, `screens.js`, `screens-clinic.js`, `ui.js`, `icons.js`) | doména, obrazovky i akce |
| katalogy | `app/data/` (`registry.js`, `catalogs.js`, `foods.js`) | 42 položek registru, 7 pravidel, 171 jídel |
| vzhled | `app/tokens.css`, `app/design.css`, `app/fonts/` | jediný zdroj hodnot vzhledu je `tokens.css`; viz [`40-design-system.md`](40-design-system.md) |
| katalog komponent | `design-system/` | bez sekce „Prezentační vrstva“ a bez `demo/demo.css` |
| data modelového pacienta | `demo/fixtures.js` | jediný soubor z `demo/`, slouží jako zdroj historie syntetických pacientů: 27 kapitol (`D.chapters`), funkce `D.play(index)` |
| testy | `rychle.test.cjs`, `zlate-vystupy.test.cjs`, `zlate-vystupy/` | zábradlí nového repozitáře (viz níže) |

Od SCHEMA 89 jádro obsahuje i to, co dřív leželo v obrazovkách nebo v prezentační vrstvě:
- volbu větve návrhu (`NF.proposalBranch`),
- výchozí text zamítnuté části (`NF.OFF_TEXT`),
- otisk položky nezávislý na `demo/`,
- výběr otázek a rady v přehledu před kontrolou (`NF.previewQuestions`, `NF.previewBest`).

Celý příběh až po vydání druhého plánu proto jde přehrát jen s `app/core.js`, `app/data/` a `demo/fixtures.js`, bez prohlížeče.

## Co postavit

1. **Přihlášení a role.** E-mail a heslo ve službě, kterou zvolíte pro server. Každý účet nese roli (pacient, sestra, lékař) a u pacienta odkaz na jeho záznam. Vlastník zakládá účty sám, proto pro to připravte jednoduchý postup, například pozvánku e-mailem nebo krátký návod v administraci služby. Roli dnes jádro čte z adresy (`?role=pacient|lekar|sestra`). Demo ji nastaví z přihlášeného účtu.
2. **Server a synchronizační vrstva mimo jádro.** Kde a jak server poběží, **zvolíte vy**. Požadavky:
   - přihlášení,
   - jeden záznam stavu na pacienta (celý `S` jako JSON),
   - společný registr,
   - přístup jen podle role,
   - jen syntetická data.

   Vrstvu připojíte přes `NF.configure({ now, storage: { get(key), set(key, value) } })`:
   - `get` vrací řetězec nebo `null`,
   - `set` při chybě vyhodí výjimku.

   Jádro volá úložiště synchronně. Vrstva proto drží poslední stav v paměti a na server ho odešle v háčku `NF.onChange(fn)`. Ten se volá po každém `NF.save`, tedy po každé akci, s argumenty `fn(S, { saved, key })`. Když se uložení nepovede, `NF.save` vrátí `false` a nastaví `NF.storageOK = false`. **Jádro síť nevolá.** Síť volá jen vrstva a test „Jádro bez sítě“ musí zůstat zelený.
3. **Souběh zařízení.** Platí, že poslední zápis vyhrává. Když se stav pacienta změní na jiném zařízení, aplikace sama načte novou verzi a krátce to oznámí. Například pacient s otevřenou aplikací uvidí „Lékař vydal nový plán“, jinak „Data se aktualizovala“. Kontrolujte to po návratu do aplikace (událost viditelnosti stránky) a v krátkém intervalu, dokud je aplikace otevřená. Nic se nesmí potichu přepsat.
4. **Společný registr.** V maketě je registr uvnitř stavu pacienta (`S.registry`). V demu je jeden registr pro všechny pacienty a na serveru je uložený zvlášť.
   - Vrstva ho při načtení vloží do stavu pacienta.
   - Stav všech klinických položek je „schváleno“.
   - Plán pacienta si pamatuje verzi registru, podle které vznikl (`version` a otisk položek ve stopě už jádro zapisuje).
   - Jádro se kvůli tomu nemění.
5. **Seznam pacientů v ordinaci.** Je to nová obrazovka mimo jádro. Ukazuje jméno, stav plánu a datum příští kontroly a z ní se otevře stav vybraného pacienta. Dál pokračují obrazovky jádra.
6. **Syntetičtí pacienti s historií do dneška.** Stav vznikne přehráním příběhu do vhodné kapitoly (`D.play(index)`, například těsně před kontrolou). Potom se **všechna data ve stavu posunou o stejný počet dní**, aby historie končila dnes: zápisy, plány, stopa a `S.clock`. Hodiny jádra se nastaví na skutečný čas (`NF.configure({ now: () => new Date() })`).
   - Posun napište jako jednu funkci s testem, že souhrny kontroly dávají po posunu stejná čísla jako zlaté výstupy (`kontrola.json`).
   - Pro 2–3 pacienty použijte různé kapitoly: jeden před kontrolou, jeden uprostřed plánu, jeden těsně po zařazení.
   - Jména pacientů jsou smyšlená.
7. **Obnova dat při nové verzi.** Data jsou syntetická, takže po nové verzi aplikace smí demo připravené pacienty vrátit do výchozího stavu. Rozehraná data se nepřevádějí.
8. **PWA obal.** Soubor manifestu obsahuje:
   - název a krátký název,
   - ikonu ve dvou velikostech,
   - `display: standalone`,
   - barvu z `--nf-primary`.

   Service worker slouží jen pro instalaci a statické soubory, data se do mezipaměti neukládají. Ověřte na skutečném iPhonu i Androidu.

## Co vynechat

- Z postupu ostré aplikace etapy **12** (převodníky skutečných exportů; stačí převodník makety `NF.parseSensorCsv`), **15** (podpis garanta) a **16** (provoz) a celý kontrolní seznam v `00-postup.md` odd. 4. Z etapy **11** (server) se bere jen to, co je v bodech 1–3 výše.
- Schvalovací registr garanta, obrazovky „Výsledky garanta“ a vše z `demo/` kromě `fixtures.js`: vyprávění, panel prezentujícího, průvodce položkami, přeskakování kapitol, přihlášení a ukládání makety.
- Přepis jádra, převod 393 testů do jiného jazyka a nový designový systém.
- Instalaci z App Store a Google Play. Aplikaci jde do obchodů zabalit později.

## Jak maketu spustit lokálně bez přihlášení

Publikovaná ukázka i lokální soubor `nutrifee-rozhodovaci-maketa.html` se bez účtu zastaví na přihlášení. Obejde se to dvěma kopiemi HTML ve složce makety (ověřeno 9. 11. 2026):

- **Celý příběh s vyprávěním** (jen pro pochopení, do dema nepatří): v kopii HTML smažte čtyři řádky `<script src="demo/sync-config.js…">`, `demo/auth.js`, `demo/sync.js` a `demo/results.js`. Příběh se spustí od úvodu a prochází se tlačítkem **Další ▶**. Tlačítko **Přehled scén** v liště skočí na kteroukoli scénu.
- **Produkční sestavení (jen jádro):** smažte řádek `<link … href="demo/demo.css…">` a všechny řádky `<script src="demo/…">`. Komentář nad nimi nechte celý, jinak zůstane neuzavřený. Pak otevřete `…?role=lekar`, `…?role=sestra` nebo adresu bez parametru (pacient). Aplikace začíná bez plánu zařazením.

Ve složce makety spusťte libovolný statický server, aby se stav držel i po obnovení stránky.

## Testy jako zábradlí

- **Rychlá sada** `node rychle.test.cjs` (asi 40 s, 14 testů) po každé změně. Ověřuje hodiny, úložiště a háček jádra, registr, zásady 1 a 3 a běh bez sítě a DOM. Souběžně pouští zlaté výstupy, P1–P11 a tokeny.
- **Zlaté výstupy** `node zlate-vystupy.test.cjs` (test leží v kořeni repozitáře, 9 testů) porovnávají referenční výstupy jádra z přehrání všech 32 scén. Výstupy jsou v pěti souborech JSON ve složce `zlate-vystupy/` (`otisky`, `pribeh`, `kontrola`, `rady`, `stopa`), popis je v `zlate-vystupy/README.md`. Přegenerovat je (`node zlate-vystupy/generuj.cjs`) smíte jen při změně chování, kterou schválil vlastník.
- **Celá sada** `node nutrifee-rozhodovaci-maketa.test.cjs` (podle stroje asi 15–30 minut, 144 řádků OK) pusťte před předáním dema a po každé změně v `app/`. Kontrolujte celý výstup, tedy i řádky `FAIL`.

## Plán po dnech

| Den | Práce | Hotovo, když |
|---|---|---|
| 1 | Nový repozitář: převzaté soubory (tabulka výše), `AGENTS.md` v kořeni, produkční sestavení jako `index.html`. | V novém repozitáři projde rychlá sada i zlaté výstupy. `?role=lekar` ukáže „Nový pacient“ a lékař projde zařazení až po vydání plánu. |
| 2 | Volba serveru, přihlášení e-mailem a heslem, role z účtu, postup pro zakládání účtů vlastníkem. | Vlastník podle návodu založí lékaře, sestru a pacienta. Každý po přihlášení vidí jen svou roli. |
| 3 | Synchronizační vrstva, společný registr se schválenými položkami, souběh s oznámením. | Lékař vydá plán na počítači a pacient ho na telefonu uvidí s oznámením, aniž by aplikaci zavíral. Test „Jádro bez sítě“ projde. |
| 4 | Seznam pacientů v ordinaci, syntetičtí pacienti s historií do dneška, obnova dat při nové verzi. | Lékař vidí 2–3 pacienty a u pacienta před kontrolou dostane tatáž čísla jako zlaté výstupy, jen s dnešními daty. |
| 5 | PWA obal, zkouška na skutečném iPhonu a Androidu. | Aplikaci jde na obou telefonech přidat na plochu a otevře se na celou obrazovku. |
| 6 | Průchod celým cyklem jako lékař, sestra a pacient. K tomu písmo 160 %, nejužší telefon, kontrola jmen a celá sada. | Cyklus zařazení → zápisy → kontrola → nový plán proběhne bez chyby a bez vysvětlování. Celá sada makety je bez `FAIL`. |

## První úkol prvního dne

1. Naklonujte repozitář makety a ve složce makety spusťte rychlou sadu a zlaté výstupy. Oba běhy musí projít. Pokud neprojdou, zastavte se a napište vlastníkovi.
2. Spusťte celý příběh lokálně bez přihlášení (postup výše) a projděte tlačítkem **Další ▶** aspoň scénáře 1 a 2. Zabere to asi 20 minut a ukáže vám, co má demo umět.
3. Založte repozitář dema. Zkopírujte do něj soubory z tabulky „Co převzít“, `AGENTS.md` dejte do kořene a z HTML makety udělejte `index.html` produkčního sestavení.
4. **Hotovo, když** v novém repozitáři projde rychlá sada i zlaté výstupy proti zkopírovanému jádru. Zároveň v témže prohlížeči proběhne zařazení (`index.html?role=lekar`), zaučení (`?role=sestra`) a převzetí plánu (`index.html`, pacient).

## Rozhodnutí vlastníka k demu

**9. 11. 2026:**
- Jádro se pro demo převezme jako kód. O přepisu pro ostrou aplikaci se rozhodne po demu.
- Data se sdílejí přes server, jen syntetická. Vrstva je mimo jádro a výpočty běží jádrem bez sítě.

**10. 11. 2026:**
- Demo vypadá jako ostrá aplikace pro lékaře a sestru (web) a pacienta (iPhone i Android jako PWA).
- Ukazuje se lékařům a garantovi k vyzkoušení na vlastních zařízeních.
- Pravidla jsou schválená a registr garanta se neukazuje.
- Ordinace má seznam pacientů, v demu 2–3 syntetické.
- Registr je jeden, společný pro všechny pacienty.
- Čas běží skutečně, v českém pásmu, a historie připravených pacientů končí dnes.
- Přihlášení je e-mailem a heslem a účty zakládá vlastník.
- Server zvolí programátor.
- Data se po nové verzi smí obnovit.
- Při změně na jiném zařízení se nová verze sama načte s krátkým oznámením.

Ostatní:
- Otisk ve stopě je od SCHEMA 89 otisk jádra `NF.itemFingerprint(položka)`.
- Referenční výsledek je celá sada bez `FAIL` a nezměněné zlaté výstupy. Čísla 144 a 393 vysvětluje [`30-prilohy.md`](30-prilohy.md) odd. 5.1.
- Zastaralá čísla v `15` odst. 16–17 jsou deník a platí chování makety.

Pokud narazíte na otázku, kterou tento dokument ani atlas neřeší, zeptejte se vlastníka. Do odpovědi platí chování makety.
