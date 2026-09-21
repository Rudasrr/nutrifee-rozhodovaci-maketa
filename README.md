# NutriFee — rozhodovací maketa

Interaktivní maketa podle `NutriFee-zadani-makety-pro-Claude-Code.md` (verze 1.0, 21. 9. 2026).
Slouží diabetologovi fakultního centra jako podklad k rozhodnutí o rozsahu studie.

**Není klinický nástroj, není klinicky validovaná a neobsahuje žádná skutečná pacientská data.**
V celé maketě zůstává viditelné označení „DEMO · syntetická data · není určeno pro léčbu“.

## Kde to běží

**https://rudasrr.github.io/nutrifee-rozhodovaci-maketa/** — veřejná URL, otevře se bez přihlášení.
Zdroj: https://github.com/Rudasrr/nutrifee-rozhodovaci-maketa

Stránka je statická, bez backendu a bez databáze. Nic se z prohlížeče neodesílá; průběh demonstrace
zůstává jen v prohlížeči toho, kdo ji otevřel.

## Spuštění lokálně

Dvojklik na `nutrifee-rozhodovaci-maketa.html` v běžném prohlížeči. Nic se neinstaluje a nic se nikam neodesílá.

Pokud prohlížeč z `file://` blokuje lokální úložiště (typicky Safari), maketa běží dál, jen se
průchod neuloží mezi obnoveními stránky — demo lišta to v takovém případě napíše. Chceš-li průchod
zachovat i po obnovení, spusť ji přes lokální server:

```bash
cd "maketa-rozhodovaci" && python3 -m http.server 8731
```

a otevři `http://127.0.0.1:8731/nutrifee-rozhodovaci-maketa.html`.

Automatické kontroly:

```bash
cd "maketa-rozhodovaci" && node nutrifee-rozhodovaci-maketa.test.cjs
```

## Návod k demonstraci

Nahoře jsou tři demonstrační přepínače rolí (Pacient / Lékař / Garant), tlačítko **Průvodce maketou**
a tlačítko **Panel prezentujícího**. Přepínač rolí je prezentační pomůcka, ne přihlášení.

**Panel prezentujícího** (není součástí navigace pacienta ani lékaře) umí:

- spustit každý ze čtyř scénářů od vstupního stavu,
- přepnout povinnou variantu (přepnutí načte scénář znovu od začátku),
- přeskočit na konkrétní krok průchodu,
- vyvolat připravené situace a posunout modelový čas,
- zapnout nebo vypnout průvodce,
- zobrazit otázky pro garanta a zapsat poznámky,
- přepnout okrajové situace a resetovat demonstraci.

Doporučené pořadí pro ukázku: **S1 → S3 → S2 → S4**. S1 a S3 ukazují hodnotu cyklu, S2 bezpečnostní
přerušení, S4 správu pravidel a otevřené rozhodnutí o samotitraci.

### Scénáře a jejich povinné varianty

| Scénář | Co ukazuje | Povinné varianty |
|---|---|---|
| **S1** od nového senzoru k vlastnímu závěru | pozorovací úkol má začátek i konec, chybějící údaj se nedopočítává | výchozí · málo podkladů (u E3 chybí senzorová data) · bolus podán / stav neznámý · nezvládnuté zaučení |
| **S2** nejasnost, nemoc nebo výpadek a bezpečný návrat | aplikace umí přestat vyvozovat závěry a přerušit úkol | nemoc · výpadek se systémem výrobce v pořádku · nefunkční senzor · pacient neví |
| **S3** podklad ke kontrole, rozhodnutí a nový plán | pevné pořadí jedné stránky, rozhodnutí lékaře, vydání P2 | výchozí · A bez zápisů · A bez senzorového souhrnu · B historická bezpečnostní událost · C aktuální problém během návštěvy · D rozsah dávkového podkladu |
| **S4** hranice samotitrace, vyřazení pravidla a incident | kdo smí pravidlo uvést v platnost, zastavit je a obnovit činnost | A rozhodnutí o samotitraci · B změna pravidla a incident |

Okrajové situace (dovolená, ztráta motivace, změna léčby jiným lékařem, konec platnosti plánu,
pečující osoba, změna lékaře, hospitalizace, ukončení účasti, odvolání souhlasu, úmrtí) jsou
v panelu prezentujícího jako jednoduché přepnutí stavu. Nejsou pátým scénářem.

### Průvodce maketou

Vypínatelná prezentační vrstva pro prezentující a hodnotitele. **Není součástí budoucí produkční
aplikace.** Po zapnutí se u relevantních prvků objeví diskrétní značka `?`; kliknutím nebo
klávesnicí se otevře panel, který podle relevance odpoví: co zde uživatel dělá nebo vidí, proč je to
navrženo právě takto, jaké omezení či riziko to řeší, co je simulované a co má rozhodnout garant.

Každé vysvětlení je označené jako **zásada ze zadání**, **návrh k posouzení**, nebo **otevřené
rozhodnutí**. Kde není opora, je uvedeno „k ověření“. Texty jsou pevné a zkontrolovatelné —
nevytváří je žádná živá generativní AI.

Běžná uživatelská nápověda pro pacienta a lékaře zůstává v samotných obrazovkách. Průvodce ji
nenahrazuje a ona nenahrazuje jeho.

## Oddělení od budoucí produkce

```
app/    jádro — doménová pravidla, obrazovky, vykreslení. Žádná modelová data, žádné texty průvodce.
demo/   demonstrační vrstva — modelová data a scénáře, obsah průvodce, průvodce, panel prezentujícího.
```

Produkční sestavení vznikne vynecháním složky `demo/` a čtyř řádků `<script src="demo/...">`
v HTML. Obrazovky se nepřepisují. Jádro pak startuje v prázdném přípravném stavu a data by četlo
ze skutečného zdroje.

Kotvy průvodce (`data-guide`) vkládá jádro **jen tehdy**, když je vrstva průvodce načtená
a zapnutá. Bez ní v DOM nevzniká nic navíc — nejde o skrytí pomocí CSS. Ověřeno testy
„Bez načtené vrstvy průvodce nevznikne v DOM žádná kotva“ a „Produkční sestavení se obejde bez
složky demo“.

## Co je funkční a co simulované

**Funkční logika makety:** stavy plánu, úkolu a epizod; blokace vydání plánu bez náležitostí;
oddělení zaznamenaných a úplných epizod; pozastavení a obnovení úkolu; katalog pravidel včetně
schválení, vyřazení a dopadu; jednostránková kontrola s pevným pořadím; vydání P2 se zachováním
historie P1; rozhodovací list garanta; deterministický reset.

**Simulované:** připojení senzoru a import dat, offline režim, kontaktní postup, doručení změny
pravidla, modelové schválení garantem, posun času, evidence incidentů. Nic se neodesílá.
Nezávislé ověření podání dávky neexistuje a ani se nesimuluje.

**Neimplementováno záměrně:** skutečné přihlášení, backend, přenos dat ze senzoru, zdravotní
dohled, notifikace, klinické výpočty, jakýkoli dávkovací algoritmus, studijní evidence.

## Otevřená klinická rozhodnutí

Rozhodovací list je v roli **Garant → Rozhodovací list**; výchozí stav každé položky je
„nerozhodnuto“ a nic není předvybrané. Poznámky lze exportovat jako textový soubor označený
„Poznámky z demonstrace — nejde o formální klinické schválení“.

1. **Katalog** — které pozorovací úkoly do první studie, jaká minimální epizoda, co znamená
   dokončení a kdy lze bezpečně nabídnout změnový úkol.
2. **Bezpečnost a přerušení** — kdo dodá konkrétní formulace, meze a kontaktní postupy; které stavy
   pozastavují úkol a kdo jej obnovuje.
3. **Jedna stránka** — stačí navržené pořadí a zdroje; jak oddělit různá období; co je klinicky
   užitečný kontextový nález.
4. **Dávkové podklady** — pouze vzorce a otázky, nebo i předem odborně připravený číselný podklad;
   jaký původ a schválení by měl mít. Slučitelnost číselné varianty se zákazem výpočtu dávky
   zůstává otevřená.
5. **Samotitrace bazálu** — mimo první studii, samostatná větev k dopracování, nebo odklad.
6. **Provoz** — kdo řeší neúspěšné zaučení, incident, nedoručenou aktualizaci a předání při odchodu.
7. **Pilot** — jak se pozná užitek oproti senzoru a edukaci, jak se změří celková práce a jaké budou
   stop/go podmínky.

Dále zůstávají otevřené vstupní údaje ze zadání: přesná definice stability režimu a vstupní kritéria
kohorty, konkrétní senzor a jeho datová cesta, regulatorní posouzení, právní základy zpracování
a předem určené ukazatele pilotu. Maketa žádný z těchto bodů neřeší ani nedokládá.
