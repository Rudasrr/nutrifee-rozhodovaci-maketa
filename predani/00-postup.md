# NutriFee – předání programátorovi: jak postupovat

*Stav makety SCHEMA 90 (11. 11. 2026, commit `ef4f761`). **Tento dokument je plán ostré aplikace.** Pro první demo postupujte podle [`01-cesta-k-demu.md`](01-cesta-k-demu.md) a [`AGENTS.md`](AGENTS.md); odsud potřebujete jen zásady (odd. 1.2) a podle potřeby popisy etap jako příručku. Dokument patří k předání spolu s atlasem obrazovek pacienta (`10-atlas-pacient.md`, obrazovky P01…), atlasem ordinace (`20-atlas-ordinace.md`, obrazovky O01…) a přílohami (`30-prilohy.md`). Cesty k souborům jsou uvedené vůči složce makety (na Disku `maketa-rozhodovaci/`, ve veřejném repozitáři její kořen).*

Dokument se čte shora dolů a podle oddílu 3 se dá postupovat krok za krokem. Každá etapa má cíl, vstupy z makety, co postavit, obrazovky z atlasu, testy z makety jako specifikaci, ověřitelné „hotovo, když…“ a místa, kde se snadno udělá chyba. Kde dokument říká „otevřené“, zdroj pravdy věc neurčuje a rozhodne vlastník. Kde říká „na programátorovi“, je volba technická a vlastník ji nepředepisuje.

---

## 1. Úvod

### 1.1 Co NutriFee je a pro koho

NutriFee pomáhá dospělému s diabetem 2. typu, který má od lékaře **inzulin v pevných dávkách**, jíst konzistentně k dávce. Aplikace se z pacientových vlastních zápisů učí, jak jeho tělo reaguje na jednotlivá jídla, před jídlem mu radí (porce k obvyklé, doplněk, pořadí jídla, procházka), připomíná předepsaný inzulin a ptá se, zda byl podaný. Lékař na kontrole dostane report se souhrnem, reakcemi na jídla, výsledkem rad a s návrhem dalšího plánu, včetně případného podkladu k posouzení dávky. Lékař návrh ověří s pacientem a rozhodne; bez jeho rozhodnutí se nic nemění.

**Kohorta:** dospělý s diabetem 2. typu, senzor glukózy (CGM), bazální inzulin jednou večer a inzulin k jídlu ke třem hlavním jídlům, vše v pevných dávkách. Pacient nebere **žádný jiný lék na diabetes** (ani tablety, ani injekční léky jiného typu) a nemá premixovaný inzulin. Pacient nemá potíže s pohybem, které by mu znemožnily procházku po jídle. Vylučovací kritéria (těhotenství nebo jeho plánování, opakované těžké poklesy glukózy nebo jejich nepoznávání, těžké onemocnění ledvin nebo jater, léčba lékem vyjmenovaným v položce K-KRITERIA, potíže s pohybem, potíže se zrakem nebo pamětí, které znemožní ovládat telefon) lékař potvrzuje při zařazení zaškrtnutím. Lékař je vždy jen jeden: ten, který vydal plán.

**Role a zařízení:** pacient (telefon), sestra (počítač v ordinaci: zaučení, data ze senzoru, část kontroly), lékař (počítač: zařazení a plán, kontrola, schvalovací registr, verze a stopa). Garant schvaluje klinická pravidla v registru; v první studii je garantem lékař.

### 1.2 Co aplikace dělá a co nikdy nedělá

Plné znění je v `15-ZDROJ-PRAVDY-MAKETA.md`, odst. 2. Zkráceně:

1. **Dávku inzulinu určuje jen lékař.** Aplikace ji zobrazuje, ve správný okamžik připomíná a ptá se, zda a v jaké výši byla podána. Nikdy ji nepočítá, nemění a nedoporučuje směr ani výši. O dávce se mluví jen v reportu lékaře, v návrhové kartě „posoudit dávku“ (co aplikace pozorovala · proč návrh vznikl · co ho oslabuje · jak ověřit · větev lékařova schváleného postupu zvýšit / snížit / ponechat, nikdy velikost kroku · rozhodnutí). Větev je doporučení, ne zámek: lékař má u každé dávky volič „jiná dávka“ a změna proti větvi se zapíše jako „rozhodnuto jinak než postup“.
2. **Cílem je konzistence jídla k pevné dávce.** Pacient nepočítá sacharidy a aplikace ho k tomu nevede.
3. **Rady k množství jídla:** před píchnutím oběma směry k obvyklé porci; po píchnutí a při „nevím“ jen z větší porce zpět k obvyklé; **nikdy „snězte víc“**. Po menší porci nebo vynechaném jídle s inzulinem se hned ukáže pravidlo, za 60 minut otázka „Klesla glukóza pod 4?“ a po dvou poklesech za 7 dní karta s obecnou radou na Dnes. Pokles pod 4 při obvyklé porci a dávce podle plánu blokuje v návrhu větev „zvýšit“; od SCHEMA 90 se jako pokles počítá i glukóza „pod 4“ vybraná v kroku 1 před dalším jídlem a větev „zvýšit“ blokuje u všech dávek také čas pod cílem nad mezí. Po výrazně vyšší dávce, než je v plánu (o 2 j. a víc), se hned ukáže obecné pravidlo I-VYSSI, procházka se nenabízí a za 60 minut přijde otázka „Klesla glukóza pod 4?“; o dávce aplikace nic neradí. **Aplikace pacienta nikdy sama nevyzve, aby volal do ordinace.**
4. **Každý výpočet, rada, práh i text pochází ze schválené položky registru a nese ji ve stopě.** Štítek „✓ schváleno“ vidí lékař a garant, pacient ne.
5. **Lékař mezi kontrolami nic nedělá a nic nesleduje.** Všechny jeho akce probíhají s pacientem v ordinaci.
6. **Žádná generativní AI ve výpočtech.** Vše je deterministické a dohledatelné ve stopě. Bez napojení na aplikaci výrobce senzoru: pacient hodnoty opisuje a před kontrolou pošle do ordinace export ze senzoru, který nahraje sestra. Ostrý provoz ukládá data na zabezpečený server NutriFee.
7. Štítek „DEMO · syntetická data · není určeno pro léčbu“ patří jen maketě, jednou a trvale viditelný. První demo má podle rozhodnutí vlastníka 11. 11. 2026 nenápadný trvalý štítek „Demo · jen syntetická data“, v zápatí větu, že není určeno pro léčbu, a u nového pacienta upozornění na smyšlené údaje ([`01-cesta-k-demu.md`](01-cesta-k-demu.md)). Do ostré aplikace štítek nepatří.
8. **V ordinaci se nepíše.** Vše je výběr, zaškrtnutí nebo volič (posuvník hodnoty).
9. V souborech nejsou skutečná jména osob, institucí, výrobců ani produktů.

### 1.3 Co je v maketě a co se přenáší

| Složka | Co obsahuje | Přenáší se? |
|---|---|---|
| `app/core.js` | doména: stav, úložiště, stopa, registr, plán, zápisy, učení, rady, větev nízké glukózy, import exportu, nemoc, souhrny, návrhy lékaři, připomínky (s katalogy `app/data/` 472 klíčů `NF.*`, z toho 395 funkcí; SCHEMA 90) | **demo: jako kód beze změny; ostrá aplikace: jako specifikace chování** (o přepisu se rozhodne po demu) |
| `app/data/` | `registry.js` (43 položek registru), `catalogs.js` (návyky, 8 bezpečnostních pravidel), `foods.js` (171 jídel s údaji pro rady) | **ano, jako data** |
| `app/screens.js`, `app/screens-clinic.js` | obrazovky pacienta, lékaře a sestry (vykreslení do HTML) | demo: jako kód; ostrá aplikace: jako specifikace obsahu a stavů (atlas) |
| `app/ui.js` | akce (asi 157 pojmenovaných akcí), překreslení bez blikání, posuvník hodnoty | demo: jako kód; ostrá aplikace: jako seznam interakcí |
| `app/tokens.css`, `app/design.css`, `app/fonts/`, `app/icons.js`, `design-system/` | designový systém: jediný zdroj hodnot vzhledu je `tokens.css`, živý katalog komponent s inspektorem je `design-system/index.html` | **ano, 1:1**, z katalogu ale bez sekce „Prezentační vrstva“ a bez načítání `demo/demo.css` ([`40-design-system.md`](40-design-system.md)) |
| `demo/` | prezentační vrstva: modelový pacient a příběh (`fixtures.js`, `tour-content.js`), panel vyprávění, průvodce položkami (`guide.js`), přihlášení a ukládání rozhodnutí garanta makety (`auth.js`, `sync.js`, `results.js`) | **ne** (výjimky níže) |
| `*.test.cjs` | 20 testových souborů, 432 zapsaných testů (vysvětlení počtů v příloze 5.1; od SCHEMA 90 nová sada `schema90-jadro.test.cjs`, 37 testů) | ano, jako spustitelná specifikace (příloha 5) |
| `rychle.test.cjs`, `zlate-vystupy/` | od SCHEMA 89: rychlá sada (15 řádků výsledku včetně podsady `schema90-jadro`, asi 40 s) a zlaté výstupy: pět souborů JSON z přehrání 32 scén jen nad jádrem (`otisky`, `pribeh`, `kontrola`, `rady`, `stopa`), generátor `zlate-vystupy/generuj.cjs` a test `zlate-vystupy.test.cjs` v kořeni (9 testů) | ano: zábradlí dema a důkaz shody případného přepisu |

**Pro demo se jádro přenáší jako kód** (rozhodnutí vlastníka 9. 11. 2026): `app/` celé, `app/data/`, tokeny, písma, ikony a katalog beze změny, z `demo/` jen `fixtures.js` jako data. **Pro ostrý provoz se o přepisu jádra rozhodne po demu**; etapy v oddílu 3 popisují cestu přepisem a zlaté výstupy pak slouží jako důkaz, že přepis počítá stejně.

Výjimky ze složky `demo/`:

- `demo/guide.js` je **obsahová specifikace**: oddíly „Co schvalujete“ a „Co se stane při zamítnutí“ jsou to, co garant posuzoval, a pole `ucinek` strojově popisuje, co má aplikace udělat se zamítnutou položkou (vypnout s oznámením na místě, nebo jen zapsat nesouhlas; co zmizí a co musí zůstat).
- `demo/fixtures.js` (modelový pacient, období s 92 dny, export ze senzoru) se hodí jako **testovací data** pro převedené testy. Do produktu nepatří.
- `demo/sync.js` je vzor odolného klienta (fronta, opakování, pravdivý stav uložení), ne vzor serveru.

Vynecháním složky `demo/` a jejích řádků v HTML vznikne **produkční sestavení** makety: jádro bere skutečný čas zařízení, ukládá pod klíčem `nutrifee`, roli určuje adresa (`?role=pacient` výchozí, `?role=lekar`, `?role=sestra`) a začíná bez plánu. Tak se nejlépe vidí, co je jádro.

### 1.4 Jak maketu spustit a pustit testy

- **Testy** (potřebují jen běhové prostředí JavaScriptu s příkazem `node`, bez závislostí a bez sítě). Spouštějí se ve složce makety, tedy v kořeni repozitáře:
  ```
  node rychle.test.cjs                          # rychlá sada, asi 40 s (od SCHEMA 89)
  node zlate-vystupy.test.cjs                   # zlaté výstupy jádra (od SCHEMA 89)
  node schema90-jadro.test.cjs                  # jádro a synchronizace SCHEMA 90 (pouští ji i rychlá sada)
  node nutrifee-rozhodovaci-maketa.test.cjs     # celá sada
  ```
  Hlavní soubor pustí i ostatní sady jako samostatné procesy; celý běh trvá **asi 15–30 minut podle stroje**. Jednotlivé sady jdou pustit samostatně (`node schema84-jadro.test.cjs`), u většiny výběr testů proměnnou `ONLY=část názvu`. **Kontrolujte celý výstup** (řádky `FAIL`), ne jen poslední řádek. Výstup referenčního běhu uložte jako srovnání. Když vše projde, hlavní soubor vypíše 144 řádků OK: 127 vlastních testů a 17 řádků „Sada … projde“, z nichž každý spustí jednu další sadu jako samostatný proces. Sadu `schema90-jadro.test.cjs` hlavní soubor nepouští, pouští ji rychlá sada. Ve zdrojích 20 souborů je 432 zapsaných testů (vysvětlení v příloze 5.1).
- **Čas:** maketa i demo počítají vždy v českém čase (Europe/Prague, `NF.TZ`) a den aplikace končí ve 4:00; testy pásmo přepínají `NF.configure({ zone })`.
- **Ukázka s příběhem** je publikovaná jako statická stránka a bez přihlášení se nezobrazí; účet založí vlastník. Lokálně ji spustíte bez přihlášení, když v kopii HTML vynecháte řádky `demo/sync-config.js`, `demo/auth.js`, `demo/sync.js` a `demo/results.js` ([`01-cesta-k-demu.md`](01-cesta-k-demu.md)). Prochází se tlačítkem **Další ▶**, asi 60 minut; lékař a sestra jsou na počítači, pacient v rámečku telefonu. Tlačítko **Přehled scén** skočí na kteroukoli scénu.
- **Produkční sestavení lokálně:** zkopírujte `nutrifee-rozhodovaci-maketa.html`, odstraňte řádek `<link … href="demo/demo.css…">` a všechny řádky `<script src="demo/…">`. Komentář nad nimi nechte celý: jeho druhý řádek obsahuje text „složky demo/“ a po jeho smazání by zůstal neuzavřený. Pak soubor otevřete v prohlížeči, případně s `?role=lekar` nebo `?role=sestra`. Aplikace začíná zařazením bez plánu. Pro uložení stavu mezi obnoveními stránky spusťte ve složce makety libovolný statický server.
- **Katalog komponent:** `design-system/index.html` (čte `app/tokens.css` a `app/design.css` přímo).

### 1.5 Zdroj pravdy a co dělat při rozporu

1. **`15-ZDROJ-PRAVDY-MAKETA.md`** je jediný zdroj pravdy. Při rozporu s ním platí **chování publikované makety** (rozhodnutí vlastníka 15. 10. 2026: co maketa dělá, platí; dokument se dopisuje za ní).
2. Starší dokumenty projektu `00`–`14` (v kořeni projektu vlastníka, ne tento `00-postup.md` předávky), `INSTRUKCE-PROJEKTU-CLAUDE.md` a `CHANGELOG-MIGRACE.md` jsou historie. Nečerpejte z nich chování. Totéž platí pro deník a staré rozhodnutí v `15` odst. 16 a 17: při rozporu s kódem platí chování makety.
3. `15` odst. 18 („Proč je to takhle – a co jsme zavrhli“) vysvětluje důvody rozhodnutí. Než cokoli navrhnete jinak, přečtěte ho; výtah zavržených variant je v příloze 4.
4. **Při rozporu nebo mezeře se zeptejte vlastníka.** Nevybírejte potichu. Otevřené rozpory jsou v oddílu 5 tohoto dokumentu, rozpory vyřešené ve SCHEMA 87, 88 a 90 v oddílu 6.

`15` a podklady ze složky `navrhy-designu/` jsou ve veřejném repozitáři makety ve složce `predani/zdroj/` (rozhodnutí vlastníka 6. 11. 2026, oddíl 6 bod 7). Některé odkazy v `15` vedou na podklady, které do `predani/zdroj/` nepatří; ty jsou historie a k programování nejsou potřeba.

---

## 2. Architektura cílového stavu

Popis vychází z `15` (odst. 2, 3, 6a, 12–14) a z podkladů `navrhy-designu/30-kontrola4-a-pohledy-2026-10-29/` (05, 06, 07, 10). Co `15` neurčuje, je označené jako otevřené.

```
 Pacient (telefon)                      Ordinace (počítač)
 ┌──────────────────────────┐           ┌───────────────────────────────────────┐
 │ Dnes · Jídla · Můj plán ·│           │ Lékař: Zařazení a plán · Kontrola ·    │
 │ Bezpečí; 3 kroky zápisu; │           │        Schvalovací registr · Verze a   │
 │ připomínky v telefonu    │           │        stopa                           │
 │ opsané hodnoty ze senzoru│           │ Sestra: zaučení · data ze senzoru ·    │
 └────────────┬─────────────┘           │        s pacientem před lékařem        │
              │ zápisy, odpovědi        └──────────────┬────────────────────────┘
              ▼                                        │ kontrola, plán, registr
        ┌───────────────────────────────────────────────┴───┐
        │ Zabezpečený server NutriFee (šifrovaný)           │
        │ data pacientů · plány · registr s verzemi a otisky │
        │ stopa · podpisy garanta                            │
        └───────────────────────────────────────────────────┘
 Export ze senzoru: pacient ho mimo aplikaci pošle do ordinace,
 sestra ho na kontrole nahraje; převod do jednotného tvaru (čas + mmol/l).
 Žádné napojení na aplikaci ani rozhraní výrobce senzoru.
```

### 2.1 Aplikace pacienta (telefon)

- Čtyři záložky: **Dnes** (co teď a jak si vedu), **Jídla**, **Můj plán**, **Bezpečí**; zápis jídla ve třech krocích, zpětný zápis, svačina, režim nemoci, převzetí plánu, přehled před kontrolou.
- Den aplikace končí ve 4:00 (S-PRIPOMINKY `den_konec`): jídlo do 4:00 patří k předchozímu dni. Aplikace běží v českém čase; při jiném pásmu telefonu ukáže větu „Na cestách se řiďte pokyny svého lékaře; zápisy jsou v českém čase.“ Cestování je mimo rozsah studie.
- Hodnoty glukózy pacient **opisuje** z aplikace senzoru celými čísly posuvníkem (pod 4 · 4 … 15 · nad 15 · nemám); jeden pohled do senzoru na jídlo.
- **Připomínky v telefonu:** nejvýš 4 denně (tři jídla a bazál) v časech vybraných se sestrou a otázka „Klesla glukóza pod 4?“ za 60 minut po menší porci s inzulinem, po vynechaném jídle s inzulinem a po výrazně vyšší dávce. V maketě je oznámení jen komponenta (`V.phoneNotice`, `NF.notifications`); jak se doručí v telefonu, je na programátorovi.
- Přístupnost pro pacienta 65+: cíl dotyku aspoň 48 px (hlavní akce 56 px), hlavní text a volby od 17 px, doplňkový text od 15 px a nic pod 15 px (rozhodnutí vlastníka 11. 11. 2026, hlídá `tokeny.test.cjs`), kontrast aspoň 4,5 : 1, ověřit písmo 160 % (`15` odst. 15a).
- **Pro první demo rozhodnuto** (vlastník 9. 11. 2026): webová aplikace, pacient ji má na telefonu jako ikonu na ploše (PWA). **Pro ostrou aplikaci otevřené:** platforma aplikace (nativní, nebo webová) a to, zda bezpečnostní pravidla a výpočty běží v telefonu i bez sítě. Podklad 06 (C11) doporučuje, aby pravidla v telefonu fungovala bez sítě.

### 2.2 Rozhraní ordinace (počítač)

- **Lékař:** zařazení a startovní plán, kontrola jako vedený tok o čtyřech krocích (souhrn → návrhy jeden po druhém → potvrzení plánu → předání pacientovi), schvalovací registr (v první studii lékař = garant), verze a stopa. Šířka od 1600 px: pruh · pracovní sloupec · kontextový sloupec jen ke čtení.
- **Sestra:** zaučení s náhledem telefonu pacienta, nahrání exportu ze senzoru, část „S pacientem před lékařem“ (léky, zdravotní stav, hmotnost, HbA1c z karty, body, které nejdou ověřit z dat).
- Personál se **nikdy nepřihlašuje účtem pacienta** a nezná jeho heslo.
- **Otevřené:** přihlášení personálu a rozlišení rolí v ostrém provozu (podklad 05 doporučuje dvoufázové přihlášení pro garanta a správce), napojení na kartu pacienta v ordinačním systému (maketa bez napojení říká „Karta pacienta s NutriFee propojená není…“; `15` odst. 4).

### 2.3 Zabezpečený server NutriFee

- `15` zásada 6: ostrý provoz ukládá data pacientů na **zabezpečený, šifrovaný server NutriFee**, který připravuje vývojář serveru. Zásada 5 platí dál: lékař mezi kontrolami data nečte, server mu nic neposílá.
- V ostré aplikaci je **registr na serveru jako data s verzemi a otisky**, ne v kódu; schválení je podpis garanta nad konkrétní verzí a otiskem; historie jen přibývá.
- Hlavičky CSP (včetně `frame-ancestors`), `Referrer-Policy` a `Permissions-Policy` posílá server, ne `<meta>` stránky.
- **Jádro pro synchronizaci (od SCHEMA 90):** stav se dělí na doménu (posílá se) a pohled (zůstává v zařízení): `NF.VIEW_KEYS`, `NF.VIEW_PATHS`, `NF.isViewKey`, `NF.domainOf`, `NF.domainJson`. Vzdálený stav se spojuje `NF.mergeRemote(místní, vzdálený)` → `{ ok, state, reason }` (`newer` = vzdálený je z novější verze a klient se musí obnovit, `older`, `stale`, `shape`) a výsledek se nastaví `NF.setState`. Háček `NF.onChange(fn)` volá `fn(S, { saved, key, action, domainChanged, rev, schema, reset })` jen po akci, ne při minutovém tiku, psaní, `setState`, bootu ani migraci; vrstva posílá jen při `domainChanged`. `S.rev` je pořadí doménové verze; doporučený je podmíněný zápis na serveru podle `rev`. `NF.readOnly` brání starší verzi přepsat novější data, pád vykreslení čistý stav neuloží. ID zápisů počítá každé zařízení zvlášť, vrstva pro souběh potřebuje předponu zařízení. Popis je v komentáři u `NF.VIEW_KEYS` v `app/core.js` a v [`01-cesta-k-demu.md`](01-cesta-k-demu.md).
- **Otevřené:** technologie, umístění a provozovatel serveru, model dat na serveru, rozhraní mezi telefonem, ordinací a serverem a řešení souběhu nad API jádra. Doporučení (ne zadání) jsou v podkladu 05 odst. 3: odchozí fronta se stálým klíčem záznamu, dva časy (událost na zařízení a přijetí serverem), identitu, roli a čas plní server, pravdivý stav uložení u každého záznamu, čtení bez stropu, servery v EU, testy oprávnění v průběžné integraci.

### 2.4 Data ze senzoru bez napojení na výrobce

- Během plánu pacient opisuje hodnotu před jídlem a nejvyšší hodnotu do 2 hodin po předchozím jídle; noční hodnoty neopisuje.
- Před kontrolou pacient export ze senzoru pošle do ordinace mimo aplikaci; aplikace mu to připomene od 7 dní před kontrolou. **Export nahrává jen sestra** v části „Sestra · Data ze senzoru“ před zahájením kontroly. Měření 0–180 min po jídle se přiřadí k zápisu a nahradí opsané hodnoty, nejnižší hodnota do 4 h po jídle se počítá jako pokles (od SCHEMA 90, Z-IMPORT `pokles_min`), noční hodnoty jdou k nocím pro bazál, pokrytí dává čas v cíli. Export se počítá jen za období aktivního plánu: celý z jiného období se odmítne, částečný se ořízne (od SCHEMA 90). Export nahraný po zahájení kontroly ji přepočítá. Výsledek: „Export nahrán a převeden · doplněno M jídel a K nocí“ a shoda opsaných vrcholů s exportem. Nečitelný soubor se odmítne obecnou hláškou a nic z něj se nenačte.
- Obrazovky o typech a formátech exportu, portálech a účtech **nemluví**.
- **Otevřené (`15` odst. 6a):** jak pacient export získá a pošle do ordinace a převodníky exportů senzorů v kohortě do jednotného tvaru (čas + mmol/l) s testy na ukázkových souborech. Převodník makety `NF.parseSensorCsv` je jen implementace makety.

### 2.5 Deterministické výpočty se stopou

- Každý výpočet, rada a návrh zapíše do stopy vstupní zápisy, položku registru s verzí a parametry, mezivýsledky, výstup a skutečného aktéra (`NF.log`, `S.events`; obrazovka lékaře „Verze a stopa“). **SCHEMA 87:** události výpočtu a bezpečnostních pravidel nesou `polozky` (id, verze, otisk `NF.itemFingerprint`, stav; `NF.TRACE_ITEMS`, `NF.itemRefs`); do stopy jdou i zobrazení pravidel I-HYPO, I-MENE, I-NEVIM, odpovědi pacienta, podmínky zařazení, výchozí hodnoty, ověření dávek a ověřovací body lékaře (`15` odst. 14). **Délka stopy v maketě (nejvýš 4000 událostí, data jen u posledních 1000, `NF.TRACE_MAX`, `NF.TRACE_FULL`) je omezení makety; ostrá aplikace má stopu úplnou na serveru, nic nekrátí ani nemaže.**
- Ve výpočtech není generativní AI ani síť (hlídá test). Věta „co se dělo“ v reportu je šablona z pravidel.
- Výpočty v maketě běží v jednom stavu v zařízení. Kde poběží v ostré aplikaci (telefon, server, obojí), je **otevřené**; výsledek musí být stejný a dohledatelný.

### 2.6 Registr se schvalováním

- 43 položek: **29 klinických** (schvaluje garant: Schválit / Zamítnout, poznámka nepovinná, až po rozhodnutí) a **14 provozních** (`scope: 'provozni'`, neschvaluje nikdo, nemají stav ani štítek). Tabulka je v příloze 2.
- Stavy klinické položky: ke schválení (výchozí) · schváleno · zamítnuto. Zamítnutá položka nepůsobí a na místě, kde působila, je oznámení. Výjimky „zamítnutí = záznam nesouhlasu“: C-CILE, K-KRITERIA, Z-GLUKOZA, P-LEKAR.
- Oprava pravidla = **nová verze ke schválení**. Ve studii platí jen vypnutí položky; garant ho navrhuje a výrobce provádí v řízení změn, opravy až po období (`15` odst. 13).
- **Maketa se chová, jako by položky byly schválené**, i když čekají „ke schválení“. V ostrém provozu nerozhodnutá položka nesmí působit. Rozhodnutí garanta v maketě jsou neformální; pro ostrý provoz se pravidla podepisují znovu (`15` zásada 6).
- Postup s rozhodnutími z makety (otisk znění, export pro správce, platnost pro dnešní znění) popisuje `navrhy-designu/30-kontrola4-a-pohledy-2026-10-29/10-predani-programatorovi.md`, odst. 5–8. Algoritmus otisku a testovací vektory tam platí a hlídá je `ukladani.test.cjs`; počty položek tam (40, 12 provozních) jsou zastaralé, dnes 43 a 14.

---

## 3. Posloupnost etap

Pořadí respektuje závislosti v kódu: skoro každá funkce jádra potřebuje aktivní plán (dávky, cíle, pravidla) a registr (parametry a platnost položek), obrazovky pacienta potřebují vydaný a převzatý plán a kontrola potřebuje data pacienta na serveru. Proto jde nejdřív doména bez obrazovek, pak ordinace do vydání plánu, pak pacient a nakonec kontrola, registr garanta a provoz.

| # | Etapa | Na čem stojí |
|---|---|---|
| 0 | Příprava a převod testů | – |
| 1 | Datový model, úložiště, čas a stopa | 0 |
| 2 | Registr, parametry a katalogy | 1 |
| 3 | Výpočetní jádro | 1, 2 |
| 4 | Designový systém a stavební prvky | – (souběžně s 1–3) |
| 5 | Zařazení a startovní plán (lékař) | 3, 4 |
| 6 | Zaučení (sestra) a převzetí plánu (pacient) | 5 |
| 7 | Bezpečnostní pravidla a Bezpečí | 2, 4 |
| 8 | Zápis jídla pacientem | 6, 7 |
| 9 | Dnes, připomínky, nízká glukóza, nemoc, zpětná vazba | 8 |
| 10 | Jídla, Můj plán a přehled před kontrolou | 8, 9 |
| 11 | Server a synchronizace | 1 (stavět souběžně, nutné před 12) |
| 12 | Import exportu ze senzoru | 3, 11 |
| 13 | Kontrola v ordinaci | 11, 12 |
| 14 | Potvrzení a vydání nového plánu | 13 |
| 15 | Schvalovací registr, garant, verze a stopa | 2, 13 |
| 16 | Provozní věci a příprava ostrého provozu | vše |

Ve všech etapách platí:

- **Účinek zamítnutí** položek, které etapa používá, se staví hned v ní (podle `ucinek` v `demo/guide.js` a podle testů účinku), ne až v etapě 15.
- Texty obrazovek berte z položek registru a katalogů (`texts`, `lists`, `labels`), čísla dosazujte z parametrů, nic nepište natvrdo (`15` odst. 19, hlas NutriFee bod 6).
- Pacientovi se vyká bez rodu, hlas je „my“, vždy „glukóza“, desetinná čárka, „j.“ a „mmol/l“ s nezlomitelnou mezerou (`NF.nbspText`, `NF.z`).
- Názvy testů jsou v příloze 5. **Specifikací je vždy tělo testu, ne jeho název.** Čtyři zastaralé názvy SCHEMA 87 opravila; zůstal název „volič dávky mřížkou“ v `kontrola4-obsah.test.cjs`, jehož tělo testuje posuvník.

### Etapa 0 – Příprava a převod testů

- **Cíl:** mít v cílovém projektu spustitelnou specifikaci a referenční výsledky makety.
- **Vstupy:** celá složka makety; `15`; příloha 5 tohoto předání; `demo/fixtures.js` (modelový pacient a kapitoly příběhu); referenční výstup `node nutrifee-rozhodovaci-maketa.test.cjs`; od SCHEMA 89 zlaté výstupy `zlate-vystupy/` (JSON nezávislý na jazyce) a rychlá sada `rychle.test.cjs`; od SCHEMA 90 `schema90-jadro.test.cjs` (běží bez prohlížeče nad jádrem i nad produkčním sestavením a projde i v repozitáři dema). Zlaté výstupy ve SCHEMA 90 přegenerované záměrně (43/29 položek, 8 pravidel v plánu, pátá podmínka zařazení, bod 11 D-POSTUP); rady ani dávky se nezměnily.
- **Co postavit:** cílový projekt a testovací prostředí (jazyk a nástroje jsou na programátorovi a vlastníkovi; `15` je neurčuje). Přípravek „modelový pacient“ převzatý z `demo/fixtures.js` jako testovací data: období 92 dnů, zápisy, export a kapitoly, na které testy skáčou (`chapter('week')`, `chapter('reviewProposals')` apod.). Rozdělení testů na ty, které se převádějí (jádro, obrazovky, vzhled), a ty, které patří jen ukázce (návod v příloze 5).
- **Obrazovky z atlasu:** žádné.
- **Testy jako specifikace:** zatím jen spuštění všech sad v maketě a uložení výstupu.
- **Hotovo, když:** v maketě projdou všechny sady bez řádku `FAIL`; v cílovém projektu běží přípravek modelového pacienta a první převedený test (doporučeno „Aplikace nikde nepočítá ani nenavrhuje dávku; volí ji lékař“).
- **Pozor:** modelová data nepatří do produktu. Testy makety často porovnávají vykreslený text; v cílovém projektu porovnávejte stav a obsah obrazovky stejnými větami, nezjednodušujte je.

### Etapa 1 – Datový model, úložiště, čas a stopa

- **Cíl:** stav aplikace, který jde uložit, načíst a dohledat, se stopou každé akce. Stopa je úplná: krácení v maketě (4000 událostí, data u posledních 1000) se nepřebírá (SCHEMA 87).
- **Vstupy:** `app/core.js` – `NF.createState` (tvar stavu), `NF.load`, `NF.save`, `NF.stateShapeOK`, `NF.migrated`, `NF.log`, `NF.hooks`, `NF.TRACE_ITEMS`, `NF.traceItemIds`, `NF.itemRefs`, `NF.noteRule`, `NF.uid`, `NF.syncUid`, `NF.now`, `NF.configure({ now, storage: { get, set } })`, `NF.storage`, `NF.onChange` (od SCHEMA 89: vyměnitelné hodiny a úložiště a háček na změnu stavu; `NF.save` vrací `false`, když se neuložilo; od SCHEMA 90 háček jen po akci s `action`, `domainChanged`, `rev`, `reset`), od SCHEMA 90 doména a pohled `NF.VIEW_KEYS`, `NF.VIEW_PATHS`, `NF.domainOf`, `NF.mergeRemote`, `NF.readOnly`, `NF.backup`, český čas `NF.TZ`, `NF.zoneIso`, `NF.tzMismatch`, `NF.configure({ zone })`, den aplikace `NF.appDay`, `NF.appHour`, `NF.tick`, `NF.clockModel`, `NF.daysBetween`, `NF.addDays`, `NF.addMin`, `NF.validIso`, formátovací funkce (`NF.fmtDate`, `NF.fmtTime`, `NF.nbspText`, `NF.z`, `NF.plural`); slovník `15` odst. 19 (sloupec „Kód“).
- **Co postavit:** entity pacient, plán (P1, P2… s dávkami, návyky, pravidly a výjimkami, cíli, vypnutými radami, platností), zápis jídla, jídlo, sledování nízké glukózy, bazál, nemoc, import, kontrola, registr (položky a historie), události stopy. Stopa jen přibývá a nese aktéra, položku, verzi, parametry, vstupy a výstup. Identifikátory záznamů navazují po načtení za uložené.
- **Obrazovky z atlasu:** žádné (stopu ukazuje obrazovka „Verze a stopa“ v atlasu ordinace, staví se v etapě 15). Které obrazovky co zapisují, říká u každé obrazovky oddíl „Co jde do stopy“ v atlasech.
- **Testy jako specifikace:** v hlavní sadě „SCHEMA 87 (bod 1): pravidla pod 4, nevím a menší porce jdou do stopy jako pravidlo.vysoka; události výpočtu nesou verzi a otisk položek; krácení stopy je omezení makety“ a „SCHEMA 87 (bod 1): odpovědi pacienta, podmínky zařazení, výchozí hodnoty, ověření dávek a ověřovací body lékaře jdou do stopy“; `robustnost.test.cjs` celý (poškozený stav, `bind`, NaN, escapování, vykreslení bez vedlejších účinků, determinismus); v hlavní sadě „Robustnost: kalendářní dny, zpětný čas nikdy v budoucnosti, bazál po půlnoci k předchozímu dni, inzulin přes půlnoc“, „Robustnost: osekaný stav se doplní, cizí schéma se zálohuje a ohlásí…“, „Robustnost: akce bez stavu nepadají…“, „Stopa má vstupy a výstupy výpočtů; bez exportu“; v `zaverecne80.test.cjs` „03 A2: po obnovení stránky nová ID navazují za uložená“; `schema90-jadro.test.cjs` „K1: …“, „K2: …“, „K3: …“, oba testy „K4: …“, „K6 + bod 11: čas v Europe/Prague…“, „Bod 1: den aplikace končí ve 4:00…“, „Kód K12, K13: dny plánu kalendářně (jarní změna času)…“.
- **Hotovo, když:** stav přežije uložení a načtení beze změny; poškozený stav aplikaci neshodí a zůstane záloha; minutový tik ani psaní nic neukládá a synchronizaci nehlásí; starší verze nepřepíše data novější; pozdní večeře ve 0:20 je večeře předchozího dne; čas je vždy v Europe/Prague; kalendářní dny nezávisí na hodině ani na změně času; každá akce zapíše do stopy událost se skutečným aktérem.
- **Pozor:** maketa po změně verze rozehraný stav zahodí (záloha zůstane); to platí jen pro maketu. Data pacientů se zahodit nesmějí; migrace stavu mezi verzemi ostré aplikace jsou na programátorovi. Čas události ze zařízení je klinický údaj (jídlo, inzulin), ukládejte ho s časovým pásmem. Podzimní změna času je popsaná jen v dokumentaci (`15` odst. 7a, komentář `NF.now`).

### Etapa 2 – Registr, parametry a katalogy

- **Cíl:** registr položek jako data s verzí, stavem, parametry v mezích, historií a otiskem znění; katalogy jídel, návyků a pravidel.
- **Vstupy:** `app/data/registry.js`, `app/data/catalogs.js`, `app/data/foods.js`; v `app/core.js` `NF.seed`, `NF.registryItems`, `NF.item`, `NF.itemState`, `NF.usable`, `NF.param`, `NF.PARAM_BOUNDS`, `NF.clampParam`, `NF.decideItem`, `NF.applyDecision`, `NF.newVersion`, `NF.itemTouched`, `NF.itemNote`, `NF.registrySummary`, `NF.garantItems`, `NF.canonJson`, `NF.itemFingerprint`, `NF.instructionCatalog`, `NF.instructionDefaults`, `NF.instrHtml`, `NF.instrTextOf`, `NF.instrParts`, `NF.dropRuleRefs`, `NF.habitCatalog`; `demo/guide.js` (texty „Co schvalujete“, „Co se stane při zamítnutí“, pole `ucinek`); algoritmus otisku v podkladu `30-…/10-predani-programatorovi.md` odst. 5.
- **Co postavit:** načtení 43 položek (29 klinických, 14 provozních); stavy ke schválení · schváleno · zamítnuto jen u klinických; rozhodnutí jen Schválit a Zamítnout, poznámka nepovinná; historie jen přibývá; nová verze ke schválení; otisk znění (`fp`) podle algoritmu makety; API „platí položka?“ a „hodnota parametru“ s mezemi. Parametr zamítnuté položky vrací výchozí hodnotu z kódu jen tam, kde to maketa dělá (výjimky se záznamem nesouhlasu).
- **Obrazovky z atlasu:** žádné (registr garanta je etapa 15).
- **Testy jako specifikace:** v hlavní sadě „Každá rada a výpočet nese položku registru; zamítnutá položka přestane působit“, „Registr: rozhodnutí se uloží ihned, historie jen přibývá, lze měnit“, „Registr R13: cíle glukózy z položky C-CILE s fallbackem; větve a ověřovací body z D-POSTUP…“; `kontrola4-obsah.test.cjs` „Bod 1: každá položka má verzi; otisk je deterministický…“; `ukladani.test.cjs` „31 B4 + C1 + C8 + C9: otisky jdou přepočítat… testovací vektory…“; `schema90-jadro.test.cjs` „Nové položky a verze jsou „ke schválení“; meze parametrů obsahují výchozí hodnoty“, „Klinika K11: okno pro návrh k dávce není širší než okno pro učení…“; `schema84-jadro.test.cjs` „Verze: NF.SCHEMA …, ?v=… v HTML, data-version=… v katalogu; D-POSTUP a S-SEMAFOR nesou nové parametry s mezemi“ (číslo verze v názvu se mění s každou SCHEMA, výběr `ONLY="Verze: NF.SCHEMA"`); v hlavní sadě „SCHEMA 87 (body 4, 5, 6): meze pěti parametrů; denní doby slotů z registru (S-PRIPOMINKY, provozní); výchozí oznámení jádra bez prezentační vrstvy“; `kontrola2-obsah.test.cjs` „A3–A5, B4: každá garantová položka má v průvodci popis účinku zamítnutí (ucinek)…“.
- **Hotovo, když:** registr má 43 položek s verzemi shodnými s maketou (SCHEMA 90: B-HYPO v3, D-POSTUP v2, K-KRITERIA v2, D-PRAND v2, D-BAZAL v2, Z-IMPORT v2, S-PRIPOMINKY v2 a nová I-VYSSI); otisky `fp` všech 29 klinických položek ve výchozím znění se shodují s maketou (otisk rozhodnutí garanta a testovací vektory se ve SCHEMA 89 nezměnily; otisk ve stopě je od SCHEMA 89 otisk jádra `NF.itemFingerprint(položka)` bez průvodce a vychází stejně s prezentační vrstvou i bez ní) a testovací vektory z podkladu 10 odst. 5.9 sedí; provozní položka nemá stav; parametr mimo meze nejde uložit.
- **Pozor:** `id` položky se nikdy nemění, změna znění je nová verze. Od SCHEMA 87 mají meze všechny číselné parametry (příloha 2) a hrubé denní doby slotů jsou parametry provozní položky S-PRIPOMINKY (`snidane_do`, `obed_do`, `vecere_do`, čte je `NF.daypartEnd`). Vlastník 7. 11. 2026 rozhodl, že denní doby slotů zůstávají provozní a garant je neschvaluje (SCHEMA 88). Otevřené zůstává jen, zda meze parametrů patří do otisku znění (oddíl 5 bod 1). Bezpečnostní pravidla I-* mají hodnotu `{v}` s mezemi v katalogu pravidel; od SCHEMA 90 jsou stejné meze i v `NF.PARAM_BOUNDS` (I-VYSOKA a I-VYSSI pevně). Nové parametry SCHEMA 90 jsou v příloze 2 (`den_konec`, `pokles_min`, `noc_od`, `noc_do`, `spani_od`, `ranni_otazka_h`, `zpetne_h`, `velmiNizka`, `nad_j`).

### Etapa 3 – Výpočetní jádro

- **Cíl:** celá doménová logika jako knihovna bez obrazovek a bez sítě, se stejnými výsledky jako maketa nad modelovým pacientem.
- **Vstupy (`app/core.js`, doporučené pořadí převodu):**
  1. Plán, dávky, cíle a sloty: `NF.activePlan`, `NF.planAt`, `NF.planById`, `NF.doseSince`, `NF.targets`, `NF.defaultTargets`, `NF.TARGET_PRESETS`, `NF.instructions`, `NF.planHabits`, `NF.planAdvice`, `NF.mealState`, `NF.daySlots`, `NF.focusMeal`, `NF.snackFirst`, `NF.slotBeforePlan`, `NF.appDay`, `NF.skipMeal`, `NF.insulinInBody`, `NF.skippedWithInsulin`, `NF.isSnack`, `NF.daypartEnd` (parametry S-PRIPOMINKY; `NF.DAYPART_END` jen jako výchozí hodnota), `NF.DOSE_RANGE`, `NF.validDose`, `NF.clampDose`, `NF.INS_AGO_MAX`.
  2. Zápisy a čistá data: `NF.peakOf`, `NF.riseOf`, `NF.windowFor`, `NF.epInTarget`, `NF.chip`, `NF.isLowValue`, `NF.complete`, `NF.onTime`, `NF.tolerance`, `NF.snackAfter`, `NF.latePodani`, `NF.inIllness`, `NF.sameDoseNow`, `NF.usableEp`, `NF.whyNotUsable`, `NF.usableForDose`, `NF.whyNotForDose`.
  3. Učení jídel: `NF.foodStats`, `NF.confidence`, `NF.reactionLabel`, `NF.settleLabels`, `NF.similarPool`, `NF.blendedShare`, `NF.impression`, `NF.slotStates`, `NF.divergence`, `NF.answerDivergence`, `NF.unstable`, `NF.strongFoods`, `NF.leverStats`, `NF.baseStats`, `NF.leverLower`, `NF.multiAdvice`.
  4. Rady a uložení zápisu: `NF.LEVERS`, `NF.adviceGate`, `NF.leverFits`, `NF.orderParts`, `NF.addonFor`, `NF.addonTries`, `NF.addonWithdrawn`, `NF.leverText`, `NF.talksAmount`, `NF.advise`, `NF.adviseAfter`, `NF.walkWindow`, `NF.saveEpisode`, `NF.correctInsulin`, `NF.confirmPendingInsulin`, `NF.confirmBasal`, `NF.lastAnswers`; od SCHEMA 90 `NF.higherDose`, `NF.watchEpisode`, `NF.canEditEpisode`, `NF.editEpisode`, `NF.deleteEpisode`, `NF.validFoodName`.
  5. Nízká glukóza a pravidla v situaci: `NF.addHypoWatch`, `NF.hypoWatchState`, `NF.pendingHypoWatch`, `NF.answerHypoWatch`, `NF.setManualLow`, `NF.lowEvents`, `NF.epLowBefore`, `NF.lowBeforeOwner`, `NF.epLowAfter`, `NF.nightAsked`, `NF.nightLows`, `NF.hypoAlert`, `NF.noteHigh`, `NF.lowNowText`, `NF.hasInstruction`.
  6. Import exportu: `NF.parseSensorCsv`, `NF.parseSensorTime`, `NF.importReadings`, `NF.peakAgrees`, `NF.importText`, `NF.importAgreeText`, `NF.sensorSummaryFrom`, `NF.sensorImportFor`, `NF.sensorPeriod`, `NF.recomputeReview`.
  7. Nemoc a zpětná vazba: `NF.setIllness`, `NF.illnessDays`, `NF.illnessLong`, `NF.lastResult`, `NF.thanks`, `NF.checkMilestones`, `NF.pathStats`, `NF.weave`, `NF.weekSummary`, `NF.howAmI`, `NF.notifications`, `NF.doseOffPlan`, `NF.yesterdayGaps`, `NF.returnAfterGap`.
  8. Souhrny a návrhy: `NF.summary`, `NF.semafor`, `NF.adviceOutcome`, `NF.proposals`, `NF.postup`, `NF.basalNights`, `NF.reviewRows`, `NF.trendOf`, `NF.morningValues`, `NF.nightCircumstances`, `NF.verifyAgainst`, `NF.verifyBlocked`, `NF.verifyByData`, `NF.DATA_FACTS`, `NF.decideProposal`, `NF.decideOtherDose`, `NF.planFromReview`, `NF.manyDosesText`.
- **Co postavit:** čisté funkce nad stavem; každá, která rozhoduje, zapíše stopu s položkou registru a parametry; žádná nepočítá jednotky inzulinu.
- **Obrazovky z atlasu:** žádné.
- **Testy jako specifikace:** v hlavní sadě „Aplikace nikde nepočítá ani nenavrhuje dávku; volí ji lékař“, „Porce: před píchnutím oběma směry; po píchnutí jen z větší; nikdy „sněz víc““, „Učení: známé od 4 započítaných (R-REAKCE minKnown)…“, „Reakce těla podle podílu v cíli…“, „Čistá data: inzulin včas (dávka 30/15, učení 45/30)…“, „Čistá data pro dávku 6. 10. 2026…“, „Návrh k dávce: čistá data, rady první, větve podle ověření, jednotky volí lékař“, „Návrh k dávce 6. 10. 2026…“, „Rozhodnutí proti směru větve se zapíše jako „jinak“…“, „Texty doplňků nic z jídla neubírají…“, „Export ze senzoru (15. 10. 2026): parser čte běžné formáty…“, „Klinická bezpečnost (23. 10. 2026)…“; celé `kontrola3-obsah.test.cjs` (rady šablonou, větve D-POSTUP); `kontrola2-obsah.test.cjs` „A1“, „A2“, „B9“–„B15“; `kontrola74-obsah.test.cjs` „A1“–„A3“; celé `schema84-jadro.test.cjs`; celé `schema90-jadro.test.cjs` (body 1–8 a 12 rozhodnutí vlastníka a nálezy kliniky, ordinace, pacienta a kódu); v `zaverecne80.test.cjs` „02 A1“, „81 bod 8“–„81 bod 11“, „82 B3“; `robustnost.test.cjs` „Výkon: 300 zápisů…“.
- **Hotovo, když:** nad modelovým pacientem vycházejí stejná čísla jako v maketě – mimo jiné „doplněno 37 jídel a 14 nocí“, opsaný vrchol se s exportem shoduje u 36 z 37 jídel, čas v cíli 68 %, bazál potvrzen 88 z 92 dnů, na kontrole karta „Posoudit bazál – noční hodnoty pod cílem“, u snídaně větev „zvýšit“ a u oběda také „zvýšit“, protože poklesy po menší porci jsou jen varování (modelový lékař dávku k obědu přesto ponechá) – a všechny vyjmenované testy projdou.
- **Pozor:** nejtěžší místa jsou čistá data (dvě okna včasného inzulinu: 30/15 min pro návrh k dávce, 45/30 min pro učení), shoda a hystereze „známého“ jídla, učení podle dávky (stejné jídlo u dvou jídel dne se slévá jen při stejné dávce), přednost nízkých hodnot, blok větve „zvýšit“ jen z čistých poklesů a zdroj nocí (export, nebo zápis pacienta, jedna noc jednou). Od SCHEMA 90 navíc: pokles „pod 4“ před jídlem patří k předchozímu hlavnímu jídlu dne aplikace (u snídaně k noci) a počítá se i se zamítnutou B-HYPO; pokles z exportu do 4 h; čas pod cílem nad mezí blokuje „zvýšit“ u všech dávek; opravený zápis jde do učení, ne do návrhu k dávce. Žádný text výsledku nesmí říkat „jíst víc“ (`NF.talksAmount`).

### Etapa 4 – Designový systém a stavební prvky

- **Cíl:** komponenty pacienta i ordinace 1:1 podle katalogu, hodnoty jen z tokenů.
- **Vstupy:** `app/tokens.css` (jediný zdroj hodnot, tokeny `--nf-*`), `app/design.css` (tokeny jen skládá), `app/fonts/` (s licencí OFL), `app/icons.js`, `design-system/index.html` s inspektorem; v `app/screens.js` stavební prvky (`btn`, `choice`, `card`, `tag`, `V.slider`, `V.gluSlider`, `V.levelTag`, `V.foodIco`, `V.peakBlock`, `V.dayStrip`, `V.weave`); v `app/ui.js` překreslení bez blikání (morph) a posuvník hodnoty; `15` odst. 15a.
- **Co postavit:** knihovnu komponent: tlačítka (pilulka = akce, obdélník = volba), karty, štítky stavu slovem a ikonou, posuvník hodnoty (`input type=range` s `aria-valuetext`), stupnice 4–16 mmol/l, pás dne, prstenec učení, tkanina zápisů, segmentovaná volba. Barevné role: zelená = v cíli/hotovo, oranžová = nad cílem/upozornění, červená = chyby/pod 4/mimo rozsah, petrolejová = jen akce.
- **Obrazovky z atlasu:** stavební prvky použité v obou atlasech.
- **Testy jako specifikace:** celé `tokeny.test.cjs`; v hlavní sadě „Designový systém (18. 10. 2026)…“, „Druhá dávka kritiky (19. 10. 2026)…“, „Třetí dávka kritiky (19. 10. 2026)…“, „Vizuální jazyk (15. 10. 2026)…“, „Přístupnost E (6. 10. 2026)…“, „Přístupnost 23. 10. (04)…“, „SCHEMA 84 (integrace): posuvník ukazuje směr od cíle…“.
- **Hotovo, když:** komponenty vypadají jako v katalogu; žádná barva ani rozměr mimo tokeny; posuvník jde ovládat tažením, klepnutím, šipkami i čtečkou; stav je vždy slovem a ikonou; obrazovky snesou písmo 160 %.
- **Pozor:** morph je technika makety; v cílovém řešení stačí, aby se překreslovalo bez blikání a bez ztráty fokusu. Bez volby se nic nepředvyplňuje (jezdec jen naznačený, hodnota „–“). Mřížky čísel, otočný válec a klávesnice s velkými klávesami jsou zavržené.

### Etapa 5 – Zařazení a startovní plán (lékař)

- **Cíl:** lékař zařadí pacienta a vydá plán P1 bez psaní.
- **Vstupy:** `app/screens-clinic.js` `V.enroll`, `doseSlider`, `targetsGrid`, `instrSlider`, `hbaField`; `app/core.js` `NF.ELIGIBILITY`, `NF.EXCLUSION`, `NF.setEligibility`, `NF.excluded`, `NF.setBaseline`, `NF.newDraft`, `NF.setDoseValue`, `NF.setTarget`, `NF.setTargetPreset`, `NF.toggleHabit`, `NF.setInstruction`, `NF.defaultInstructions`, `NF.planBlockers`, `NF.issuePlan`, `NF.handover`, `NF.setHba1c`, `NF.setHba1cDate`, `NF.weightLog`; akce `eligibility`, `exclusion`, `doseSet`, `basalTime`, `targetPreset`, `targetSet`, `toggleHabit`, `instrValue`, `issuePlan`; položky K-KRITERIA, C-CILE, R-NAVYKY, R-POKYNY, I-*.
- **Co postavit:** kartu pacienta (diagnóza, léčba, senzor, HbA1c s datem odběru a původem, hmotnost), pět podmínek (od SCHEMA 90 i bazál 1× denně večer a „Bez korekčního schématu“, K-KRITERIA v2) a šesté zaškrtnutí bez vylučovacích kritérií, dávky posuvníkem 1–60 j. z `NF.DOSE_RANGE` (nepředvyplněné; stejný rozsah jako na kontrole a u pacienta), výchozí čas v cíli a čas pod 3,9 ze senzoru, cíle glukózy (běžné nebo mírnější jedním klepnutím), startovní sadu návyků (stejná pro všechny, lékař škrtá nebo vyměňuje z katalogu), sbalený blok „Pravidla pro pacienta a cíle glukózy“ (pravidla automaticky, výjimečná změna hodnoty nebo vypnutí u pacienta) a vydání s potvrzením jednou větou.
- **Obrazovky z atlasu:** atlas ordinace, obrazovky zařazení a vydání plánu.
- **Testy jako specifikace:** v hlavní sadě „Zařazení: podmínky zamykají pokračování; plán bez náležitostí nejde vydat“, „Startovní sada je při čistém zařazení předvyplněná…“, „V ordinaci se nepíše (jen výběr, zaškrtnutí, volič)“, „Cíle glukózy voličem při zařazení i při kontrole…“, „Pokyny jsou součást plánu (SCHEMA 66, 21. 10. 2026)…“; `schema84-jadro.test.cjs` „5: kohorta jen inzulin…“; `schema90-jadro.test.cjs` „Bod 12: K-KRITERIA v2…“; `kontrola4-obsah.test.cjs` „06 A2, B4, B6…“, „Bod 8 a C15: mírnější cíle…“, „07 A2, B3, B8: volič dávky mřížkou…“ (dnes posuvník, stejné hodnoty); `faze2-jadro.test.cjs` „A05 zamítnutí R-NAVYKY, R-POKYNY a P-NEMOC má účinek“; `zaverecne80.test.cjs` „03 A1: startovní návyky v konceptu jen jednou…“, „03 A4: v ordinaci není volné textové pole…“.
- **Hotovo, když:** bez všech šesti zaškrtnutí (pět podmínek a vylučovací kritéria) nejde pokračovat; vydat jde jen s dávkami u všech čtyř dávek; pravidla jsou v plánu bez výběru; vydání je ve stopě a pacient s pozdějším převzetím vidí přesně tyto dávky.
- **Pozor:** nikde volné textové pole. Dávka se nepředvyplňuje. Zamítnutá R-NAVYKY znamená plán bez startovních návyků, zamítnutá R-POKYNY plán bez pravidel, obojí s oznámením na místě.

### Etapa 6 – Zaučení (sestra) a převzetí plánu (pacient)

- **Cíl:** sestra pacienta zaučí s náhledem jeho telefonu a pacient plán převezme.
- **Vstupy:** `app/screens-clinic.js` `V.nurse`, `nursePreview`, `remindersPart`; `app/screens.js` `V.takeover`, `V.understand`, `V.dosesTable`, `V.explainerKey`; `app/core.js` `NF.trainingItems`, `NF.FIXED_TRAINING`, `NF.finishTraining`, `NF.TRAINING_REASONS`, `NF.trainingSummary`, `NF.reminderSettings`, `NF.setReminderTime`, `NF.toggleReminder`, `NF.confirmUnderstanding`; akce `trainingCheck`, `trainingPreview`, `trainingReason`, `finishTraining`, `reminderTime`, `takeoverPage`, `doseReadback`, `answerCheck`, `confirmUnderstanding`; položky Z-BODY, S-PRIPOMINKY.
- **Co postavit:** seznam bodů zaučení složený z návyků plánu, tří pevných bodů a bodu o exportu; ústní body (upozornění na nízkou glukózu v aplikaci senzoru, časy připomínek); tlačítko „Náhled“; nezdařené zaučení s důvodem; převzetí jako průvodce o šesti stránkách včetně otázky „Souhlasí s tím, co vám řekl lékař?“ (při „Ne“ se plán nepřebírá) a zastavení na první stránce bez dokončeného zaučení.
- **Obrazovky z atlasu:** atlas ordinace, obrazovky sestry při zaučení; atlas pacienta, obrazovky převzetí plánu.
- **Testy jako specifikace:** v hlavní sadě „Zaučení: body podle návyků, náhled telefonu, návyky platí až po otázce“, „Sestra: „Ukázat“ u jídla ukáže ukázkové jídlo…“; `faze2-jadro.test.cjs` „A21 A22…“, „A26 převzetí bez zaučení se zastaví na první stránce“, „A29 po převzetí nového plánu se milníky za minulý plán nevystavují“, „C21 náhled telefonu u sestry bez „vpravo““; `kontrola4-obsah.test.cjs` „Bod 4: připomínky v telefonu…“; `zaverecne80.test.cjs` „02 B7, C2, C3, C4, C7…“ (nezdařené zaučení).
- **Hotovo, když:** odškrtnutí bodu přepne náhled na obrazovku, kterou pacient vidí; nezdar se zapíše s důvodem a lékař ho uvidí na kontrole; pacient bez dokončeného zaučení plán nepřevezme; časy připomínek vybrané se sestrou se uloží (nejvýš 4 denně).
- **Pozor:** pacient při zaučení slyší, že připomínka nemusí přijít a inzulin si píchá podle plánu i bez ní. Aplikace nízkou ani vysokou glukózu nehlídá; říká to stránka „Co neděláme“.

### Etapa 7 – Bezpečnostní pravidla a Bezpečí

- **Cíl:** osm obecných pravidel NutriFee (od SCHEMA 90 i I-VYSSI „Vyšší dávka než v plánu“) v krátké i celé podobě, karta pravidla pro okamžik události a stránka Bezpečí s kontakty.
- **Vstupy:** `app/data/catalogs.js` (`NF.data.instructions`: `prvniKrok`, `coDal`, `kratce`, `text`, `odkazy`, `bez`, hodnota s mezemi); `app/core.js` `NF.instrHtml`, `NF.instrParts`, `NF.instrTextOf`, `NF.dropRuleRefs`, `NF.hasInstruction`, `NF.noteRule`, `NF.ILL_TEXT`, `NF.OFF_TEXT` (od SCHEMA 89 v `app/core.js` spolu s `NF.OFF_RECORD_ONLY`; `app/screens.js` má jen aliasy); `app/screens.js` `V.safety`, `V.safetySheet`, `safetyContacts`, `ruleCard`, `V.eventCard`, `V.ruleEventBody`, `V.ruleFull`, `highCard`, `illnessInstructions`, `V.support`; položky R-POKYNY, I-HYPO, I-MENE, I-NEVIM, I-NEMOC-BAZAL, I-NEMOC-JIDLO, I-VYSOKA, I-VYSSI, I-KONTAKT, S-PODPORA.
- **Co postavit:** kartu pravidla s nadpisem situace (nikdy „Pokyn lékaře“), v okamžiku události první krok velkým písmem, „Co dál“ v bodech a „Celé pravidlo“; jinde název, jedna věta a „Celé pravidlo“; Bezpečí se seznamem názvů, větou „Tato pravidla připravil NutriFee a posoudil je lékař.“, větou z K-KRITERIA o těhotenství a změně léčby, zdravotními a technickými kontakty a formulářem technické podpory. Vynechání vět, které odkazují na chybějící (zamítnuté) pravidlo.
- **Obrazovky z atlasu:** atlas pacienta, Bezpečí a karty pravidel v kroku jídla a na Dnes.
- **Testy jako specifikace:** `obsah-pacienta.test.cjs` „P8: bezpečnostní pravidlo…“, „Povinné věty zůstávají viditelné…“; `kontrola2-obsah.test.cjs` „A6, B1, B3: I-HYPO, I-VYSOKA a I-MENE mají úplné znění…“, „B2: nejvyšší hodnota „nad 15“ z minulosti začíná „Podívejte se, kolik ukazuje senzor teď““; `kontrola3-obsah.test.cjs` „B2: po zamítnutí R-POKYNY nebo I-HYPO obrazovka na chybějící pravidlo neodkazuje“, „B4: zamítnutá I-KONTAKT…“; `kontrola4-obsah.test.cjs` „Bod 3…“, „02 B6…“, „Bod 10 a 02 B9…“; v hlavní sadě „SCHEMA 74: pacientské obrazovky v celém příběhu… bez výzvy volat ordinaci a bez podpisu „váš lékař““.
- **Hotovo, když:** krátké věty jsou doslova věty schváleného znění; celé znění je na klepnutí; žádná obrazovka pacienta nevyzývá volat do ordinace a nemá podpis lékaře; po zamítnutí pravidla je na jeho místě oznámení (výchozí text jádra „Tato část teď není k dispozici.“, `NF.OFF_TEXT`) a jiné texty na něj neodkazují; každé zobrazení pravidla I-HYPO, I-MENE, I-NEVIM a I-VYSOKA je ve stopě (`pravidlo.nizka`, `pravidlo.mene`, `pravidlo.nevim`, `pravidlo.vysoka`) a od SCHEMA 90 i I-VYSSI při uložení zápisu (`pravidlo.vyssi`).
- **Pozor:** pravidla jsou stejná pro všechny, lékař je nevybírá ani nepíše. Kontakty jsou jen informace. Práh nízké glukózy je pevně 4 mmol/l; od SCHEMA 90 je pevná i hranice I-VYSOKA (15 mmol/l, stejně jako čip „nad 15“) a I-VYSSI `v` (60 min). Sledování po vyšší dávce a vynechaná procházka platí i se zamítnutou I-VYSSI. Věta „nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal“ není výzva aplikace volat.

### Etapa 8 – Zápis jídla pacientem

- **Cíl:** tři kroky před jídlem (inzulin a glukóza → jídlo a porce → rady a uložení), zpětný zápis, nové jídlo jen názvem a svačina.
- **Vstupy:** `app/screens.js` `V.meal`, `mealStep1`, `mealStep1Retro`, `insQuestion`, `bolusChoices`, `unitsBox`, `V.unitsSlider`, `prevAskBlock`, `prevQuestion`, `nowQuestion`, `V.nightChip`, `V.gluSlider`, `V.peakHow`, `V.adviceList`, `routineScale`, `customBuilder`, `divergenceBlock`, `lowNowCard`, `highNow`; `app/core.js` `NF.saveEpisode`, `NF.advise`, `NF.adviseAfter`, `NF.retroAt`, `NF.chip`, `NF.chipValue`, `NF.setManualPeak`, `NF.pendingPeakAsk`, `NF.searchFoods`, `NF.recentFoods`, `NF.addFood`, `NF.likeName`, `NF.likeCandidates`, `NF.lastAnswers`, `NF.pendingInsulin`, `NF.DECLINE_REASONS`, `NF.reasonsFor`; akce `startMeal`, `mealRetro`, `mealBolus`, `mealQ`, `mealUnitsSet`, `mealTime`, `mealTimeAgo`, `vsPick`, `peakChip`, `lowChip`, `mealNightLow`, `mealFood`, `mealNewFood`, `mealLike`, `mealPortion`, `mealDecide`, `mealReason`, `mealFinish`; položky Z-GLUKOZA, R-REAKCE, R-PODOBNOST, R-SKORE, R-PORCE, R-DOPLNEK, R-PORADI, R-PROCHAZKA, D-CISTA, B-HYPO, I-HYPO, I-MENE, I-NEVIM, I-VYSOKA, J-DATABAZE.
- **Co postavit:** krok 1 otázka po otázce (inzulin: „Ano, 8 j.“ s podřádkem „podle plánu z 5. 10.“ (`NF.doseOrigin`) / „Ano, jinak“ s posuvníkem jednotek 1–60 j. a časem právě teď · před 5 · před 15 · před 30 min · jiný čas s posuvníkem 0–120 min po 5 min / „Ještě ne“ / „Nevím“; nejvyšší hodnota po minulém jídle a pokles; glukóza teď posuvníkem; čip nočního poklesu u snídaně); krok 2 hledání bez ohledu na diakritiku, naposledy, nové jídlo jen názvem s „Myslíte X?“ a nepovinným „Je to jako X“, porce zleva menší · obvyklá · větší; krok 3 rady podle zásady 3 s volbami „Zkusím to“ / „Tentokrát ne“ (+ důvod) / bez odpovědi, rutinní rada sbalená, stupnice v „Podrobnostech“; „Uložit, píchnu za chvíli“; při glukóze pod 4 a „Ještě ne“ hlavní tlačítko „Uložit, inzulin zatím ne“ a pod ním vedlejší textové odkazy bez rámečku (třída `quiet`) „Už píchnuto 8 j.“ / „Píchnuto jinak“ (P46); zpětný zápis (inzulin, čas jídla, hodnoty, procházka jen do 60 min); svačina bez inzulinu; od SCHEMA 90 pravidlo I-VYSSI v kroku 3 po dávce o 2 j. a víc nad plánem, „Nebudete jíst?“ po „Zpět na Dnes“ s potvrzeným inzulinem (vynechané jídlo s inzulinem) a odmítnutí nesmyslného názvu nového jídla („Napište název jídla slovy.“).
- **Obrazovky z atlasu:** atlas pacienta, kroky zápisu jídla 1–3, zpětný zápis a svačina.
- **Testy jako specifikace:** v hlavní sadě „Před jídlem: inzulin první, kroky zamčené bez volby, zápis nese potvrzení dávky“, „Nové jídlo jen názvem (15. 10. 2026)…“, „Zátěž pacienta a bezpečnost (18. 10. 2026)…“, „Rozhodnutí vlastníka 25. 10. 2026: při glukóze pod 4 před jídlem krok 3 neradí vůbec…“, „Závěrečná kontrola 23. 10. (01 #1)…“, „(01 #2)…“, „(01 #4)…“, „Zpětný zápis (27. 10. 2026)…“, „Svačina: bez inzulinu a bez porce…“, „Rozhodnutí vlastníka 23. 10. 2026 (SCHEMA 67): porce zleva menší · obvyklá · větší…“, „SCHEMA 74: čip „nad 15“…“, „SCHEMA 87 (body 3, 7): čísla pacienta posuvníkem 1–60 j. z jednoho místa; čas inzulinu „jiný čas“ posuvníkem; ordinace má týž rozsah“, „SCHEMA 87 (bod 1): pravidla pod 4, nevím a menší porce jdou do stopy jako pravidlo.vysoka; události výpočtu nesou verzi a otisk položek; krácení stopy je omezení makety“; `obsah-pacienta.test.cjs` „P1“, „P4 a P8“; `kontrola3-obsah.test.cjs` čtyři testy „A2“; `kontrola2-obsah.test.cjs` „A1“, „B14, C1, C11“; `faze2-jadro.test.cjs` „A06“, „A07“, „A15“, „A16“, „A17“, „A18“; `kontrola4-obsah.test.cjs` „02 B7, B8…“, „Jeden lékař a jiná dávka než v plánu…“; `robustnost.test.cjs` „Krok 3 s neznámým jídlem…“, „Hledání jídla nezávisí na diakritice“, „Zpětný zápis: neplatná hodina…“; `zaverecne80.test.cjs` „Bod 7: čip „V noci klesla glukóza pod 4“…“; `schema90-jadro.test.cjs` „Bod 3…“, „Bod 5…“, „Pacient K3…“, „Pacient V3: nesmyslné názvy jídel se nepřijmou“, „Kód K14: uložit jde jen z kroku 3…“.
- **Hotovo, když:** bez volby nejde dál a „Další“ říká proč; zápis nese potvrzení inzulinu, porci, odpovědi na rady a stopu; po píchnutí s menší porcí žádná rada k množství a hned pravidlo „Méně jídla než obvykle“; při glukóze pod 4 krok 3 neradí vůbec; „nad 15“ hned ukáže pravidlo k vysoké glukóze a zapíše to do stopy, totéž platí pro pravidla k nízké glukóze, menší porci a „nevím“; při glukóze pod 4 a „Ještě ne“ hlavní tlačítko k potvrzení píchnutí nenavádí; obrazovky splní limity P1–P11.
- **Pozor:** odpověď na otázku není hlavní tlačítko (rovnocenné volby, plná až po vybrání). Rada „pořadí“ a „doplněk“ se skládá jen šablonou z údajů jídla, nikdy ručně psaným textem. Procházka se nenabízí při riziku nízké glukózy (i po výrazně vyšší dávce). Inzulin jde opravit do 60 minut a opravený zápis nejde do návrhu k dávce. Uložená glukóza „pod 4“ před jídlem je od SCHEMA 90 pokles.

### Etapa 9 – Dnes, připomínky, nízká glukóza, nemoc, zpětná vazba

- **Cíl:** obrazovka Dnes řekne, co teď, a jak si pacient vede; větev nízké glukózy, režim nemoci a zpětná vazba za čin.
- **Vstupy:** `app/screens.js` `V.today`, `V.mealNow`, `V.dayStrip`, `V.howLine`, `basalToday`, `hypoWatchCard`, `hypoAlertCard`, `lowNoticeCard`, `V.lessFoodCards`, `pendingInsulinCard`, `resultCard`, `fixInsulinLine`, `milestoneCard`, `weekCard`, `yesterdayCard`, `V.doseOffPlanCard`, `V.phoneNotice`, `V.exportRemind`, `soonCard`; `app/core.js` `NF.daySlots`, `NF.focusMeal`, `NF.snackFirst`, `NF.slotBeforePlan`, `NF.canEditEpisode`, `NF.editEpisode`, `NF.deleteEpisode`, `NF.tzMismatch`, `NF.skipMeal`, `NF.confirmBasal`, `NF.openHypoWatch`, `NF.answerHypoWatch`, `NF.hypoAlert`, `NF.hypoAlertSeen`, `NF.setIllness`, `NF.illnessCheckin`, `NF.illnessLong`, `NF.lastResult`, `NF.markResultSeen`, `NF.thanks`, `NF.checkMilestones`, `NF.closeMilestone`, `NF.weekSummary`, `NF.howAmI`, `NF.notifications`, `NF.yesterdayGaps`, `NF.returnAfterGap`, `NF.doseOffPlan`, `NF.canCorrectInsulin`, `NF.nextVisit`; položky B-HYPO, I-HYPO, I-MENE, P-NEMOC, I-NEMOC-BAZAL, I-NEMOC-JIDLO, S-VYSLEDEK, R-DIKY, R-MILNIKY, S-TYDEN, S-PRIPOMINKY, S-DAVKA.
- **Co postavit:** pozdrav s tlačítkem „Není mi dobře“; otázku „Klesla glukóza pod 4?“ nad kartou „Co teď“; kartu „Co teď“ (na řadě · do 3 h po hlavním jídle hlavní tlačítko „Zapsat svačinu“ a další jídlo jako vedlejší volba · minulý slot „Byla dnes snídaně?“ s vedlejší volbou „Na řadě je … · Chystám se jíst“ · chybějící dřívější jídlo jako řádek „Doplnit snídani“ · večer bazál s tlačítkem v kartě a „Jinak“ s posuvníkem jednotek); den aplikace do 4:00; věta o českém čase při jiném pásmu telefonu; pás dne se zápisy, „Opravit inzulin“ (posuvník jednotek u „Jinak“) a „Opravit zápis“ do 24 h (porce, „Smazat zápis“ s potvrzením); kartu po poklesu (na Dnes 3 hodiny) a kartu po dvou poklesech za klouzavých 7 dní; „Jak to dopadlo“, poděkování, milníky (nejvýš jedna karta), „Váš týden“; „Včera chybí večeře – doplnit?“ do 24 h (ne při nemoci); otázka po vynechaném jídle bez hodiny; „Vítejte zpět“ po 7 dnech bez zápisu; „Jiná dávka než v plánu“ po dvou jiných dávkách po sobě; připomínky v telefonu; režim nemoci (rady k jídlu žádné, jedna věta „K jídlu neradíme, platí pravidla pro nemoc.“, pravidla pro nemoc nahoře, „Už je vám lépe?“, ukončuje pacient).
- **Obrazovky z atlasu:** atlas pacienta, Dnes ve všech stavech, oznámení v telefonu, režim nemoci.
- **Testy jako specifikace:** v hlavní sadě „Tři sloty dne…“, „Bazál: připomínka večer…“, „Nemoc: pacient označí i ukončí…“, „Zpětná vazba: po příchodu dat karta „Jak to dopadlo“…“, „Milníky: jednou, za snahu a návyk…“, „Týdenní shrnutí po 7 dnech jednou…“, „Druhý průchod: Co teď dává přednost jídlu před bazálem…“, „Svačina se nepočítá do návyků…“, „Pacient 6. 10. 2026…“; `obsah-pacienta.test.cjs` „P1“, „P4 a P8“, „P6 a P7“, „P10“, „P11“; `faze2-jadro.test.cjs` „A03“, „A04“, „A19“, „A24“; `kontrola74-obsah.test.cjs` „A2“, „B17, B18“, „C3“, „C5“; `kontrola2-obsah.test.cjs` „Prohlížeč M2…“; `kontrola4-obsah.test.cjs` „Bod 3…“, „Bod 4…“; `zaverecne80.test.cjs` oba testy „Bod 7“; `robustnost.test.cjs` „Nemoc: žádná .advice…“; `schema90-jadro.test.cjs` „Bod 1…“, „Bod 2…“, „Bod 7…“, „Pacient V1…“, „Pacient S2, S5, S6…“, „Kód K8…“.
- **Hotovo, když:** „Co teď“ je celé v prvních 780 px; po menší porci s inzulinem přijde za 60 minut otázka (i po večeři; po večeři ráno navíc otázka na noc); druhý pokles za 7 dní ukáže kartu s větou o poradě s lékařem a ta se ukáže znovu s dalším poklesem; žádná karta nechválí hodnotu glukózy; živá glukóza na Dnes není.
- **Pozor:** aplikace nic nehlídá a nikam nevolá; otázka čeká do dalšího otevření. Zamítnutá B-HYPO vypne otázku i kartu po poklesech, ale pravidlo „Méně jídla než obvykle“ zůstává. Zamítnutá P-NEMOC: přepínač nahradí oznámení a zápisy jdou do učení.

### Etapa 10 – Jídla, Můj plán a přehled před kontrolou

- **Cíl:** pacient vidí svá jídla, svůj plán a to, co uvidí lékař.
- **Vstupy:** `app/screens.js` `V.foods`, `foodRow`, `V.foodDetail`, `V.foodCard`, `V.peakBlock`, `V.planScreen`, `planScreenBody`, `weekPlanBlock`, `V.remindersCard`, `V.pathCard`, `V.weave`, `V.preview`, `previewDetail`, `tile`; `app/core.js` `NF.foodStats`, `NF.confidence`, `NF.slotStates`, `NF.slotWhyText`, `NF.pathStats`, `NF.weave`, `NF.howAmI`, `NF.weekSummary`, `NF.reminderSettings`; akce `foodsSeg`, `foodOpen`, `foodBack`, `previewTile`, `toggleQuestion`, `saveQuestion`, `reminderToggle`; položky R-REAKCE, R-SKORE, R-PODOBNOST, S-CESTA, S-TYDEN.
- **Co postavit:** seznam jídel (prstenec · název · štítek reakce · šipka) a detail jídla jako samostatnou obrazovku (stupnice, „X z N v cíli“, rozmezí, co pomáhalo, stav ke každému jídlu dne při rozdílné dávce); Můj plán („Jak si vedu“, cesta ke kontrole s tkaninou zápisů, dávky, návyky, rady, připomínky, cíle, co lékař změnil); přehled před kontrolou (souhrn, tři navržené otázky z dat, vlastní otázka až jako druhá volba, čísla pod „Podrobnosti v číslech“).
- **Obrazovky z atlasu:** atlas pacienta, Jídla, detail jídla, Můj plán, přehled před kontrolou.
- **Testy jako specifikace:** v hlavní sadě „Report pro pacienta: pochvala, dlaždice s vysvětlením, navržené otázky“, „Učení podle jídla dne pacientovi (25. 10. 2026)…“, „Reakce těla podle podílu v cíli…“, „Rozhodnutí 20. 10. 2026 (SCHEMA 62)…“; `faze2-jadro.test.cjs` „A15 podobné jídlo jen směrem, bez čísla“, „A32 R-SKORE jen dva stupně“; `obsah-pacienta.test.cjs` „Průchod pokryl obrazovky pacienta…“, „P6 a P7…“; `kontrola74-obsah.test.cjs` „C3“.
- **Hotovo, když:** podobné jídlo ukazuje jen směr slovem a ikonou bez čísla; rozmezí je do 7 zápisů nejnižší–nejvyšší a od 8 zápisů 10.–90. percentil; pacient vidí „Známe už N vašich jídel“ bez jmenovatele; otázka vybraná pacientem se objeví lékaři.
- **Pozor:** pacient nikdy nevidí „report“, „medián“, „skóre“, „čistá data“, „garant“, „studie“ ani hodnotu „před jídlem“. Mezery v tkanině nejsou chyba („Mezery nejsou chyba. Lékař uvidí celé období najednou.“).

### Etapa 11 – Server a synchronizace

- **Cíl:** data pacienta se bezpečně a bez ztrát dostanou na server a ordinace je má při kontrole.
- **Vstupy:** `15` zásada 5 a 6, odst. 6a; podklad `30-…/05-robustnost-bezpecnost.md` odst. 3 (doporučení pro ostrou aplikaci); `30-…/10-predani-programatorovi.md` odst. 9 (ukládání v maketě jako vzor klienta); `demo/sync.js` (fronta, opakování, pravdivý stav uložení) jen jako vzor; od SCHEMA 90 API jádra pro synchronizaci (odd. 2.3: `NF.domainOf`, `NF.mergeRemote`, `NF.onChange` s `domainChanged` a `rev`, `NF.readOnly`) a jeho popis v [`01-cesta-k-demu.md`](01-cesta-k-demu.md).
- **Co postavit:** **otevřené – technologie a rozhraní určuje programátor s vývojářem serveru a vlastníkem.** Musí platit: šifrované uložení a přenos; identitu, roli a čas přijetí plní server; každý zápis má stálý klíč a server ho přijme nejvýš jednou; zápis pacienta bez sítě se odešle později; pacient i ordinace vidí pravdivý stav uložení; lékař mezi kontrolami nic nedostává; personál nepoužívá účet pacienta.
- **Obrazovky z atlasu:** žádné nové; stav uložení se projeví na obrazovkách pacienta a v ordinaci před kontrolou.
- **Testy jako specifikace:** `ukladani.test.cjs` jako vzor scénářů pro klienta (testy „05 B1“, „05 C6“, „05 B2 + 03 B4“, „05 A1“, „05 A2“, „05 A3“, „05 A4“, „05 B4 + 03 B2“, „05 B3“, „Regrese: ztracená odpověď a F5 během ukládání…“); `robustnost.test.cjs` „Jádro bez demo: 0 síťových volání…“ (síť smí volat jen vrstva synchronizace, ne výpočty); `schema90-jadro.test.cjs` „K1…“, „K2…“, „K3…“, „K4…“, „K9…“.
- **Hotovo, když:** zápis pořízený bez sítě se po obnovení spojení odešle sám a na serveru je jednou; dvě zařízení nebo dvě role se nepřepíšou; ordinace před kontrolou vidí, že všechny zápisy pacienta do daného času jsou na serveru; testy oprávnění (cizí záznam nejde číst, měnit ani podvrhnout) běží v průběžné integraci.
- **Pozor:** ztracený nebo zdvojený zápis je klinické riziko. Vrstva posílá jen doménu (`NF.domainOf`), nikdy pohled (role, stránka, rozpracovaný zápis); po migraci ze starší verze neposílá čistý stav, dokud uživatel nezvolí „Začít znovu“. Vypršení přihlášení nesmí zahodit rozepsaný zápis. Data na serveru jsou zdravotní údaje (DPIA, oddíl 4).

### Etapa 12 – Import exportu ze senzoru

- **Cíl:** sestra nahraje export, aplikace ho převede, doplní jídla a noci a spočítá shodu opsaných hodnot.
- **Vstupy:** `app/screens-clinic.js` `sensorImportPart`; `app/core.js` `NF.parseSensorCsv`, `NF.parseSensorTime`, `NF.IMPORT_REJECT`, `NF.importReadings`, `NF.importText`, `NF.importAgreeText`, `NF.peakAgrees`, `NF.importDue`, `NF.sensorSummaryFrom`; akce `importText`; položka Z-IMPORT (provozní, `po_jidle_min`, `shoda_mmol`, od SCHEMA 90 `pokles_min`, `noc_od`, `noc_do`, `spani_od` a texty `jineObdobi`, `castObdobi`); `NF.sensorImportFor`, `NF.recomputeReview`.
- **Co postavit:** nahrání souboru v části „Sestra · Data ze senzoru“ na kartě „Kontrola ve čtyřech krocích“ před „Zahájit kontrolu“; převod do jednotného tvaru (čas + mmol/l); přiřazení měření 0–180 min k zápisům, nocí k bazálu, pokrytí pro čas v cíli; odmítnutí exportu celého z jiného období a oříznutí částečného (od SCHEMA 90); pokles z exportu do 4 h po jídle (`ep.lowAfter`); přepočet kontroly po pozdním nahrání; hlášky „Export nahrán a převeden · doplněno M jídel a K nocí“, shoda „Opsaná nejvyšší hodnota se s exportem shoduje u X z Y jídel (do 1 mmol/l).“ a obecné odmítnutí nečitelného souboru; věta v části Bezpečnost, když noční hodnoty chybí.
- **Obrazovky z atlasu:** atlas ordinace, sestra – data ze senzoru.
- **Testy jako specifikace:** v hlavní sadě „Export ze senzoru (15. 10. 2026): parser čte běžné formáty…“, „SCHEMA 74: o exportu ze senzoru maketa nemluví konkrétně…“; `faze2-jadro.test.cjs` „A08 export přepíše noci…“, „A20 (SCHEMA 74): pacient export v aplikaci nenahrává…“; `robustnost.test.cjs` „csv: neexistující datum/čas se nepřijme…“; `kontrola4-obsah.test.cjs` „Bod 5: bez exportu report v části Bezpečnost řekne, že noční hodnoty chybí“; `zaverecne80.test.cjs` „03 A5: dostupnost dat podle skutečného intervalu měření (5 i 15 min)“, „82 B3…“; `schema90-jadro.test.cjs` „Bod 6…“, „Ordinace V2: export celý z jiného období…“, „Ordinace S1…“, „Ordinace S2, S7…“.
- **Hotovo, když:** nečitelný soubor se odmítne a nic z něj se nenačte (nikdy napůl); modelový export dá „doplněno 37 jídel a 14 nocí“ a shodu 36 z 37; počet měření a přeskočených řádků je jen ve stopě; čip „nad 15“ se s exportem shoduje, když export leží nad 15.
- **Pozor:** **otevřené** – převodníky pro konkrétní exporty senzorů v kohortě (s testy na ukázkových souborech) a cesta exportu od pacienta do ordinace (`15` odst. 6a). Obrazovky o formátu, portálu ani účtu nemluví. Pacient export v aplikaci nenahrává.

### Etapa 13 – Kontrola v ordinaci

- **Cíl:** sestra s pacientem projde body, které data neukážou, lékař projde souhrn a návrhy a rozhodne klepnutím.
- **Vstupy:** `app/screens-clinic.js` `V.review`, `V.nurseCheckPart`, `weightPart`, `safetyPart`, `reviewSummary`, `mealOverview`, `tileDetail`, `cmpTile`, `podklady`, `strongFoods`, `unstableLine`, `reviewProposals`, `doseRowsSection`, `proposalBody`, `V.acute`; volba větve návrhu `NF.proposalBranch` `(S, návrh)` → `{ action, text, when?, block?, missing? }` (od SCHEMA 89 v `app/core.js`; `V.proposalBranch` v `screens-clinic.js` je jen alias); `app/core.js` `NF.startReview`, `NF.summary`, `NF.semafor`, `NF.periodInfo`, `NF.proposals`, `NF.nextProposal`, `NF.reviewRows`, `NF.reviewCards`, `NF.verifyAgainst`, `NF.verifyByNurse`, `NF.verifyByData`, `NF.verifyState`, `NF.verifyAll`, `NF.keepAll`, `NF.decideProposal`, `NF.decideOtherDose`, `NF.setReviewDose`, `NF.NURSE_MEDS`, `NF.healthQuestion`, `NF.setNurseCheck`, `NF.setNurseMeds`, `NF.setNurseHealth`, `NF.setWeight`, `NF.hba1cFor`, `NF.trendOf`, `NF.morningValues`, `NF.nightCircumstances`, `NF.refreshReview`, `NF.swapOptions`; akce `startReview`, `reviewStep`, `nurseCheck`, `nurseMeds`, `nurseHealth`, `nurseWeightSet`, `hbaSet`, `hbaNone`, `propVerify`, `propVerifyAll`, `propKeepAll`, `propOther`, `propUnits`, `propDoseSet`, `propDecide`, `propSwapTo`; položky S-SEMAFOR, S-SILNA, S-SOUHRN, D-CISTA, D-PRAND, D-BAZAL, D-POSTUP, R-POKYNY, C-CILE.
- **Co postavit:** část „Sestra · S pacientem před lékařem“ (jiný lék na diabetes Ne / Ano, zdravotní stav podle pohlaví, hmotnost, HbA1c z karty s datem odběru nebo „nový výsledek zatím není“, body D-POSTUP `sestra`); krok 1 souhrn s dlaždicemi dříve · teď · rozdíl a slovem stavu, tabulkou „Jídla dne za období“ a podklady (bezpečnost, plán a potvrzené dávky, senzor, jídla, rady, otázky pacienta); krok 2 návrhy jeden po druhém (návrh · proč · co oslabuje · jak ověřit sedí / nesedí, od SCHEMA 90 body potvrzené daty předvyplněné „sedí podle dat“ · postup říká · rozhodnutí), semafor „bez hodnocení“ pod 14 dny dat a zelená jen s časem pod 3,0 pod mezí, sloučená karta „Beze změny (N) · Potvrdit vše“, „Vše sedí“, řádky jídel dne bez karty se stejným voličem dávky; „Pravidla a kontakty“ mimo kroky.
- **Obrazovky z atlasu:** atlas ordinace, kontrola krok 1 a 2 a část sestry.
- **Testy jako specifikace:** v hlavní sadě „Kontrola je vedené flow: souhrn → návrhy (jeden po druhém) → plán → předání“, „Návrh k dávce: čistá data, rady první, větve podle ověření, jednotky volí lékař“, „Odbočka „většinou nepřijal“ vede k jiným návrhům“, „Rady svázané s plánem: výměna rady má účinek; návrhy beze změny jedna karta; Vše sedí…“, „Rozhodnutí proti směru větve se zapíše jako „jinak“…“, „„Pravidla a kontakty“ otevře pokyny a kontakty…“, „Závěrečná kontrola 23. 10. (02 #2)…“, „(02 #3)…“, „Rozhodnutí vlastníka 25. 10. 2026: cíl HbA1c v C-CILE…“; celé `schema84-jadro.test.cjs`; `kontrola74-obsah.test.cjs` „A1“, „B8, B10, C6, C7“, „B11“, „B19“; `kontrola2-obsah.test.cjs` „Prohlížeč B1“, „B9“–„B13“; `faze2-jadro.test.cjs` „A01“, „A09 A10“, „A11“, „A12 A13“, „A14“, „A27“, „A30“; `kontrola4-obsah.test.cjs` „Bod 7…“, „06 B5…“, „01 M3…“; `zaverecne80.test.cjs` „02 B1, B3“, „02 B7…“, „81 bod 8“–„81 bod 11“, „82 B2…“; `schema90-jadro.test.cjs` „Bod 4…“, „Bod 8…“, „Ordinace V1, V2…“, „Klinika K8, ordinace S5…“, „Ordinace S4…“, „Ordinace S9…“, „Kód K7…“.
- **Hotovo, když:** „Souhlasím“ je zamčené, dokud ověření není dokončené, a „Ponechat“ i „Zamítnout s důvodem“ ověření nepotřebují; body sestry a body, kterým data odporují, „Vše sedí“ nepřepne; návrh nikdy neobsahuje jednotky; u karty bazálu má přednost jen noc pod 3,0 nebo bez vysvětlení jídla pozdě večer; zamítnutí položky během kontroly přepočítá návrhy; cílem je kontrola asi na 10 klepnutí (`15` odst. 9; podklad 07 naměřil u lékaře 17).
- **Pozor:** v ordinaci se nepíše ani komentář. Větev je doporučení, volič „jiná dávka“ je u každé dávky a změna proti větvi se zapíše jako „rozhodnuto jinak než postup“ (u blokujícího poklesu i „proti datům“). Chybí-li pro bod větev, aplikace ukáže „ponechat dávku – schválený postup pro tento bod nemá větev“. O „jinak než postup“ rozhoduje jádro podle směru dávky proti větvi v okamžiku rozhodnutí (od SCHEMA 90). Bod potvrzený daty může lékař změnit; stopa to zapíše (`protiDatum`).

### Etapa 14 – Potvrzení a vydání nového plánu

- **Cíl:** lékař potvrdí výsledek rozhodnutí a vydá P2; pacient ho převezme.
- **Vstupy:** `app/screens-clinic.js` `reviewConfirm`, `reviewHandover`; `app/screens.js` `V.newPlan`, `V.newDose`; `app/core.js` `NF.planFromReview`, `NF.issueFromReview`, `NF.setPlanDose`, `NF.stepPlanDose`, `NF.manyDosesText`, `NF.reviewComplete`, `NF.reviewClosed`, `NF.setReviewValidity`, `NF.reviewHabits`, `NF.toggleReviewHabit`; akce `revDose`, `revDoseSet`, `revHabit`, `revValidity`, `revTargetSet`, `revInstrToggle`, `issueP2`.
- **Co postavit:** krok 3 se skutečným výsledkem (dávky posuvníkem 1–60 j., návyky z katalogu, vypnuté rady, cíle, pravidla, platnost plánu), věta při změně dvou a více dávek, zámek vydání (dávka se liší, právě když existuje rozhodnutí s jednotkami), potvrzení jednou větou; krok 4 předání s náhledem telefonu; nový plán u pacienta („lékař nastavil 9 j. (dřív 8 j.)“, u ponechané dávky kvůli poklesům vysvětlení); nové učení k radám po změně dávky.
- **Obrazovky z atlasu:** atlas ordinace, kontrola krok 3 a 4; atlas pacienta, nový plán.
- **Testy jako specifikace:** v hlavní sadě „Vydání P2 z rozhodnutí; historie P1 zůstává; učení po změně dávky znovu“, „Kontrola po vydání plánu je zamčená…“, „Rozhodnutí vlastníka 25. 10. 2026: dvě a více změn dávek v kontrole…“, „Cíle glukózy voličem… po převzetí P2 lze zahájit další kontrolu“; `schema84-jadro.test.cjs` „1: jídlo dne bez karty…“, „6 + C9 + B12…“; `kontrola74-obsah.test.cjs` „B14, B16…“; `faze2-jadro.test.cjs` „A27…“, „A29…“; `zaverecne80.test.cjs` „03 B5…“.
- **Hotovo, když:** plán P2 obsahuje přesně rozhodnutí z kroku 2 a 3; P1 zůstává v historii se svým souhrnem ze senzoru; po vydání nejde kontrolu měnit; pacient při převzetí nové dávky znovu odpoví „Souhlasí s tím, co vám řekl lékař?“.
- **Pozor:** výši dávky nikdy nenavrhuje aplikace. Učení k radám začíná po změně dávky znovu, stará data zůstávají označená „při dávce X j.“.

### Etapa 15 – Schvalovací registr, garant, verze a stopa

- **Cíl:** garant schvaluje klinické položky v registru; lékař vidí verze a stopu.
- **Vstupy:** `app/screens-clinic.js` `V.registry`, `V.itemDetail`, `itemPanel`, `decideBlock`, `histBlock`, `V.histLine`, `V.mergeNoteEdits`, `V.impulseCard`, `V.SAFETY_ITEMS`, `itemTexts`, `itemListsBox`, `itemPostup`, `V.trace`, `traceDetail`; `app/core.js` `NF.decideItem`, `NF.applyDecision`, `NF.newVersion`, `NF.registrySummary`, `NF.itemNote`, `NF.itemFingerprint`; akce `regFilter`, `regOpen`, `regDecide`, `regNote`, `regConfirmCancel`, `impulseOff`, `impulseVersion`, `traceOpen`, `traceWho`; `demo/guide.js` (obsah pěti oddílů průvodce a `ucinek`); podklad `30-…/10-predani-programatorovi.md` odst. 5–8.
- **Co postavit:** registr (tři dlaždice ke schválení · schváleno · zamítnuto, filtry, hledání, řádek s první větou poznámky), detail položky (průvodce Proč · Jak · Kde · Co schvalujete · Co se stane při zamítnutí; parametry česky s jednotkou; texty pro pacienta), Schválit / Zamítnout s poznámkou až po rozhodnutí, ukládanou průběžně; u B-HYPO, R-POKYNY a P-NEMOC potvrzení zamítnutí jednou větou; historie jen přibývá; provozní položky jako sbalený oddíl „Pravidla aplikace bez schvalování“; karta „Podnět z provozu“ s „Navrhnout vypnutí položky“ a „Navrhnout novou verzi ke schválení“ (provádí výrobce v řízení změn); podpis garanta nad verzí a otiskem; obrazovka „Verze a stopa“.
- **Obrazovky z atlasu:** atlas ordinace, schvalovací registr, detail položky, verze a stopa.
- **Testy jako specifikace:** v hlavní sadě „SCHEMA 83: registr bez prezentační vrstvy – pole poznámky až po rozhodnutí…“, „Registr: detail položky roluje sám (12. 10. 2026)“, „Nová verze z příběhu (O6, 27. 10. 2026) se garantovi nepřipisuje…“, „Stopa má vstupy a výstupy výpočtů; bez exportu“; `faze2-jadro.test.cjs` „A33 karta „Podnět z provozu“…“; `kontrola4-obsah.test.cjs` „Bod 11: scénář 5 – garant navrhuje vypnutí, výrobce provádí“; `kontrola2-obsah.test.cjs` oba testy „A3–A5, B4“; `pravdivost.test.cjs` „T3“ (účinek zamítnutí každé položky na obrazovce); `kontrola3-obsah.test.cjs` „C9, C10…“; `ukladani.test.cjs` testy otisku a pořadí („Rozhodnutí 1“, „31 B2 + C2“, „31 B4 + C1 + C8 + C9“).
- **Hotovo, když:** zamítnutí každé z 29 klinických položek změní obrazovky přesně podle `ucinek` (u C-CILE, K-KRITERIA, Z-GLUKOZA a P-LEKAR jen záznam nesouhlasu); poznámka bez rozhodnutí nevzniká; historie se nemaže; nová verze má stav ke schválení; garant nemá voliče parametrů.
- **Pozor:** v ostrém provozu nerozhodnutá položka nepůsobí (v maketě se chová jako schválená). Poznámka garanta je požadavek na změnu, ne schválená změna; nikdy ji nezapracujte potichu. Pacient se o garantovi nedozví; zamítnutá rada mu zmizí, a pokud ji dřív přijímal, dostane jednu neutrální větu.

### Etapa 16 – Provozní věci a příprava ostrého provozu

- **Cíl:** aplikace je provozuschopná, bezpečná a doložitelná.
- **Vstupy:** `app/ui.js` `NF.boot` (produkční start: skutečný čas, vlastní úložiště, role); `app/core.js` `NF.endParticipation`, `NF.SUPPORT_ISSUES`; `app/screens.js` `V.support`; `15` odst. 15 (produkční sestavení), zásada 6 (hlavičky); podklady 05, 06 a 07; oddíl 4 tohoto dokumentu.
- **Co postavit:** produkční sestavení bez jakékoli zmínky o maketě; přihlášení a role; bezpečnostní hlavičky ze serveru; ukončení účasti; formulář technické podpory (jen stav, bez odesílání z jádra); zálohy a obnova; záznamy přístupů; verze nasazení navázaná na verze položek registru.
- **Obrazovky z atlasu:** atlas pacienta, Bezpečí – technická podpora.
- **Testy jako specifikace:** `zaverecne80.test.cjs` „03 A3, C8, B1…“, „03 B2, B3, B4…“, „03 C3, C4, C5, C6, C7, C9: hrany“; `faze2-jadro.test.cjs` „Jádro bez demo/ běží a nevolá síť“; `robustnost.test.cjs` „Výkon: 300 zápisů → Dnes, report pacienta i kontrola lékaře pod 50 ms“, „Žádná hodnota ze stavu nejde do HTML neescapovaná“; v hlavní sadě „V publikovaných souborech nejsou skutečná jména“, „Produkční sestavení bez demo/ má registr, jídla i katalogy z app/data/, ale žádný plán…“.
- **Hotovo, když:** projde kontrolní seznam v oddílu 4.
- **Pozor:** štítek DEMO a věty o ukázce do ostré aplikace nepatří. Jádro mluví jako aplikace.

---

## 4. Kontrolní seznam před ostrým provozem

Seznam obsahuje jen to, co uvádí `15` nebo podklady `navrhy-designu/30-kontrola4-a-pohledy-2026-10-29/` (05 robustnost a bezpečnost, 06 regulace a klinická bezpečnost, 07 reálný provoz, 10 předání). Podklad 06 není právní stanovisko; konečnou kvalifikaci a třídu určí regulatorní poradce a notifikovaná osoba.

### 4.1 Klinická bezpečnost a pravidla

- [ ] Všech 29 klinických položek má **podpis garanta pro ostrý provoz** nad verzí a otiskem, které odpovídají nasazenému kódu. Rozhodnutí z makety se jako podpis nepřebírají (`15` zásada 6). Žádná položka není nerozhodnutá.
- [ ] U rozhodnutí převzatých z makety jako podklad: položka s rozhodnutím nad jiným zněním nebo bez otisku a položka rozhodnutá nad modelovou verzí příběhu jde garantovi znovu (`10-predani` odst. 7).
- [ ] Účinek zamítnutí každé klinické položky ověřen testem (obdoba T3 z `pravdivost.test.cjs`).
- [ ] Testy zásad prošly: návrh nikdy neobsahuje jednotky ani nemění dávku; žádný text neříká jíst víc; žádná obrazovka pacienta nevyzývá volat do ordinace; výpočty nevolají síť ani generativní AI.
- [ ] Bezpečnostní pravidla se pacientovi ukážou i se zamítnutými radami a před převzetím plánu (`15` odst. 2 bod 3).
- [ ] Připomínky v telefonu: ověřeno doručení i selhání; pacient při zaučení ví, že připomínka nemusí přijít (`15` odst. 5, podklad 06 B13).
- [ ] Převodníky exportů pro senzory v kohortě s testy na ukázkových souborech; nečitelný soubor se odmítne celý (`15` odst. 6a).
- [ ] Vylučovací kritéria, kohorta jen s inzulinem a seznam kompatibilních senzorů v návodu k použití (`15` odst. 1, 4; podklad 06 B4, C14).
- [ ] Doporučení podkladu 06 (C11) rozhodnuté vlastníkem: bezpečnostní pravidla fungují v telefonu i bez sítě.

### 4.2 Ochrana dat a bezpečnost

- [ ] Zabezpečený, šifrovaný server NutriFee; lékař mezi kontrolami nic nedostává (`15` zásada 5 a 6).
- [ ] DPIA podle osnovy `navrhy-designu/14-ucel-urceni-a-dpia-2026-10-18.md`, doplněná o tok dat (opsané hodnoty, export, formulář podpory); právní základ zpracování zdravotních údajů, role správce a zpracovatele, smlouvy o zpracování, servery v EU, informace pro pacienta, lhůty uchování a výmazu (podklad 06 odst. 5 body 22–26).
- [ ] Identitu, roli a čas plní server; schválení garanta jen přidávané záznamy; dvoufázové přihlášení pro garanta a správce; záznam o tom, kdo co četl (podklad 05 odst. 3 body 5–6).
- [ ] Testy oprávnění v průběžné integraci (cizí záznam nejde číst, měnit ani podvrhnout) a kontrola tajných klíčů v repozitáři (podklad 05 bod 9).
- [ ] Hlavičky ze serveru: CSP včetně `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`, HSTS; centrální escapování textu ze serveru (`15` zásada 6, podklad 05 bod 10).
- [ ] Personál se nepřihlašuje účtem pacienta (`15` odst. 6a).
- [ ] Minimum osobních údajů v záznamech; zálohy s obnovou k okamžiku (podklad 05 body 8 a 12).

### 4.3 Regulace (výtah z podkladu 06, odst. 1 a 5)

- [ ] Účel určení aktualizovaný podle dnešního chování a kvalifikační a klasifikační zpráva. Podklad 06 odhaduje třídu IIb kvůli kartě „posoudit dávku“; vlastník kartu vědomě ponechal (`15` odst. 18, 18. 10. 2026).
- [ ] Systém řízení kvality, řízení rizik se scénáři z podkladu 06 odst. 3, životní cyklus softwaru (podklad doporučuje nejvyšší třídu bezpečnosti pro moduly bezpečnostních pravidel, větve nízké glukózy a návrhů k dávce), kybernetická bezpečnost.
- [ ] Použitelnost se sumativní validací s pacienty, lékaři a sestrami, včetně písma 160 % a čtečky obrazovky.
- [ ] Zdůvodnění, že NutriFee není systém umělé inteligence (pravidla definují lidé, výstup je deterministický).
- [ ] Klinická zkouška a protokol studie; **během studie jen vypnutí položky** (garant navrhuje, výrobce provádí v řízení změn), opravy až po období (`15` odst. 13).
- [ ] Dozor po uvedení na trh, vigilance a sběr podnětů z provozu napojený na vyřizování stížností výrobce.

### 4.4 Provoz a předání

- [ ] Všechny převedené testy prošly; kontrolován celý výstup, ne jen poslední řádek; žádný zdrojový soubor není prázdný.
- [ ] Verze nasazení je dohledatelná a navázaná na verze položek registru.
- [ ] V souborech nejsou skutečná jména osob, institucí, výrobců ani produktů.
- [ ] Odhad zátěže z podkladu 07 ověřený v pilotu (pacient asi 8–11 min denně v rutině; lékař na kontrole odhadem 10–14 min jen na část NutriFee).

---

## 5. Rozpory k rozhodnutí

Body, které zdroj pravdy neurčuje a rozhodne vlastník. Do rozhodnutí platí chování makety.

1. **Otisk katalogu po přidání mezí.** Otisk katalogu `fpCat` v `demo/sync.js` obsahuje meze parametrů. Po doplnění mezí u R-REAKCE, D-CISTA a D-PRAND proto může správce u dřívějších rozhodnutí garanta k těmto položkám vidět „rozhodnuto k předchozímu znění“, i když se jejich znění nezměnilo. Garant v maketě zatím nerozhodoval, takže dnes to nic nemění. Otisk jádra `NF.itemFingerprint` se nezměnil. Rozhodnout, zda rozhodnutí garanta k těmto třem položkám platí dál, nebo je garant potvrdí znovu. Pro ostrou aplikaci to znamená rozhodnout, zda meze patří do otisku znění.
2. **Kontextový sloupec pod 1600 px** (atlas ordinace, R9): `15` neříká, jak má ordinace vypadat na užší obrazovce.
3. **Rozhodnuto 11. 11. 2026, v kódu až od SCHEMA 91** (`zdroj/navrhy-designu/36-posledni-kontrola/05-rozhodnuti.md`, body 13–15): „Jako obvykle“ u známého jídla jedním řádkem; jeden čas otázky po menší porci pro I-MENE i „pod 4?“ (u večeře i za 60 min); jediná noc pod 3,0 ukáže kartu k bazálu bez ohledu na počet nocí. Předávka popisuje SCHEMA 90, kde tyto body ještě neplatí; do jejich postavení platí chování SCHEMA 90.
4. **Nedodělky SCHEMA 90, které nejsou rozpor se zdrojem pravdy:** obrazovka opravy zápisu umí jen porci a smazání, jádro i jídlo a hodnoty (`NF.editEpisode`); fokus po odpovědi v kroku 1 a po „Opravit zápis“, „Smazat“ a „Nebudu jíst“; dva přesahy textu při 320 px a písmu 160 % (detail jídla, Můj plán); souhrn položky R-POKYNY v registru ještě říká „sedm“ pravidel, plán jich nese osm; velikost uloženého stavu (0,5–1 MB) a předformátované texty v rozpracované kontrole a ve stopě. Zbývající nálezy poslední kontroly jsou v `zdroj/navrhy-designu/36-posledni-kontrola/08-schema90-jadro.md` odd. 2 a `10-schema90-obrazovky.md` oddíl „Zbývá“.

## 6. Vyřešeno v SCHEMA 87, 88 a 90

**Rozhodnutí vlastníka 11. 11. 2026 (SCHEMA 90, `zdroj/navrhy-designu/36-posledni-kontrola/05-rozhodnuti.md`, body 1–12):**

1. Den aplikace končí ve 4:00 (S-PRIPOMINKY `den_konec`, provozní).
2. Do 3 h po hlavním jídle je hlavní tlačítko „Zapsat svačinu“ (B-HYPO `dalsi_slot_h`).
3. „Glukóza teď pod 4“ v kroku 1 je pokles se všemi důsledky (B-HYPO v3).
4. Čas pod cílem nad mezí blokuje větev „zvýšit“ u všech dávek (D-POSTUP v2, bod 11 a u bazálu bod 5).
5. Výrazně vyšší dávka: nová klinická položka I-VYSSI (8. pravidlo), otázka za 60 min, bez procházky, bez rady o dávce.
6. Poklesy z exportu do 4 h po jídle (Z-IMPORT v2 `pokles_min`).
7. Oprava a smazání zápisu do 24 h; oprava jde do stopy a zápis pak do návrhu k dávce nejde.
8. Body ověření potvrzené daty předvyplněné „sedí podle dat“ (D-POSTUP v2).
9. Štítek dema „Demo · jen syntetická data“ a věta v zápatí ([`01-cesta-k-demu.md`](01-cesta-k-demu.md)).
10. Písmo pacienta: hlavní text a volby od 17 px, doplňkový od 15 px, nic pod 15 px (`tokeny.test.cjs`).
11. Aplikace běží v českém čase; při jiném pásmu telefonu věta o cestování.
12. K-KRITERIA v2: bazál 1× denně večer a bez korekčního schématu.

Z poslední kontroly SCHEMA 90 dále vyřešila synchronizaci (doména a pohled, `NF.mergeRemote`, háček jen po akci, `NF.readOnly`, odolné vykreslení), semafor zelený jen s časem pod 3,0 pod mezí a „bez hodnocení“ pod 14 dny dat, export za jiné období, pozdní export a druhou kontrolu, aktéra „sestra“ ve stopě, větev v okamžiku rozhodnutí a „jinak než postup“ určené jádrem, pevnou hranici I-VYSOKA 15, náhledy telefonu jen ke čtení a texty pacienta. Podrobnosti jsou v `zdroj/navrhy-designu/36-posledni-kontrola/08-schema90-jadro.md` až `11-schema90-prezentace.md`. Rozpor „otisk katalogu po přidání mezí“ (oddíl 5 bod 1) SCHEMA 90 neřešila.

### SCHEMA 87 a 88

**Rozhodnutí vlastníka 7. 11. 2026 (SCHEMA 88):** denní doby slotů zůstávají provozní parametry S-PRIPOMINKY a garant je neschvaluje. Přepínač nemoci zůstává záměrně na Dnes i v Bezpečí, oba vedou na týž stav. Ověřovací body lékaře v příběhu ukázky jdou přes `NF.setVerify`, takže stopa má `navrh.overeni`.

Body, které předávka ve SCHEMA 86 našla a které SCHEMA 87 nebo rozhodnutí vlastníka 6. 11. 2026 vyřešily:

1. **Denní doby slotů v registru:** parametry provozní položky S-PRIPOMINKY s mezemi 8–12, 13–17 a 19–23,5, čte je `NF.daypartEnd` (pořadí se hlídá); `NF.DAYPART_END` zůstal jen jako výchozí hodnota. Rozhodnuto 7. 11. 2026: zůstávají provozní, garant je neschvaluje.
2. **Meze pěti parametrů** v `NF.PARAM_BOUNDS`: `R-REAKCE.minQuantile` 4–20, `D-CISTA.svacina_min` 60–240, `D-CISTA.oprava_min` 15–120, `D-PRAND.hypoMin` 3–30, `S-VYSLEDEK.min_n` 2–20. Výchozí hodnoty leží uvnitř mezí.
3. **Rozhodnutí u návrhové karty:** „Souhlasím“ a pod odkazem „Jiné rozhodnutí“ (ponechat · jiná dávka voličem · zamítnout s důvodem) dopsáno do instrukcí projektu makety (`CLAUDE.md` mimo repozitář; výtah pro demo je [`AGENTS.md`](AGENTS.md)) a do `15` odst. 9 a 18.
4. **README makety** přepsané podle `15`.
5. **Názvy testů** „známé od 4“, „upřesňuje“, „pohyb jen do 60 min“ a „Tato pravidla připravil NutriFee a posoudil je lékař.“ opravené (komentář „SCHEMA 87“). Zastaralý zůstal jen název „volič dávky mřížkou“ v `kontrola4-obsah.test.cjs`, tělo testuje posuvník.
6. **Počty:** `15` uvádí 42 položek registru (14 provozních) a 171 jídel; starší podklad `30-…` zůstává historií. Od SCHEMA 90 je položek 43 (29 klinických, 14 provozních).
7. **Zdroj pravdy mimo veřejný repozitář:** vlastník rozhodl 6. 11. 2026 dát `15` a podklady do veřejného repozitáře („Jména neřeš, dej to ven do repa ať je to jednoduché.“) a předávku uložit do repozitáře makety (`predani/`) až po opravách.
8. **Zásady v maketě (SCHEMA 87):** zápisy do stopy s verzí a otiskem položek, krok 3 při glukóze pod 4 bez hlavního tlačítka píchnutí, posuvník místo −/+ u pacienta s rozsahem 1–60 j. z `NF.DOSE_RANGE`, volba „jiný čas“, výchozí oznámení zamítnuté části v jádře. Podrobnosti jsou v atlasech (oddíly „Vyřešeno v SCHEMA 87“) a ve zprávě `navrhy-designu/34-predani-programatorovi/02-schema87.md`.
