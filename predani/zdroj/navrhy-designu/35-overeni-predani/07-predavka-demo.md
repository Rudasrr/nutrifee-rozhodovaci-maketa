# Předávka pro první demo – co se změnilo (9. 11. 2026)

*Podle rozhodnutí vlastníka v `05-rozhodnuti.md` a prověrek `01-programator.md`, `02-forma.md` a `03-presnost.md`. Zdroj je `maketa-rozhodovaci/predani/`. Pracovní kopie `navrhy-designu/34-predani-programatorovi/predani/` je srovnaná přes `rsync -a` bez `README.md` a `zdroj/`; porovnání `diff -rq` je bez rozdílu. Kódu makety (`app/`, `demo/`, testy) jsem se nedotkl. Nic není commitnuté ani publikované.*

## 1. Co je nové

| Soubor | Obsah |
|---|---|
| `predani/01-cesta-k-demu.md` | Co je první demo (celý cyklus, telefon jako PWA, ordinace v prohlížeči, stav přes server, syntetická data, skok na kapitolu). Co převzít beze změny (`app/` celé, `app/data/`, tokeny, písma, ikony, `design-system/`, z `demo/` jen `fixtures.js`). Co postavit (PWA obal, tenká synchronizační vrstva mimo jádro s pravidlem „poslední zápis vyhrává“, výběr role a pacienta, „přeskočit na kapitolu“ přes `D.play`). Co vynechat (etapy 11, 12, 15, 16 a kontrolní seznam). Spuštění makety lokálně bez přihlášení. Rychlá sada a zlaté výstupy. Plán na 5 dní s ověřitelným „hotovo, když“. První úkol prvního dne. Devět otevřených otázek pro vlastníka a odstavec s otázkami, na které odpověď už existuje. |
| `predani/AGENTS.md` | Pokyny pro AI asistenta v repozitáři dema, 87 řádků: 9 zásad, pravidlo „jádro `app/` neměnit, změnu nejdřív ověřit v maketě proti celé sadě“, tři příkazy, P1–P11, výtah „co se nesmí vracet“, jen syntetická data a žádná generativní AI, malé úkoly po obrazovkách s odkazem na atlas a řádek „Kapitola“. |
| `predani/40-design-system.md` | 295 tokenů v 18 kategoriích s počty a hlavními hodnotami, typografická stupnice (13–44 px), odstupy, zaoblení, cíle dotyku, barevné role s tokeny a spočítanými kontrasty WCAG, 25 karet komponent s variantami a stavy, stavy hlavních tříd z `design.css`, jak otevřít katalog a inspektor a co z katalogu nepřenášet (sekce `#vrstva`, `demo/demo.css`, tokeny `--nf-demo-*`). Tabulky vygeneroval skript; názvy písma a sady ikon v tabulkách nejsou. |
| Řádek „Kapitola“ v atlasech | U všech 87 obrazovek (57 pacient, 30 ordinace): název scény, id kapitoly, volání `D.play(…)` (u dodatků s větví), číslo scény v „Přehledu scén“, počet klepnutí na Další a případné další akce. Údaje jsou ze skriptů, kterými vznikly snímky. Vysvětlení je v úvodu obou atlasů. |
| README | Začíná dvěma cestami: 1. první demo (`01`, `AGENTS.md`, atlas jako příručka, příloha 40), 2. ostrá aplikace (`00-postup.md`, 17 etap). |

**Ověřeno v prohlížeči (SCHEMA 88).** Kopie HTML bez čtyř řádků `demo/sync-config.js`, `demo/auth.js`, `demo/sync.js` a `demo/results.js` spustí celý příběh bez přihlášení: úvod, 27 kapitol a 32 scén. Produkční sestavení bez `demo/` s `?role=lekar` ukáže „Nový pacient“. Krok 1 jídla má opravdu „Ano, 8 j.“ s podřádkem „podle plánu z 5. 10.“.

## 2. Opravy 16 nepřesností z `03-presnost.md` odd. 2

Odd. 2 má 13 číslovaných bodů. Tabulka v odd. 1 jich počítá 16, protože některé body mají víc míst. Opraveno je všech 13 bodů na všech místech.

| # | Nepřesnost | Výsledek |
|---|---|---|
| 1 | `00` etapa 2 „Pozor“ a odd. 6 bod 1 tvrdily, že denní doby slotů jsou otevřené | Opraveno na „rozhodnuto 7. 11. 2026: provozní“. Odkaz na odd. 5 zůstal jen u otázky, zda meze patří do otisku. |
| 2 | P46 „obrysové volby“ | Opraveno na podtržené textové odkazy bez rámečku (třída `quiet`, krok 3 ve `V.meal`), se zdůvodněním rozdílu proti P43. Totéž v `00` etapa 8. |
| 3 | „Ano, 8 j. · píchnuto“ | Opraveno na „Ano, 8 j.“ s podřádkem „podle plánu z 5. 10.“ (`NF.doseOrigin`) v `00` etapa 8 a v `15` odst. 7 bod 1 v kořeni projektu i v `predani/zdroj/`. V obou kopiích `15` je opravený i příklad v odst. 19 (pravidla tlačítek). |
| 4 | P16 odkaz na neexistující test „P2“ | Odkaz odstraněn. Doplněno, že P2 vlastní test nemá a ověřuje se v prohlížeči. Opravena i obecná věta atlasu a řádek přílohy 5.1, podle kterých `obsah-pacienta.test.cjs` hlídá P1–P11: ve skutečnosti hlídá P1, P4 a P6–P11. |
| 5 | Test „Verze: NF.SCHEMA 87…“ v `00` etapa 2 a v příloze 5.1 | Název je napsaný bez čísla verze, s poznámkou, že se mění s každou SCHEMA, a s výběrem `ONLY="Verze: NF.SCHEMA"`. |
| 6 | P22 a P40 přiřazovaly testy k `robustnost.test.cjs` | Opraveno na hlavní sadu s plnými názvy testů. |
| 7 | `NF.OFF_TEXT` v `app/core.js` (`00` etapa 7) | Po SCHEMA 89 bude tvrzení pravdivé. `00`, atlas pacienta i ordinace teď říkají: od SCHEMA 89 v `app/core.js`, do SCHEMA 88 v `app/screens.js`. Označeno k ověření. |
| 8 | `00` odd. 1.5: „`15` není v repozitáři“ | Opraveno: je v `predani/zdroj/` (rozhodnutí 6. 11. 2026). Doplněno, že některé odkazy uvnitř `15` míří na historické podklady, které tam nejsou. |
| 9 | Hlavička atlasu pacienta „SCHEMA 87“ | Všechny hlavičky sjednocené na SCHEMA 89 a označené k ověření. |
| 10 | 128 / 142 / 376 bez vysvětlení | Příloha 5.1 a `00` odd. 1.4 to teď vysvětlují: 376 zapsaných testů, 128 v hlavní sadě, z toho jedna smyčka s 15 testy „Sada … projde“, 142 řádků OK (127 + 15) a 390 řádků seznamu (142 + 248). Počty jsou přepočítané skriptem. |
| 11 | Zkrácený název testu „Jádro bez sítě … (úložiště makety)“ | Název zůstal bez jména služby (zásada 9). Doplněno, že název v kódu končí jménem služby, a výběr `ONLY="Jádro bez sítě"`. |
| 12 | O15 „sbaleno 10 z 10 sedí“ | Popis snímku opraven: body jsou rozbalené, rozbalené je i „Co návrh oslabuje (3)“. |
| 13 | `design-system/` „1:1“ | Doplněno „bez sekce Prezentační vrstva a bez `demo/demo.css`“ a odkaz na přílohu 40. |

**Další opravy z `02-forma.md` a `01-programator.md` odd. 5** (jen faktické chyby):

- Doba běhu celé sady je „asi 12–15 minut“, ne „několik minut“.
- „Asi 400 funkcí“ je změřeno znovu: 420 klíčů `NF.*` v `core.js` a `app/data/`, z toho 356 funkcí, a 154 akcí v `ui.js`. Označeno k přepočtu po 89.
- Návod na produkční sestavení už nerozbije HTML (01 #12): mazat se má jen `<link … demo/demo.css>` a řádky `<script src="demo/…">`, komentář zůstane celý.
- Dokumenty „`00`–`14` jsou historie“ už nejdou splést s `00-postup.md` (01 #4). Na tom místě je i věta, že deník a stará rozhodnutí v `15` odst. 16–17 ustupují chování makety (01 #9).
- Odkazy na `CLAUDE.md`, který programátor nemá (01 #13), teď vedou na instrukce mimo repozitář a výtah v `AGENTS.md` (`00` odd. 6, atlas ordinace R4, příloha 4.2).
- Pokyn „vygenerujte přílohy znovu“ šel provést jen se skriptem, který v repozitáři není (01 #15). Teď stojí: skript je u vlastníka, požádejte o nové vygenerování.
- `cd maketa-rozhodovaci` je nahrazené „v kořeni repozitáře“ (01 #18).
- „Schválená předem“ je opravené na „před nasazením“ (01 #19).
- Vzor `ordinace-Oxx-nazev.png` už nevypadá jako rozbitý odkaz (01 #20).
- `00` odd. 1.3: jádro se pro demo přenáší jako kód, o přepisu pro ostrý provoz se rozhodne po demu. Odd. 2.1: platforma dema je rozhodnutá (PWA).
- Neopraveno, protože jde o formu nebo rozhodnutí, ne o fakt: 01 #14 (cíle odkazů z `15` mimo `zdroj/`; v README a `00` je jen upozornění), #16 (pořadí etap 1 a 11), #21 („skóre jídel“ v `15`).

**Odkazy:** skript ověřil 113 relativních odkazů a 87 odkazů na `obrazovky/…png` ve všech dokumentech předávky. Všechny platí a každý z 87 snímků je odkázaný.

## 3. Místa označená `<!-- doplnit po 89 -->` (30) – všechna doplněná a odstraněná, viz odd. 6

| Soubor | Řádek | Co doplnit |
|---|---|---|
| `01-cesta-k-demu.md` | 3 | číslo verze a datum |
| | 22 | že `D.play` běží bez `guide.js` a `presenter.js` (po přesunu `proposalBranch`) |
| | 27 | přesný tvar `NF.configure`, jméno háčku na změnu stavu a kdy se volá |
| | 48 | příkaz a obsah rychlé sady |
| | 49 | cesty a příkazy zlatých výstupů (`zlate-vystupy/zlate-vystupy.test.cjs`, `generuj.cjs`) |
| | 83 | jméno funkce otisku a zda se změnily testovací vektory |
| `AGENTS.md` | 26 | tvar `NF.configure` a háčku |
| | 38 | cesty a názvy tří příkazů |
| `README.md` | 3 | datum |
| | 36 | zda `kontrola3-panel.test.cjs` stále čte `../navrhy-designu/…/scene-items.cjs` a zda klon musí ležet ve složce `maketa-rozhodovaci` |
| `00-postup.md` | 3 | datum |
| | 37 | přepočet klíčů a funkcí `NF.*` |
| | 44 | počty a obsah rychlé sady a zlatých výstupů (nový řádek tabulky 1.3) |
| | 64 | cesty a názvy příkazů |
| | 65 | počty testů po přidání nových sad |
| | 194 | `NF.configure` ve vstupech etapy 1 |
| | 208 | změna testovacích vektorů otisku (etapa 2) |
| | 262 | umístění `NF.OFF_TEXT` (etapa 7) |
| | 322 | podpis `NF.proposalBranch` (etapa 13) |
| `10-atlas-pacient.md` | 1, 3 | číslo verze; že SCHEMA 89 obrazovky pacienta nemění |
| | 21 | počty klepnutí v řádcích „Kapitola“, pokud SCHEMA 89 měnila kroky příběhu |
| | 29 | umístění `NF.OFF_TEXT` |
| `20-atlas-ordinace.md` | 3 | datum |
| | 13 | počty klepnutí v řádcích „Kapitola“ |
| | 135 | změna algoritmu nebo vektorů otisku |
| | 492 | podpis `NF.proposalBranch` (O15) |
| `30-prilohy.md` | 3 | datum; přegenerovat tabulky 2, 3 a 5 |
| | 337 | přidat `rychle.test.cjs` a zlaté výstupy do 5.1 |
| `40-design-system.md` | 3 | ověřit, že se `tokens.css` a katalog nezměnily, a tabulky vygenerovat znovu |

Po dokončení (odd. 6) `grep -n "doplnit po 89" maketa-rozhodovaci/predani/*.md` nenajde nic.

## 4. Na co si dát pozor při integraci

- **Počty klepnutí v řádcích „Kapitola“** pocházejí ze snímkovacích skriptů SCHEMA 87 a 88. Při rychlé kontrole v prohlížeči bez čekání na konec kroků se rozcházely: kroky se přehrávají animovaně. Id kapitoly a číslo scény jsou spolehlivé. Pokud SCHEMA 89 změní kroky příběhu, řádky jde přegenerovat skriptem `kapitoly.cjs` (je idempotentní).
- **Kořenový `15` jsem upravil cíleně jen na dvou řádcích** (odst. 7 bod 1 a příklad v odst. 19), a to v obou kopiích. Pokud agent SCHEMA 89 přepisuje `15` celý ze své starší kopie, oprava se ztratí. Při integraci zkontrolujte `grep -c "8 j. · píchnuto" 15-ZDROJ-PRAVDY-MAKETA.md` (má vyjít 0).
- Při integraci srovnejte znovu pracovní kopii `34-…/predani/` (`rsync -a` bez `README.md` a `zdroj/`).

## 5. Pomocné skripty

Jsou ve scratchpadu `predani89/`:

- `pocty.cjs` – klíče, funkce a testy;
- `gen-ds.cjs` – tabulky přílohy 40;
- `kapitoly.cjs` – řádky „Kapitola“ v atlasech;
- `odkazy.py` – kontrola odkazů.

Testovací kopie HTML (`srv/pribeh.html`, `srv/produkce.html`) jsou tam také.

## 6. Dokončení po SCHEMA 89 (9.–10. 11. 2026)

Podklad: `06-schema89.md` a kód v `maketa-rozhodovaci/` (SCHEMA 89). Kódu makety jsem se nedotkl.

- **Všech 30 značek doplněno a odstraněno.** Hlavičky mají „SCHEMA 89 (9. 11. 2026)“. Příkazy: `node rychle.test.cjs` (14 testů, asi 40 s), `node zlate-vystupy.test.cjs` (test leží **v kořeni**, 9 testů; data a `generuj.cjs` jsou ve složce `zlate-vystupy/`), celá sada asi 15–30 minut podle stroje, 144 řádků OK. Tvar `NF.configure({ now, storage: { get, set } })`, `NF.onChange(fn)` s `fn(S, { saved, key })`, `NF.storage()`, `NF.save` vrací `false` bez uložení. Podpis `NF.proposalBranch(S, návrh)` → `{ action, text, when?, block?, missing? }`. `NF.OFF_TEXT` a `NF.OFF_RECORD_ONLY` jsou v `app/core.js`. Nové `NF.previewQuestions` a `NF.previewBest` jsou zmíněné v `01` a v atlasu pacienta.
- **Počty přepočítané:** 431 klíčů `NF.*`, z toho 363 funkcí; 19 testových souborů a 393 zapsaných testů; hlavní sada 127 + 17 „Sada … projde“ = 144. V příloze 5.1 jsou nově vysvětlení počtů, řádky tabulky a seznamy testů `rychle.test.cjs` a `zlate-vystupy.test.cjs` a dvě nové „Sada“ v hlavní sadě; název testu verze je „NF.SCHEMA 89“. Skript ověřil, že všech 390 vyjmenovaných názvů testů (kromě generovaných „Sada …“ a „Zlatý výstup …“) ve zdrojích existuje.
- **`NF.slots.itemGuide`:** odstavec „Položky ve stopě“ v atlasu ordinace (odd. 4.3) přepsaný: otisk ve stopě je otisk jádra `NF.itemFingerprint(položka)` bez průvodce, slot je zrušený, otisk garanta s průvodcem se nezměnil a export nese `fp` i `fpTrace`. Totéž ve slovníku přílohy („Otisk znění“) a v `00` etapa 2.
- **Příloha 40:** tabulky vygenerované znovu nad SCHEMA 89 vyšly beze změny (`tokens.css`, `design.css` ani `app/data/` se ve SCHEMA 89 neměnily).
- **Řádky „Kapitola“ ověřené na SCHEMA 89:** skript `atlas87/br/over89.cjs` přehrál všech 87 obrazovek v maketě s vyprávěním (scéna, kroky Další s čekáním na konec kroku, stejné akce jako při snímání) a porovnal stránku, čas a nadpis (pacient) a roli, stránku, krok kontroly a nadpis (ordinace) se snímkovými metadaty. 86 z 87 se shoduje; u P56 se shodují stránka i čas a liší se jen místo, kde skript hledal nadpis (snímek se pořizoval z listu zásuvky, ne z obrazovky). Počty klepnutí proto zůstaly a v úvodu obou atlasů je věta, že jsou ověřené na SCHEMA 89. Výsledek: scratchpad `predani89/over89.txt`.
- **`predani/zdroj/`:** aktuální `15-ZDROJ-PRAVDY-MAKETA.md` z kořene projektu (se stavovým odstavcem SCHEMA 89 a opravou „Ano, 8 j.“) a nová složka `navrhy-designu/35-overeni-predani/` se všemi `*.md` z této složky (01, 02, 03, 05, 06, 07). Pozor před publikací: `01`, `03` a `06` jmenují nástroje a službu úložiště makety (zásada 9); vlastník 6. 11. 2026 řekl „Jména neřeš“, ale kontrolu před publikací doporučuji.
- **Odkazy a pracovní kopie:** 113 relativních odkazů a 87 odkazů na snímky platí, žádná značka „doplnit po 89“ nezůstala; pracovní kopie `34-…/predani/` srovnaná (`rsync -a` bez `README.md` a `zdroj/`, `diff -rq` bez rozdílu).
