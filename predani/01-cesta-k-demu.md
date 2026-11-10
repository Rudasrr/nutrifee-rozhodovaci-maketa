# Cesta k prvnímu demu

*Rozhodnutí vlastníka 9. 11. 2026: první demo se staví nad převzatým jádrem makety, ne přepisem. Stav makety SCHEMA 89 (9. 11. 2026). Pokyny pro AI asistenta jsou v [`AGENTS.md`](AGENTS.md), atlasy obrazovek ([`10-atlas-pacient.md`](10-atlas-pacient.md), [`20-atlas-ordinace.md`](20-atlas-ordinace.md)) slouží jako příručka k jednotlivým obrazovkám. Plán ostré aplikace v 17 etapách je v [`00-postup.md`](00-postup.md) a pro demo ho nepotřebujete.*

## Co je první demo

První demo ukáže **celý cyklus**: lékař pacienta zařadí a vydá plán, sestra ho zaučí, pacient plán převezme a zapisuje jídla, sestra před kontrolou nahraje export ze senzoru, lékař projde kontrolu a vydá nový plán a pacient ho převezme.

Telefon pacienta běží jako webová aplikace s ikonou na ploše (PWA), ordinace v prohlížeči na počítači. Stav pacienta se sdílí přes server, data jsou jen syntetická. Cyklus trvá 92 dní, proto prezentující může přeskočit na kapitolu příběhu (například „po týdnu“ nebo „kontrola, krok 1“) s daty modelového pacienta. Demo je tedy maketa bez prezentační vrstvy na dvou zařízeních; klinická logika je tentýž kód jako v maketě.

## Co převzít beze změny

| Co | Odkud | Poznámka |
|---|---|---|
| jádro celé | `app/` (`core.js`, `screens.js`, `screens-clinic.js`, `ui.js`, `icons.js`) | doména, obrazovky i akce |
| katalogy | `app/data/` (`registry.js`, `catalogs.js`, `foods.js`) | 42 položek registru, 7 pravidel, 171 jídel |
| vzhled | `app/tokens.css`, `app/design.css`, `app/fonts/` | jediný zdroj hodnot vzhledu je `tokens.css`; viz [`40-design-system.md`](40-design-system.md) |
| katalog komponent | `design-system/` | bez sekce „Prezentační vrstva“ a bez `demo/demo.css` |
| data příběhu | `demo/fixtures.js` | jediný soubor z `demo/`: modelový pacient, 27 kapitol (`D.chapters`), funkce `D.play(index)` |
| testy | `rychle.test.cjs`, `zlate-vystupy/` | zábradlí nového repozitáře (níže) |

Od SCHEMA 89 jádro samo obsahuje i to, co dřív leželo v obrazovkách nebo v prezentační vrstvě: volbu větve návrhu (`NF.proposalBranch`), výchozí text zamítnuté části (`NF.OFF_TEXT`) a otisk položky nezávislý na `demo/`. Do jádra přibyly i `NF.previewQuestions` a `NF.previewBest` (otázky a nejlepší rada v přehledu před kontrolou). Díky tomu jde celý příběh (32 scén až po vydání plánu P2) přehrát jen s `app/core.js`, `app/data/` a `demo/fixtures.js`, bez prohlížeče; hlídá to první test `zlate-vystupy.test.cjs`.

## Co postavit

1. **PWA obal.** Soubor manifestu (název, krátký název, ikona ve dvou velikostech, `display: standalone`, barva z `--nf-primary`), registrace service workeru jen pro instalaci a statické soubory a spuštění rovnou do role pacienta. Data se do mezipaměti neukládají.
2. **Tenká synchronizační vrstva mimo jádro.** Stav pacienta je jeden objekt JSON (`S`). Server drží pro každého pacienta jeden záznam: načíst a uložit celý stav. Platí, že **poslední zápis vyhrává**. Vrstva se připojí přes `NF.configure({ now, storage: { get(key), set(key, value) } })`: `get` vrací řetězec nebo `null`, `set` při chybě vyhodí výjimku. Jádro volá úložiště synchronně, proto vrstva drží poslední stav v paměti a na server ho odešle v háčku `NF.onChange(fn)`; `fn(S, { saved, key })` se volá po každém `NF.save`, tedy po každé akci. `NF.save` vrátí `false` a nastaví `NF.storageOK = false`, když se neuložilo; `NF.storage()` vrátí právě používané úložiště. Po návratu do aplikace (událost viditelnosti stránky) se stav načte znovu. **Jádro síť nevolá**: síť volá jen tato vrstva a test „Jádro bez sítě“ musí zůstat zelený.
3. **Výběr role a pacienta.** Úvodní stránka mimo jádro: role (pacient, lékař, sestra) a pacient (modelový pacient z příběhu, nebo nový pacient bez plánu). Roli jádro dnes čte z adresy (`?role=pacient`, `?role=lekar`, `?role=sestra`); pacient určuje, který záznam na serveru vrstva načte.
4. **Ovládání prezentujícího „přeskočit na kapitolu“.** Malý seznam kapitol z `D.chapters` (název, role, datum). Volba zavolá `D.play(index)` a výsledný stav uloží na server jako stav vybraného pacienta. Druhé zařízení ho po obnovení převezme. Stav nese i modelový čas (`S.clock`), takže telefon i ordinace ukazují tentýž den. Mapa „obrazovka → kapitola“ je v atlasech u každé obrazovky (řádek „Kapitola“).

## Co vynechat

- Z postupu ostré aplikace etapy **11** (ostrý server, oprávnění, fronta), **12** (převodníky skutečných exportů; stačí převodník makety `NF.parseSensorCsv`), **15** (podpis garanta) a **16** (provoz) a celý kontrolní seznam v `00-postup.md` odd. 4.
- Přepis jádra, převod 393 testů do jiného jazyka a nový designový systém.
- Z `demo/` vše kromě `fixtures.js`: vyprávění, panel prezentujícího, průvodce položkami, přihlášení a ukládání rozhodnutí garanta (`auth.js`, `sync.js`, `results.js`, `sync-config.js`).

## Jak maketu spustit lokálně bez přihlášení

Publikovaná ukázka i lokální soubor `nutrifee-rozhodovaci-maketa.html` se bez účtu zastaví na přihlášení. Obejde se to dvěma kopiemi HTML ve složce makety (ověřeno 9. 11. 2026):

- **Celý příběh s vyprávěním:** v kopii HTML smažte čtyři řádky `<script src="demo/sync-config.js…">`, `demo/auth.js`, `demo/sync.js` a `demo/results.js`. Příběh se spustí od úvodu, prochází se tlačítkem **Další ▶** a tlačítko **Přehled scén** v liště skočí na kteroukoli scénu.
- **Produkční sestavení (jen jádro):** smažte řádek `<link … href="demo/demo.css…">` a všechny řádky `<script src="demo/…">`. Komentář nad nimi nechte celý, jinak zůstane neuzavřený. Pak otevřete `…?role=lekar`, `…?role=sestra` nebo bez parametru (pacient). Aplikace začíná bez plánu zařazením.

Ve složce makety spusťte libovolný statický server, aby se stav držel i po obnovení stránky.

## Testy jako zábradlí

- **Rychlá sada** `node rychle.test.cjs` (asi 40 s, 14 testů) po každé změně: hodiny, úložiště a háček jádra, registr, zásady 1 a 3, bez sítě a DOM, a souběžně zlaté výstupy, P1–P11 a tokeny.
- **Zlaté výstupy** `node zlate-vystupy.test.cjs` (test leží v kořeni, 9 testů): referenční výstupy jádra z přehrání všech 32 scén v pěti souborech JSON ve složce `zlate-vystupy/` (`otisky`, `pribeh`, `kontrola`, `rady`, `stopa`), popis v `zlate-vystupy/README.md`. Přegenerovat (`node zlate-vystupy/generuj.cjs`) jen při změně chování schválené vlastníkem.
- **Celá sada** `node nutrifee-rozhodovaci-maketa.test.cjs` (asi 15–30 minut podle stroje, 144 řádků OK) před předvedením a po každé změně v `app/`. Kontrolujte celý výstup (řádky `FAIL`).

## Plán po dnech

| Den | Práce | Hotovo, když |
|---|---|---|
| 1 | Nový repozitář: převzaté soubory (tabulka výše), `AGENTS.md` v kořeni, produkční sestavení jako `index.html`. | Rychlá sada i zlaté výstupy projdou v novém repozitáři. `?role=lekar` ukáže „Nový pacient“ a lékař projde zařazení až po vydání plánu. |
| 2 | Synchronizační vrstva a jednoduchý server se syntetickými daty (jeden záznam JSON na pacienta). | Lékař vydá plán a sestra zaučí pacienta na počítači; pacient po obnovení v jiném prohlížeči vidí převzetí s týmiž dávkami. Test „Jádro bez sítě“ projde. |
| 3 | PWA obal a výběr role a pacienta. | Na skutečném telefonu jde aplikaci přidat na plochu, otevře se na celou obrazovku v roli pacienta. Výběr pacienta přepne záznam na serveru. |
| 4 | Ovládání „přeskočit na kapitolu“. | Skok na kapitolu `reviewSummary` dá tatáž čísla jako maketa (mimo jiné „doplněno 37 jídel a 14 nocí“ a čas v cíli 68 %) a shoduje se se zlatými výstupy. Telefon po obnovení ukazuje tutéž kapitolu. |
| 5 | Průchod celým cyklem na telefonu a počítači, písmo 160 %, nejužší telefon, kontrola jmen, celá sada. | Cyklus zařazení → zápisy → kontrola → nový plán proběhne bez chyby. Celá sada makety je bez `FAIL`. V souborech nejsou skutečná jména. |

## První úkol prvního dne

1. Naklonujte repozitář makety a ve složce makety spusťte rychlou sadu a zlaté výstupy. Oba běhy musí projít, jinak se zastavte a napište vlastníkovi.
2. Spusťte celý příběh lokálně bez přihlášení (postup výše) a projděte tlačítkem **Další ▶** aspoň scénáře 1 a 2. Zabere to asi 20 minut.
3. Založte repozitář dema. Zkopírujte do něj soubory z tabulky „Co převzít“, `AGENTS.md` dejte do kořene a z HTML makety udělejte `index.html` produkčního sestavení.
4. **Hotovo, když** v novém repozitáři projde rychlá sada i zlaté výstupy proti zkopírovanému jádru a v témže prohlížeči proběhne zařazení (`index.html?role=lekar`), zaučení (`?role=sestra`) a převzetí plánu (`index.html`, pacient).

## Otevřené otázky pro vlastníka

Programátor je nerozhoduje sám; do odpovědi platí chování makety.

1. **Komu, kdy a na jakých zařízeních** se demo ukáže a kdo bude prezentovat.
2. **Více pacientů v ordinaci:** stav makety má jednoho pacienta, lékaře a sestru (`NF.createState`). Seznam pacientů v ordinaci, nebo jen výběr na úvodní stránce?
3. **Registr pro všechny pacienty:** registr je dnes uvnitř stavu pacienta (`S.registry`). Společný, nebo u každého pacienta zvlášť?
4. **Registr garanta v demu:** položky se chovají jako schválené. Ukázat obrazovky schvalovacího registru, nebo je skrýt?
5. **Čas:** které časové pásmo je kanonické pro „kalendářní den“ a má demo po skoku na kapitolu držet modelový čas příběhu, nebo běžet ve skutečném čase?
6. **Přihlášení do dema:** stačí neveřejná adresa, nebo přihlášení?
7. **Migrace stavu:** smí demo po změně verze rozehraný stav zahodit jako maketa?
8. **Server dema:** kde poběží a kdo ho provozuje.
9. **Souběh zařízení:** „poslední zápis vyhrává“ platí; má demo upozornit, že se stav mezitím změnil jinde?

Už zodpovězeno (rozhodnutí 9. 11. 2026 a SCHEMA 89): **jádro** se pro demo převezme jako kód, o přepisu pro ostrou aplikaci se rozhodne po demu (bod 1). **Platforma** je webová aplikace, pacient jako PWA a ordinace v prohlížeči (bod 2). **Data** se sdílejí jednoduchou synchronizací celého stavu přes server, jen syntetická, vrstvou mimo jádro (bod 3); výpočty běží jádrem bez sítě na každém zařízení. **Otisk** ve stopě je od SCHEMA 89 otisk jádra `NF.itemFingerprint(položka)` a nezávisí na prezentační vrstvě (bod 4); otisk rozhodnutí garanta a jeho testovací vektory se nezměnily. **Referenční výsledek** je celá sada bez `FAIL` a nezměněné zlaté výstupy; čísla 144 a 393 vysvětluje [`30-prilohy.md`](30-prilohy.md) odd. 5.1. **Zastaralá čísla v `15` odst. 16–17** jsou deník; platí chování makety.
