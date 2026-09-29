# NutriFee — rozhodovací maketa

Interaktivní maketa aplikace, která **vyhodnocuje reakci pacienta na jídlo, učí se z jeho dat
a před jídlem doporučuje změnu** jídla, porce, pořadí nebo doplňku. Lékař na kontrole vidí report:
jak plán probíhal, jak tělo reagovalo na jednotlivá jídla a **jestli rady fungovaly, když je pacient
přijal**. Slouží klinickému garantovi jako podklad k rozhodnutí o studii.

**Není klinický nástroj, není klinicky validovaná a neobsahuje žádná skutečná pacientská data.**
V celé maketě zůstává viditelné označení „DEMO · syntetická data · není určeno pro léčbu“.

## Kde to běží

**https://rudasrr.github.io/nutrifee-rozhodovaci-maketa/** — veřejná URL, otevře se bez přihlášení.
Zdroj: https://github.com/Rudasrr/nutrifee-rozhodovaci-maketa

Stránka je statická, bez backendu a bez databáze. Nic se z prohlížeče neodesílá; průběh demonstrace
zůstává jen v prohlížeči toho, kdo ji otevřel.

## Spuštění lokálně

Dvojklik na `nutrifee-rozhodovaci-maketa.html` v běžném prohlížeči. Nic se neinstaluje.

Pokud prohlížeč z `file://` blokuje lokální úložiště (typicky Safari), maketa běží dál, jen se
průchod neuloží mezi obnoveními stránky. Chceš-li průchod zachovat, spusť ji přes lokální server:

```bash
cd "maketa-rozhodovaci" && python3 -m http.server 8731
```

a otevři `http://127.0.0.1:8731/nutrifee-rozhodovaci-maketa.html`.

Automatické kontroly:

```bash
cd "maketa-rozhodovaci" && node nutrifee-rozhodovaci-maketa.test.cjs
```

## Pro koho je a co neporuší

Kohorta: dospělý s DM2, senzor CGM, **jen inzulin bez perorálních antidiabetik**, bazál 1× večer
a prandiální inzulin ke třem hlavním jídlům, **pevné dávky od lékaře**.

1. **Aplikace nikdy nepočítá, nenavrhuje ani nemění dávku inzulinu.** Ohýbá jídlo, porci, pořadí a pohyb.
2. **Cílem je konzistence sacharidů, ne jejich omezování.** Porce se řídí k obvyklé oběma směry;
   „dej si menší porci“ aplikace neříká nikdy.
3. **Rady měnící množství sacharidů jen před bolusem.** Před každou radou se aplikace ptá, jestli si
   pacient už píchl. Neznámý stav podání se chová jako „po bolusu“.
4. **Každý výpočet a rada pochází ze schváleného pravidla** a na obrazovce je vidět které, v jaké verzi
   a v jakém stavu. Neschválené pravidlo se k pacientovi nedostane — není ani zašedlé.
5. **Nic se neodesílá, nikdo pacienta průběžně nesleduje.**
6. **V ordinaci se nic nevypisuje.** Kontext se zobrazuje, kompenzace se označí tlačítkem, úkol se
   vybírá z katalogu, důvod rozhodnutí z připravených.

## Tři úrovně jistoty

| Úroveň | Kdy | Co aplikace řekne |
|---|---|---|
| **Známé jídlo** | aspoň 3 úplné záznamy (parametr pravidla R-REAKCE) | o kolik obvykle stoupne a co tehdy pomohlo |
| **Podobné jídlo** | neznámé, ale podobné vlastnostmi (R-PODOBNOST) | „vypadá jako jídla, po kterých ti to stoupá víc“ — bez čísla |
| **Neznámé jídlo** | nic podobného | žádný odhad, nabídne zapsat |

Podobnost se počítá z **vlastností porce** (sacharidy, bílkovina, tuk, vláknina, forma), ne z názvu.
Do učení vstupují jen úplné záznamy mimo nemoc; záznam s „nevím“ u inzulinu nebo s mezerou v datech
je vidět, ale nepočítá se. U každého jídla je vidět, kolikrát ho pacient jedl.

## Návod k demonstraci

Maketa je **jeden souvislý příběh**: modelový pacient od zařazení v ordinaci po další kontrolu.
Nahoře jsou demonstrační přepínače rolí (Pacient / Lékař / Sestra / Garant), **Průvodce maketou**
a **Panel prezentujícího**. V demo liště je krokování **◀ Předchozí / Další ▶ / Reset**.

Příběh má **16 kapitol v pěti dějstvích**.

| Dějství | Kapitoly | Co ukazuje |
|---|---|---|
| **1 — V ordinaci** | 1–3 | Lékař zařadí pacienta a vydá plán, sestra zaučí a předá zařízení, pacient plán převezme |
| **2 — Doma: aplikace se učí** | 4–5 | Neznámé jídlo bez odhadu; po týdnu první známá jídla |
| **3 — Rada před jídlem** | 6–7 | Otázka na inzulin rozhodne, které rady se smějí dát; nové jídlo podobné známému dostane směr, ne číslo |
| **4 — Když se něco pokazí** | 8–12 | Nemoc nebo chybějící data vypnou rady; nejasná rada se vyřadí, zmizí pacientovi a garant schválí opravenou verzi |
| **5 — Kontrola a nový plán** | 13–16 | Report „přijato oproti nepřijato“, rozhodnutí z připravených důvodů, případně úkol na změnu režimu |

**Kapitola ukazuje výchozí stav scény; její akci odehraje prezentující.** Skok na kapitolu přehraje
příběh deterministicky od začátku, takže stav vždy odpovídá ručnímu průchodu.

### Odbočky

Přepínají se v panelu prezentujícího u příslušného dějství a načtou příběh znovu.

Odboček je pět. Volby, které se odehrají uvnitř jedné obrazovky — příčina chybějících dat, stav
připojení zařízení — se klikají přímo na obrazovce a nejsou to větve příběhu.

| Odbočka | Volby |
|---|---|
| Zaučení u sestry | proběhlo · **nezdařilo se** — plán je vydaný, ale úkol se neaktivuje |
| Měl už pacient inzulin? | ještě ne · už si píchl · **neví** — posuzuje se jako po podání |
| Co se stalo 20. října | nemoc · chybějící data ze senzoru (příčinu vybere pacient na obrazovce) |
| Jak pacient s radami naložil | většinou je přijal · většinou nepřijal („nechci“) · většinou nepřijal („nemám to doma“ → rada je nepraktická) |
| Podklad ke kontrole | běžný průběh · bez zápisů · bez zápisů i bez souhrnu ze senzoru · zpětně hlášená bezpečnostní událost · aktuální problém během návštěvy |

V panelu prezentujícího jsou dál **stav zařízení pacienta** (připojené / nepřipojené — bez připojení
aplikace rady vypíná) a **pět okrajových situací** (dovolená, ztráta motivace, hospitalizace nebo
změna léčby jiným lékařem, ukončení účasti, odvolání souhlasu).

### Průchod na úrovni garanta

V panelu prezentujícího **Začít průchod garanta**: cesta jen po schvalovacích bodech. U každého bodu
demo lišta řekne, **co se tu podepisuje**, a ukáže skupinu pravidel s jejich stavem. Na konci vede
na rozhodovací list.

Katalog pravidel je uspořádaný do **tří skupin, které garant podepisuje**, místo dvanácti samostatných
položek: *jak se počítá reakce na jídlo*, *jaké rady se smějí dát a kdy*, *kdy se zasahuje do režimu*.
U každé skupiny je vysvětlené, co přesně se podepisuje a jak výpočet funguje; úplný popis
jednotlivého pravidla se otevře odkazem **Podrobnosti**.

### Dvě vrstvy nápovědy

- **V aplikaci** (zůstává v produkci): „Proč mi to radíš a jak moc si tím jsi jistá?“ — odkud aplikace
  ví, co nepočítá a proč se ptá na inzulin.
- **Průvodce maketou** (jen pro prezentaci): po zapnutí se u prvků objeví značka `?` s vysvětlením,
  proč je to navrženo takhle. Každé vysvětlení je označené jako **závazná zásada**, **návrh
  k posouzení**, nebo **otevřené rozhodnutí**. Kde není opora, je uvedeno „k ověření“. Texty jsou pevné,
  nevytváří je žádná živá generativní AI.

## Oddělení od budoucí produkce

```
app/    jádro — doména (jídla, úrovně jistoty, páky, rady, report), obrazovky, vykreslení.
        Žádná modelová data, žádné texty průvodce.
demo/   demonstrační vrstva — katalog jídel, pravidel a úkolů, simulovaný senzor, příběh,
        Průvodce maketou, panel prezentujícího.
```

Produkční sestavení vznikne vynecháním složky `demo/` a čtyř řádků `<script src="demo/...">`
v HTML. Obrazovky se nepřepisují. Jádro pak startuje v prázdném stavu bez pravidel — a bez
schváleného pravidla nic nevyhodnocuje ani neradí. Hlídá to test „Produkční sestavení se obejde
bez složky demo“.

## Co je funkční a co simulované

**Funkční logika makety:** zařazení, katalog úkolů s blokací neschválených pravidel, zaučení sestrou
jako podmínka aktivace; tři úrovně jistoty a podobnost z vlastností; vzestup po jídle z úplných
záznamů; páky s bezpečnostním pravidlem bolusu; rady jen ze schválených pravidel s viditelnou verzí;
přijetí a odmítnutí rady s důvodem; učení, co pomohlo; vypnutí rad při nemoci, pauze a bez spojení;
vyřazení a schválení pravidla s okamžitým dopadem; report s konzistencí sacharidů a srovnáním
„přijato vs. nepřijato“ včetně signálu k rozhovoru; rozhodnutí z připravených důvodů a úkol na změnu
režimu; P2 se zachováním historie P1; průchod garanta; deterministický reset.

**Simulované:** senzor a import dat (jednoduchý deterministický model v `demo/`), katalog jídel
se syntetickými hodnotami, offline režim, kontaktní postup, schválení garantem, posun času,
evidence incidentů. Nic se neodesílá.

**Neimplementováno záměrně:** backend, přihlášení, integrace senzoru, jakýkoli výpočet dávky,
studijní evidence.

## Co musí rozhodnout garant

Rozhodovací list je v roli **Garant → Rozhodovací list**; výchozí stav každé položky je
„nerozhodnuto“. Poznámky lze exportovat jako textový soubor označený „Poznámky z demonstrace — nejde
o formální klinické schválení“.

1. **Odhad reakce** — na čem stojí a s jakou nejistotou se ukazuje.
2. **Přípustné typy rad** — které páky a kdy.
3. **Hranice pohybu po bolusu** — pravidlo procházky je v maketě jen návrh a k pacientovi se nedostane.
4. **Obvyklá porce** — co to je a jak se určí.
5. **Katalog úkolů** — co patří do první studie.
6. **Zdroj a licence potravinových dat.**
7. **Regulatorní zařazení** — aplikace, která odhaduje reakci na jídlo a doporučuje úpravu jídla,
   dělá klinické tvrzení; podle MDR jde o jinou třídu rizika než pozorovací deník. K ověření.
8. **Provoz** a 9. **Pilot** — kdo co řeší a co je úspěch.

Režim dávkování potvrzují mezinárodní i české odborné standardy léčby DM2. **Že se z reakcí na jídlo
dá odvozovat doporučení, nepotvrzuje žádný z nich** — to je k ověření. Obvyklá vědecká opora pro
personalizovanou predikci (studie z roku 2015) se na tuto kohortu nepřenáší: šlo o lidi bez inzulinu,
se sekvenací mikrobiomu a s predikcí plochy pod křivkou, ne průběhu. Plné citace jsou v projektové
dokumentaci, která se nepublikuje.
