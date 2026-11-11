# Cesta k prvnímu demu

*Vlastník rozhodl 9. a 10. 11. 2026, že první demo se postaví nad převzatým jádrem makety, ne přepisem. Stav makety je SCHEMA 90. Pokyny pro AI asistenta jsou v [`AGENTS.md`](AGENTS.md). Atlasy obrazovek ([`10-atlas-pacient.md`](10-atlas-pacient.md), [`20-atlas-ordinace.md`](20-atlas-ordinace.md)) slouží jako příručka k jednotlivým obrazovkám. Plán ostré aplikace v 17 etapách je v [`00-postup.md`](00-postup.md) a pro demo ho nepotřebujete.*

> **Stav 10. 11. 2026 večer:** Maketa na odkazu je **SCHEMA 90**. Obsahuje opravy z poslední kontroly (sedm nezávislých prověrek, `zdroj/navrhy-designu/36-posledni-kontrola/00-souhrn.md`) a 12 rozhodnutí vlastníka (`zdroj/navrhy-designu/36-posledni-kontrola/05-rozhodnuti.md`). Podrobnosti jádra a API pro synchronizaci jsou v `zdroj/navrhy-designu/36-posledni-kontrola/08-schema90-jadro.md`. Všech 87 snímků v atlasu je pořízených ze SCHEMA 90 (10. 11. 2026 večer). Texty popisů atlasu se doplňují; kde se text liší od snímku nebo makety, platí maketa.

## Co je první demo

Demo má **vypadat a chovat se jako ostrá aplikace**. Lékaři a garant ho dostanou k vyzkoušení a používají ho sami, bez prezentujícího a bez vysvětlování.

- **Lékař a sestra** pracují ve webové aplikaci na počítači.
- **Pacient** má webovou aplikaci s ikonou na ploše (PWA). Běží na iPhonu i na Androidu: otevře odkaz a dá „přidat na plochu“. Z obchodu s aplikacemi se zatím neinstaluje.
- **Přihlášení** probíhá e-mailem a heslem. Účty zakládá vlastník. Pacient vidí jen sebe, lékař a sestra své pacienty.
- **Čas běží skutečně**, v českém časovém pásmu (Europe/Prague). Nic se nepřeskakuje.
- **Pacienti:** ordinace má seznam pacientů. V demu jsou připravení 2–3 syntetičtí pacienti s historií, která končí dnes, takže lékař hned vidí kontrolu s daty. Lékař může zařadit i nového pacienta od začátku.
- **Data jsou jen syntetická.** Stav pacienta se sdílí přes server mezi telefonem a ordinací.
- **Štítek demo (vlastník 11. 11. 2026).** Vzhled je jako u ostré aplikace, ale na každé obrazovce je nenápadný trvalý štítek „Demo · jen syntetická data“ a v zápatí věta, že aplikace není určena pro léčbu. Při zařazení nového pacienta aplikace upozorní, že se smí zadávat jen smyšlené údaje. Neschválený zdravotnický software se nesmí použít u skutečného pacienta.
- **Pravidla jsou schválená.** Všechny položky registru působí jako schválené. Schvalovací registr garanta ani nic z prezentační vrstvy makety se v demu neukazuje. Lékař vidí u pravidel štítek „✓ schváleno“, pacient štítky nevidí.

Klinická logika je tentýž kód jako v maketě.

## Co převzít beze změny

| Co | Odkud | Poznámka |
|---|---|---|
| jádro celé | `app/` (`core.js`, `screens.js`, `screens-clinic.js`, `ui.js`, `icons.js`) | doména, obrazovky i akce |
| katalogy | `app/data/` (`registry.js`, `catalogs.js`, `foods.js`) | 43 položek registru, 8 pravidel, 171 jídel |
| vzhled | `app/tokens.css`, `app/design.css`, `app/fonts/` | jediný zdroj hodnot vzhledu je `tokens.css`; viz [`40-design-system.md`](40-design-system.md) |
| katalog komponent | `design-system/` | bez sekce „Prezentační vrstva“ a bez `demo/demo.css` |
| data modelového pacienta | `demo/fixtures.js` | jediný soubor z `demo/`, slouží jako zdroj historie syntetických pacientů: 27 kapitol (`D.chapters`), funkce `D.play(index)` |
| testy | `rychle.test.cjs`, `zlate-vystupy.test.cjs`, `schema90-jadro.test.cjs`, `zlate-vystupy/` | zábradlí nového repozitáře (viz níže) |

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
   - jeden záznam stavu na pacienta (doména stavu jako JSON, `NF.domainJson(S)`),
   - společný registr,
   - přístup jen podle role,
   - jen syntetická data.

   Vrstvu připojíte přes `NF.configure({ now, storage: { get(key), set(key, value) } })`:
   - `get` vrací řetězec nebo `null`,
   - `set` při chybě vyhodí výjimku.

   Jádro volá úložiště synchronně. Vrstva proto drží poslední stav v paměti a na server ho odešle v háčku `NF.onChange(fn)`. Od SCHEMA 90 platí:
   - Háček se volá **jen po akci uživatele**, ne při minutovém tiku, psaní do pole, načtení ani migraci: `fn(S, { saved, key, action, domainChanged, rev, schema, reset })`. Na server posílejte jen při `domainChanged`.
   - Posílá se **jen doména** (`NF.domainOf(S)` / `NF.domainJson(S)`). Stav zobrazení (role, stránka, rozpracovaný zápis, oznámení; `NF.VIEW_KEYS`, `NF.VIEW_PATHS`) zůstává v zařízení, takže lékař nepřepíše pacientovi rozpracovaný zápis.
   - Vzdálenou verzi spojte funkcí `NF.mergeRemote(místní, vzdálený)` → `{ ok, state, reason }` (`newer` = vzdálený je z novější verze, klient se musí obnovit; `stale`, `older`, `shape`) a výsledek nastavte `NF.setState(state)`.
   - `S.rev` je pořadí doménové verze. Server zapisuje podmíněně (jen když `rev` na serveru odpovídá verzi, ze které klient vyšel); při konfliktu klient načte, spojí a akci zopakuje. Server odmítne nižší `schema`.
   - ID zápisů (`E-n`, `W-n`, `Q-n`) počítá každé zařízení zvlášť; pro souběh dvou zápisů jim vrstva přidá předponu zařízení.
   - Pád vykreslení ani starší verze aplikace nikdy nepřepíšou data čistým stavem (`NF.readOnly`, `NF.backup`).

   Když se uložení nepovede, `NF.save` vrátí `false` a nastaví `NF.storageOK = false`. **Jádro síť nevolá.** Síť volá jen vrstva a test „Jádro bez sítě“ musí zůstat zelený. Hodiny jádra běží v českém čase (`NF.TZ`, `NF.configure({ now, storage, zone })`).
3. **Souběh zařízení.** Zápis je podmíněný podle `S.rev` (bod 2). Když se stav pacienta změní na jiném zařízení, aplikace sama načte novou verzi a krátce to oznámí. Například pacient s otevřenou aplikací uvidí „Lékař vydal nový plán“, jinak „Data se aktualizovala“. Kontrolujte to po návratu do aplikace (událost viditelnosti stránky) a v krátkém intervalu, dokud je aplikace otevřená. Nic se nesmí potichu přepsat.
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
2. **Proklikejte celou maketu od začátku do konce.** Spusťte celý příběh lokálně bez přihlášení (postup výše). Tlačítkem **Další ▶** projděte všechny scénáře až po závěrečný souhrn, tedy zařazení, zaučení, týdny zápisů, nízkou glukózu, nemoc, kontrolu, nový plán a stopu. Zabere to asi 1–2 hodiny a je to nejrychlejší způsob, jak pochopit, co má demo umět a proč.
   - Nepotřebujete žádný účet. Maketu nespouštějte pod účtem garanta ani správce.
   - Panel ukázky nabízí u pravidel „Schválit / Zamítnout“. To je práce garanta, vy nic neschvalujete a panel si nevšímejte. Programujete tak, **jako by bylo vše schválené**. Lokálně se stejně nic nikam neukládá.
   - Při procházení si zapisujte otázky. Co nevysvětlí atlas, pošlete vlastníkovi najednou.
3. Založte repozitář dema. Zkopírujte do něj soubory z tabulky „Co převzít“, `AGENTS.md` dejte do kořene a z HTML makety udělejte `index.html` produkčního sestavení.
4. **Hotovo, když** v novém repozitáři projde rychlá sada i zlaté výstupy proti zkopírovanému jádru. Zároveň v témže prohlížeči proběhne zařazení (`index.html?role=lekar`), zaučení (`?role=sestra`) a převzetí plánu (`index.html`, pacient).

## Až garant pošle svůj výsledek

Garant maketu prochází zvlášť a u každé klinické položky rozhodne Schválit nebo Zamítnout, případně s poznámkou. Až skončí, vlastník vám pošle export jeho rozhodnutí (JSON nebo CSV z „Výsledků garanta“) a k němu své rozhodnutí, co s tím. Formát exportu popisuje `zdroj/navrhy-designu/30-kontrola4-a-pohledy-2026-10-29/10-predani-programatorovi.md` (odst. 6).

Postup:
1. **Schválené položky** zůstávají, jak jsou. Nic se nemění.
2. **Zamítnutá položka nebo položka s poznámkou** je podnět pro vlastníka, ne pro vás. Vlastník rozhodne, jestli se položka upraví, vypne, nebo zůstane, a co pacient uvidí. Teprve pak:
   - Změna znění nebo parametru se udělá **v maketě** (registr `app/data/registry.js`, jádro). Projde její testy a zlaté výstupy se přegenerují. Do dema ji převezmete jako novou verzi jádra.
   - Účinek vypnuté položky jádro už umí. U každé z 28 klinických položek ho popisuje pole `ucinek` v `demo/guide.js` a hlídají ho testy `kontrola2-obsah.test.cjs` a `pravdivost.test.cjs`. V demu stačí nastavit stav položky ve společném registru. Kde položka působí, najdete v jádře hledáním `NF.usable(S, 'ID')` (viz [`30-prilohy.md`](30-prilohy.md) odd. 2).
3. Po převzetí pusťte rychlou sadu, zlaté výstupy a celou sadu. V demu pak zkontrolujte obrazovky, kde položka působí. Najdete je v atlasu podle ID položky.

Dokud garant nerozhodne, programujete podle makety tak, jako by bylo vše schválené.

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

**11. 11. 2026, po poslední kontrole** (podrobně `zdroj/navrhy-designu/36-posledni-kontrola/05-rozhodnuti.md`):
- demo má nenápadný trvalý štítek „Demo · jen syntetická data“ a zápatí „není určeno pro léčbu“; u nového pacienta upozorní na smyšlené údaje;
- den aplikace končí ve 4:00 (jídlo do 4:00 patří k předchozímu dni);
- do 3 h po hlavním jídle je hlavním tlačítkem „Zapsat svačinu“;
- zápis jídla jde opravit nebo smazat do 24 h, oprava jde do stopy;
- aplikace běží vždy v českém čase, cestování do jiného pásma je mimo rozsah;
- text pacienta: hlavní text a volby od 17 px, nic pod 15 px;
- „glukóza teď pod 4“ v kroku 1 se počítá jako pokles;
- čas pod cílem blokuje větev „zvýšit“;
- výrazně vyšší dávka než předepsaná ukáže obecné pravidlo a za 60 min otázku „pod 4?“;
- poklesy z exportu se k jídlu přiřazují do 4 h;
- u lékaře se body potvrzené daty předvyplní jako „sedí podle dat“;
- podmínky zařazení: bez korekčního schématu a bazál večer.

Ostatní:
- Otisk ve stopě je od SCHEMA 89 otisk jádra `NF.itemFingerprint(položka)`.
- Referenční výsledek je celá sada bez `FAIL` a nezměněné zlaté výstupy. Počty testů (144 řádků celé sady, 432 zapsaných testů) vysvětluje [`30-prilohy.md`](30-prilohy.md) odd. 5.1.
- Zastaralá čísla v `15` odst. 16–17 jsou deník a platí chování makety.

Pokud narazíte na otázku, kterou tento dokument ani atlas neřeší, zeptejte se vlastníka. Do odpovědi platí chování makety.
