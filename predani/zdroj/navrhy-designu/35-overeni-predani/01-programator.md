# Ověření předávky očima programátora (9. 11. 2026)

*Pohled: zkušený programátor mobilních a webových aplikací, který projekt ani maketu nezná a má co nejrychleji postavit první demo (aplikace pacienta + ordinace podle makety). Čteno: `predani/README.md`, `00-postup.md` celý, atlasy a přílohy výběrově, `zdroj/15` výběrově, kód `app/` a `demo/` výběrově. Repozitář jen čten; testy a pokusy na kopii ve scratchpadu (`proverka-prog/`).*

## Shrnutí v pěti větách

1. Předávka je napsaná pro **celou ostrou aplikaci** (17 etap, server, regulace, podpis garanta), ne pro **první demo**; slovo „demo“ v ní znamená jen štítek DEMO. Co je první demo, z ní nevyčtu.
2. Etapy 0–3 se podle textu začít dají, ale hned v etapě 0 narazím na dvě rozhodnutí, která text výslovně nechává „na programátorovi a vlastníkovi“ (technologie, platforma) a na jedno, které vůbec nezmiňuje: **smím jádro `app/` použít jako kód, nebo ho mám přepsat?** Celý postup implicitně počítá s přepsáním.
3. Nejcennější zjištění: **produkční sestavení makety (bez `demo/`) už je funkční aplikace pacienta, lékaře i sestry** v jednom prohlížeči (`?role=lekar|sestra|pacient`), a celý 60minutový příběh jde spustit lokálně bez přihlášení vynecháním čtyř řádků. Předávka první z toho zmiňuje jen jako „nejlépe se vidí, co je jádro“, druhé vůbec.
4. Rozsah je pro rychlý start nečitelný: 4 dokumenty ≈ 378 tis. znaků a „jediný zdroj pravdy“ `15` má **340 tis. znaků** (727 řádků, 37 řádků delších než 2000 znaků), dohromady ≈ 720 tis. znaků ≈ 180 tis. tokenů. Za 30 minut se přečte README a polovina `00-postup.md`.
5. Chybí to, co programátor potřebuje nejdřív: definice prvního dema, rozhodnutí o technologii, datový model (včetně více pacientů), katalog akcí a stavů, pokyny pro práci s AI asistentem. Přebývá historie (stavy SCHEMA, „vyřešeno v…“, zastaralá čísla v `15` odst. 17).

---

## 1. Prvních 30 minut

**Co jsem se dozvěděl (rychle a dobře):**
- README je krátké a jasné: pořadí čtení, kde je zdroj pravdy, jak pustit testy. Úvod `00-postup.md` odd. 1.1–1.3 dobře vysvětlí doménu, zásady „nikdy“ a co se přenáší (tabulka složek je výborná).
- Architektura cíle (odd. 2) je srozumitelná, poctivě říká, co je otevřené.
- Atlas má u každé obrazovky snímek, funkce jádra, položky registru, stopu a testy. To je nadprůměrná kvalita.

**Kde jsem se zasekl:**
1. **Co je „první demo“?** Předávka ho nedefinuje. README: „Podle makety se programuje ostrá aplikace.“ Postup jde etapami 0→16 až k regulaci; první obrazovka vznikne až v etapě 5, po datovém modelu, registru a *celém* výpočetním jádru (etapy 1–3, ≈ 120 funkcí jen ve výčtu etapy 3).
2. **Přepsat, nebo převzít?** Tabulka v 1.3 říká u `app/core.js` „přenáší se jako specifikace chování“. Neříká, zda kód smím použít. Vanilla JS bez závislostí, běží z `file://`, 410 funkcí `NF.*` a 376 testů – pro demo je to hotová knihovna.
3. **Ukázku s příběhem nevidím.** Odkaz na živou maketu vede na přihlášení (účet zakládá vlastník). Lokální spuštění `nutrifee-rozhodovaci-maketa.html` také skončí na přihlašovací obrazovce. Zjistil jsem až pokusem, že po vynechání řádků `demo/sync-config.js`, `demo/auth.js`, `demo/sync.js`, `demo/results.js` příběh běží lokálně bez přihlášení. Předávka to neříká.
4. **Testy.** Návod funguje (kopie do složky `maketa-rozhodovaci`, `15` a `scene-items.cjs` o úroveň výš). Ale „celý běh trvá několik minut“ neodpovídá: na mém stroji (souběžně běžely další sady) přes 15 minut. „142 prošlo“ ve „výstupu referenčního běhu SCHEMA 87“ mate, když stav je SCHEMA 88 a příloha 5 počítá 376 testů (142 = řádky OK hlavní sady včetně 15 podsad). Výsledek mého běhu: viz odd. 6.
5. **Zdroj pravdy nejde přečíst.** `15` je zároveň specifikace, deník rozhodnutí (odst. 16–18) a changelog. Po 30 minutách nevím, které části jsou norma a které historie.

**Vím po přečtení, co postavit jako první?** Podle postupu ano – „etapa 0: přípravek modelového pacienta a první převedený test“. To ale není první demo; je to první krok tříměsíčního přepisu. Co ukázat vlastníkovi za týden, nevím.

---

## 2. Etapy 0–3: šlo by začít bez ptaní? Ne. Otázky na vlastníka

Seřazeno podle toho, jak brzo blokují.

**Etapa 0 – příprava**
1. Co je první demo: komu, kdy, na jakých zařízeních (telefon + počítač?), s jakými daty (modelový pacient z příběhu, nebo prázdný start) a co musí ukázat (celý cyklus zařazení → týdny zápisů → kontrola → P2, nebo jen část)?
2. Smím jádro `app/` (a katalogy `app/data/`) použít v demu i v ostré aplikaci přímo jako kód, nebo je „jen specifikace“ a musím ho přepsat?
3. Platforma pacienta: nativní, webová, nebo PWA (`00-postup` 2.1 „otevřené“)? Jazyk a stack (etapa 0 „na programátorovi a vlastníkovi“) – kdo rozhoduje a do kdy?
4. Jak převádět testy, které porovnávají vykreslené HTML a české věty, když cílová technologie HTML řetězce nevrací (React Native, Flutter)? Text postupu „porovnávejte stav a obsah obrazovky stejnými větami“ je pro nativní UI nejasný.
5. Přípravek modelového pacienta: `demo/fixtures.js` (75 kB, kapitoly `setup/apply` volají jádro i příběh) – převzít celý jako testovací data i do dema? Postup říká „do produktu nepatří“, ale demo bez 92 dnů dat kontrolu neukáže.
6. Který referenční výsledek je správný: 142 OK hlavní sady (SCHEMA 87), nebo 376 testů? Patří do „hotovo“ i testy prezentační vrstvy, které se nepřevádějí?

**Etapa 1 – datový model, úložiště, čas, stopa**
7. **Více pacientů.** Stav makety (`NF.createState`) je jeden pacient, jeden lékař, jedna sestra. Ordinace v ostré aplikaci má víc pacientů. Kde je seznam pacientů, výběr pacienta, identita? Atlas ordinace O01 je „Nový pacient“ bez seznamu.
8. **Registr je uvnitř stavu pacienta** (`S.registry`). V ostré aplikaci je registr globální data na serveru. Jeden registr pro všechny pacienty, pro studii, pro ordinaci? Jak se verze registru váže na plán pacienta?
9. Úložiště v etapě 1: lokálně v zařízení, nebo rovnou server? Server je až etapa 11, ale telefon a ordinace sdílejí data od etapy 5–6 (lékař vydá plán, pacient ho převezme). Bez sdílení nejde demo na dvou zařízeních.
10. Čas: maketa má `S.clock` a posun času pro příběh. Má demo umět „přeskočit o týden“? Ostrá aplikace má ukládat čas s časovým pásmem – které pásmo je kanonické pro „kalendářní den“?
11. Migrace stavu mezi verzemi: maketa zahazuje stav, ostrá nesmí. Je potřeba už v demu?

**Etapa 2 – registr**
12. Otisk `NF.itemFingerprint` zahrnuje text průvodce „Co schvalujete“ z `demo/guide.js` (prezentační vrstva). Bez `demo/` vyjde jiný otisk. Kterému otisku se mají shodovat „otisky fp všech 28 klinických položek“ (hotovo etapy 2)?
13. Patří meze parametrů do otisku znění? (otevřené, odd. 5 bod 1)
14. V demu: chovat se, jako by položky byly schválené (maketa), nebo „nerozhodnutá položka nepůsobí“ (ostrá)? V druhém případě demo bez garanta neradí vůbec nic.

**Etapa 3 – výpočetní jádro**
15. Kde běží výpočty – telefon, server, obojí (odd. 2.5 „otevřené“)? Pro přepis zásadní (jeden jazyk, nebo dva).
16. Bezpečnostní pravidla bez sítě (doporučení 06 C11) – rozhodnuto?
17. „Stejná čísla jako maketa“ platí i tam, kde `15` říká jinak? Příklad: `15` odst. 17 (R9) „rozmezí min–max do 5 zápisů, percentily od 8, barevný stupeň od 6“, kód a postup „do 7 zápisů min–max, od 8 percentil“, reakce má dva stupně (A32). Programátor neví, zda je `15` odst. 17 platný.

Bez odpovědí na 1, 2, 3, 7, 9 nezačnu psát produkční kód; bez 1 a 2 nevím, jestli mám psát kód vůbec, nebo zabalit jádro.

---

## 3. Je postup pro první demo, nebo pro ostrou aplikaci?

**Pro ostrou aplikaci.** Je to dobrý, závislostmi seřazený plán přepisu zdravotnického softwaru: nejdřív doména a testy, pak obrazovky, nakonec server, garant a regulace. Pro první demo je to nejdelší možná cesta: přepisuje znovu to, co v repozitáři už funguje.

**Odhad práce (1 zkušený programátor, s AI asistentem):**

| Cesta | Do prvního předvedení | Poznámka |
|---|---|---|
| Postup etap 0–16 doslova (přepis) | první obrazovka ≈ 8–12 týdnů (etapy 0–5), demo celého cyklu ≈ 5–7 měsíců, ostrá aplikace 9–12+ měsíců | `core.js` 277 kB / 2760 hustých řádků, obrazovky 350 kB, ≈ 300 testů k převodu |
| Postup bez etap 11–16, ale s přepisem | ≈ 3–4 měsíce | demo jen na jednom zařízení nebo s provizorním serverem |
| **Jádro `app/` převzít jako knihovnu** (doporučeno) | **3–5 pracovních dnů** | věrné maketě z definice: stejný kód, stejné testy |

**Nejkratší cesta k demu věrnému maketě:**

1. **Den 1 – produkční sestavení.** `nutrifee-rozhodovaci-maketa.html` bez řádků `<script src="demo/…">` a `demo/demo.css` (pozor: neodmazávat řádek komentáře, viz nález 12). Ověřeno: lékař `?role=lekar` vidí „Nový pacient → Připravit zařazení“, zařazení ve třech krocích funguje. Testy beze změny.
2. **Den 1–2 – dvě zařízení.** Pacient na telefonu jako PWA (manifest, ikona, celá obrazovka), ordinace na počítači. Sdílení stavu: stav `S` je jeden JSON; mimo `app/` přidat tenkou vrstvu, která `NF.save`/`NF.load` (nebo `NF.hooks`) zrcadlí na server (např. jedna tabulka „stav pacienta“ v už používaném Supabase, poslední zápis vyhrává, obnovení po návratu do aplikace). Jádro dál bez sítě – test „Jádro bez demo: 0 síťových volání“ zůstane zelený. Data jen syntetická.
3. **Den 2–3 – data a čas pro předvedení.** Z `demo/fixtures.js` převzít kapitoly jako „přeskočit na: první týden / před kontrolou / kontrola / nový plán“ v malém ovládání prezentujícího (bez vyprávění, bez panelu garanta). Bez toho demo kontrolu neukáže, protože potřebuje 92 dní dat.
4. **Den 3 – záloha.** Celý příběh s vyprávěním běží lokálně bez přihlášení (vynechat 4 řádky `demo/` pro přihlášení a ukládání); pro předvedení „jak to má vypadat“ je to hotová věc.
5. **Den 4–5 – kontrola a publikace.** Testy celé, kontrola jmen, nasazení na statický hosting, zkouška na skutečném telefonu (písmo 160 %, přichycená lišta záložek, posuvníky prstem).

**Co vynechat v demu:** etapy 11 (ostrý server, oprávnění), 12 (převodníky skutečných exportů – stačí převodník makety), 15 (podpis garanta), 16 a celý kontrolní seznam odd. 4, převod testů do jiného jazyka, nový designový systém (tokeny a CSS se berou 1:1).
**Co převzít přímo:** `app/` celé (jádro, obrazovky, `ui.js`, tokeny, písma, ikony), `app/data/`, testy, z `demo/` jen `fixtures.js` (data) a případně `guide.js` (kvůli otisku).
**Riziko:** demo je pak „maketa na dvou zařízeních“. Pokud vlastník chce demo zároveň jako základ ostré aplikace v jiné technologii, je to jiné zadání a musí ho říct (otázka 2).

---

## 4. Rozsah a čitelnost

**Čísla:** README 2 kB · `00-postup` 78 kB · atlas pacienta 106 kB · atlas ordinace 86 kB · přílohy 107 kB · `15` 340 kB · podklady v `zdroj/navrhy-designu/` dalších ≈ 30 souborů. Prakticky ≈ 720 tis. znaků povinného čtení, z toho `15` je polovina.

**Co je zbytečné (pro programátora):**
- `15` odst. 16 „Stav prací“ (≈ 110 řádků deníku SCHEMA 53–88) a odst. 17 (staré rozhodnutí s čísly, která už neplatí). Patří do changelogu, ne do zdroje pravdy.
- `00-postup` odd. 6 a oddíly „Vyřešeno v SCHEMA 87/88“ v obou atlasech: historie oprav předávky.
- Výčty desítek jmen `NF.*` v etapách bez jediného slova, co funkce dělá. Duplikují kód, nenahrazují popis.
- Příloha 5.1 (≈ 440 řádků názvů testů) – vygenerovatelné jedním příkazem; stačí tabulka souborů a pravidlo „co nepřevádět“.
- Datace a čísla SCHEMA přímo v textu pravidel („(SCHEMA 84, 32/02 A4, B6, B9, B10: …)“) – pro implementaci šum.
- Odd. 4.3 regulace – správně pro ostrou aplikaci, pro demo zbytečné (měl by být jasně oddělený).

**Co chybí:**
1. **Definice prvního dema** a milníky předvedení (co ukázat po 1 týdnu, 1 měsíci).
2. **Rozhodnutí o technologiích**, nebo aspoň výslovná volba „jádro beze změny jako knihovna“ vs. „přepis“.
3. **Datový model**: entity, vztahy, klíče, co je per pacient a co globální (registr, jídla), více pacientů v ordinaci, identita. Dnes se musí vyčíst z `NF.createState` a 2760 řádků.
4. **Katalog akcí a stavů**: 153 akcí v `app/ui.js` s formátem hodnoty `klíč:hodnota`, předpoklady, změny stavu, zápisy do stopy; stavové automaty (plán: koncept → vydán → převzat → kontrola → P2; zápis jídla 3 kroky; sledování nízké glukózy; nemoc; účast).
5. **Mapa obrazovka → funkce jádra → akce → test** jako jedna tabulka. Atlas to má rozptýleně u každé obrazovky; souhrnná tabulka chybí.
6. **Pokyny pro práci s AI asistentem**: `CLAUDE.md` pro cílový repozitář (zásady „nikdy“, kde je pravda, jak pouštět testy, co nesmí měnit). Předávka se na `CLAUDE.md` odvolává (`00-postup` odd. 6 bod 3, atlas ordinace R4, příloha 4.2), ale v repozitáři ani v `predani/` není.
7. **Jak spustit příběh lokálně bez přihlášení** (4 řádky) a jak „přeskočit na kapitolu“ v produkčním sestavení.
8. Realistická doba běhu testů a seznam sad, které stačí pustit rychle (`ONLY=`).
9. Slovník identifikátorů kódu (česko-anglický mix: `episodes`, `mealBolus`, `pravidlo.nizka`, `navrh.overeni`).

**Doporučená struktura místo dnešních 720 tis. znaků:** jedna stránka „Start“ (co je demo, co rozhodnuto, jak spustit, 10 zásad), `15` rozdělit na **normu** (odst. 1–15b, 19) a **historii** (16–18), datový model + katalog akcí generované z kódu, atlasy ponechat jako referenci.

---

## 5. Konkrétní nálezy (seřazeno podle dopadu)

**Vysoký dopad**

1. **Předávka nedefinuje první demo; cíl je ostrá aplikace.** `predani/README.md` ř. 3 („Podle makety se programuje ostrá aplikace“), `00-postup.md` odd. 3 (etapy 0–16, první obrazovka v etapě 5). Zadání „první demo“ z dokumentů nevyplývá.
2. **Neříká, zda se jádro smí použít jako kód.** `00-postup.md` 1.3, řádek `app/core.js`: „ano, jako specifikace chování“. Etapa 3 („celá doménová logika jako knihovna … se stejnými výsledky jako maketa“) implicitně předpokládá přepis ≈ 120 vyjmenovaných funkcí.
3. **Rozpor o tom, kde je zdroj pravdy.** `00-postup.md` 1.5 poslední odstavec: „`15` a podklady … nejsou ve veřejném repozitáři makety; programátor je dostane od vlastníka“. Totéž `00-postup.md` odd. 6 bod 7 a README říkají opak (vlastník 6. 11. rozhodl dát je do repa) a soubory v `predani/zdroj/` skutečně jsou.
4. **Kolize názvů „00–14 jsou historie“.** `00-postup.md` 1.5 bod 2 a `30-prilohy.md` 4.2: „Dokumenty `00`–`14` … jsou historie. Nečerpejte z nich chování.“ Předávka sama se jmenuje `00-postup.md`. Nový čtenář si to vztáhne na hlavní dokument předávky.
5. **Živá ukázka i lokální příběh jsou za přihlášením a předávka neříká, jak to obejít.** `00-postup.md` 1.4 („bez přihlášení se nezobrazí; účet založí vlastník“). Ověřeno: lokálně bez řádků `demo/sync-config.js`, `demo/auth.js`, `demo/sync.js`, `demo/results.js` příběh běží.
6. **Jeden pacient ve stavu; víc pacientů nikde.** `app/core.js` `NF.createState` (ř. 121–152): `patient: { id: 'DEMO-P01' }`, registr uvnitř stavu. Datový model ordinace s více pacienty není v předávce popsán (`00-postup` etapa 1 jen vyjmenuje entity).
7. **Otisk položky závisí na prezentační vrstvě.** `app/core.js` `NF.itemFingerprint(item, guideEntry)` (ř. 175) bere text „Co schvalujete“ z `demo/guide.js`; komentář ř. 289: „text dodá prezentační vrstva … jinak bez něj“. `00-postup` etapa 2 „hotovo, když … otisky fp … se shodují s maketou“ neříká, se kterou variantou.
8. **`15` je nečitelně velký a míchá normu s historií.** 340 079 znaků, 37 řádků nad 2000 znaků; odst. 16–18 tvoří velkou část. Zadání odhadovalo „720 řádků“ – řádků je 727, ale znaků je víc než všech čtyř dokumentů předávky dohromady.
9. **Zastaralé hodnoty uvnitř „jediného zdroje pravdy“.** `15` odst. 17 (ř. ≈ 400, R9): „rozmezí min–max do 5 zápisů, percentily od 8, barevný stupeň reakce od 6“ – kód (`app/core.js` ř. 1042, `minQuantile` 8) a `00-postup` etapa 10 („do 7 zápisů nejnižší–nejvyšší“) se liší; reakce má dva stupně (A32). Podobně `15` odst. 1 „skóre jídel“ v reportu a 29× „čip“ pro zadání glukózy, ač je to od SCHEMA 84 posuvník.

**Střední dopad**

10. **Doba běhu testů.** `00-postup.md` 1.4 „celý běh trvá několik minut“ – u mě přes 15 minut (souběžně běžely i jiné procesy). „Výstup referenčního běhu SCHEMA 87 … (142 prošlo, 0 selhalo)“ vs. stav SCHEMA 88 a 376 testů v příloze 5.
11. **Nejednotné SCHEMA v hlavičkách.** `10-atlas-pacient.md` ř. 1 a 3: „SCHEMA 87“, `NF.SCHEMA = 87`; README, `00-postup`, atlas ordinace, přílohy: SCHEMA 88; kód `NF.SCHEMA = 88`.
12. **Návod na produkční sestavení rozbije HTML.** `00-postup.md` 1.4: „odstraňte řádky s `demo/`“. Ř. 34 HTML je konec komentáře a obsahuje text „složky demo/“; po smazání zůstane neuzavřený `<!--`. Skripty fungují (komentář je až za nimi), ale `</body></html>` skončí v komentáři. Správně: odstranit řádky `<script src="demo/…">` a `<link … demo/demo.css>`.
13. **Odkazy na `CLAUDE.md`, který programátor nemá.** `00-postup.md` odd. 6 bod 3, `20-atlas-ordinace.md` ř. 695 (R4), `30-prilohy.md` 4.2 „Co neplatí (z `CLAUDE.md`)“.
14. **Odkazy z `15` vedou nikam.** README slibuje, že odkazy `navrhy-designu/…` vedou do `zdroj/navrhy-designu/`. Z `15` je 37 různých cílů, které v `zdroj/` nejsou (např. `16-proverka-designu-2026-10-19/06-hlas-a-typografie.md` jako zdroj „hlasu NutriFee“ v odst. 19, `23-schvalovani-2026-10-27/00-SOUHRN.md`, `04-pohledy-2026-10-05/05-souhrn-a-rozhodnuti.md`, `33-mene-je-vic-2026-11-05/07-schema86-obrazovky.md`). Z dokumentů předávky nevede nikam jen `32-overeni-cile-2026-11-04/panel-shoda.cjs` (`30-prilohy.md` ř. 423).
15. **Skript, který generuje přílohy, chybí.** `30-prilohy.md` ř. 3: „Tabulky v přílohách 2, 3 a 5 jsou vygenerované skriptem … vygenerujte je znovu, nepřepisujte ručně.“ Skript v `predani/` ani v repozitáři není – pokyn nejde provést.
16. **Etapa 1 „úložiště“ vs. etapa 11 „server“.** Etapa 1 staví úložiště, etapa 11 server „souběžně, nutné před 12“; etapy 5–6 ale už potřebují, aby plán vydaný lékařem viděl telefon pacienta. Pořadí nedává smysl pro dvě zařízení.
17. **„Otevřené“ rozhodnutí bez vlastníka termínu.** `00-postup` 2.1 (platforma), 2.2 (přihlášení), 2.3 (server), 2.5 (kde běží výpočty), etapa 0 (jazyk) – všechno „na programátorovi a vlastníkovi“, nikde kdo a kdy rozhodne. Blokuje etapu 0.

**Nízký dopad**

18. `00-postup.md` 1.4 `cd maketa-rozhodovaci` vs. README „v kořeni repozitáře“ – obojí sedí jen po přejmenování klonu; stačí to říct jednou.
19. Atlas pacienta ř. 27: „V ostré aplikaci jsou pravidla schválená předem“ – formulace „schváleno předem“ byla vlastníkem zrušená (SCHEMA 34); míněno „před nasazením“.
20. `20-atlas-ordinace.md` obsahuje vzor `obrazovky/ordinace-Oxx-nazev.png` jako cestu (vypadá jako rozbitý odkaz).
21. `15` odst. 1: „skóre jídel“ v reportu, zatímco postup etapa 10 zakazuje pacientovi slovo „skóre“ – pro lékaře to platí, ale bez upřesnění to vypadá jako rozpor.

---

## 6. Výsledek kroků podle README

- Kopie repozitáře do `proverka-prog/maketa-rozhodovaci/`, `15-ZDROJ-PRAVDY-MAKETA.md` a `navrhy-designu/04-pohledy-2026-10-05/scene-items.cjs` o úroveň výš: **návod funguje**, obě dílčí sady soubory najdou (`kontrola2-obsah.test.cjs` ř. 186, `kontrola3-panel.test.cjs` ř. 125). Bez gitu (kopie místo klonu) to funguje stejně.
- Běh `node nutrifee-rozhodovaci-maketa.test.cjs`: VÝSLEDEK_TESTU
- Produkční sestavení (bez `demo/`) přes lokální statický server: běží, lékař projde začátek zařazení.
- Příběh bez přihlášení (bez 4 řádků přihlášení a ukládání): běží, úvodní obrazovka a panel „Ovládání ukázky“ se zobrazí.

## Doporučení

Nepouštět programátora do etap 0–16 jako do „prvního dema“. Vlastník má nejdřív jednou volbou rozhodnout, zda první demo = **jádro `app/` beze změny na dvou zařízeních se sdíleným stavem a modelovým pacientem** (≈ 1 týden, věrné maketě z definice), nebo začátek přepisu ostré aplikace (měsíce). Doporučuji první variantu. K předávce přidat jednu stránku „Start pro demo“ (definice dema, rozhodnuté technologie, jak spustit produkční sestavení i příběh lokálně, datový model a katalog akcí generované z kódu, `CLAUDE.md` pro cílový repozitář) a z `15` oddělit historii (odst. 16–18) od normy.
