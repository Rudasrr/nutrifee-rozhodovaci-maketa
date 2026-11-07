# Ověření cíle makety – 4. 11. 2026 (SCHEMA 83)

Otázka vlastníka: je maketa v pořádku, dobře se ovládá, garant ji lehko pochopí – a hlavně: je NutriFee skutečným přínosem pro pacienta (ulehčí život, zlepší stav) a dá lékaři chybějící kontext a správnou radu, co u konkrétního pacienta změnit a jaký plán vydat?

Tři nezávislé pohledy na kopii makety (prohlížeč 1440×900 a 390×844, jádro v node, simulace 12 týdnů), zprávy `01`–`03` v této složce, testy `04` (**133 prošlo, 0 selhalo**). Klíčové nálezy jsem ověřil sám v kódu (odkazy níže).

## 0. Verdikt

1. **Technicky je maketa v pořádku.** 174 kroků na obou velikostech bez jediné chyby konzole, selhaného klepnutí, nedosazené hodnoty nebo citace mimo obrazovku; ukládání poznámek, F5, návrat za týden i výsledky správce fungují (03 odd. 1, 4).
2. **Lékař dostane správný obraz.** Nezávislý přepočet 256 zápisů modelového pacienta souhlasí s aplikací na jednotku (snídaně 65/72 nad cílem, medián 12,0; oběd 54/79; 2 noci 3,6; HbA1c 62→55; TIR 58→68 %). Diabetolog dojde ke správnému závěru „zvýšit snídani, ostatní ponechat“ za 2–3 minuty; prahy registru jsou pro DM2 na pevných dávkách rozumné (02 odd. 2).
3. **Ale lékaři aplikace v klíčové chvíli bere rozhodnutí z ruky.** Dávku může změnit jen tam, kde aplikace vytvoří větev „zvýšit/snížit“; u večeře (49 % nad cílem, bez karty), u oběda (blok po dvou říjnových poklesech po menší porci) ani u bazálu volič nemá, a „Jiné rozhodnutí“ nabízí jen ponechat/zamítnout (`app/screens-clinic.js:480, 521–523`). Zásada 1 říká „dávku určuje jen lékař“ – v praxi ji určuje práh registru. **(02 A1; doporučuji opravit, rozhodnutí 1.)**
4. **Brána „nejdřív rady“ trestá za rady, které aplikace nenabídla.** Podmínka „přijato < 3 rady“ platí i tehdy, když se u jídla dne rady skoro nenabízely (pestrá strava: 6–14 nabídek na 52 obědů v simulaci); lékař pak čte „rada přijata jen u 2 z 27“ jako nespolupráci a dávka zůstane 3 měsíce beze změny (`app/core.js:2117`). U modelového pacienta ve větvi „nepřijal“ to blokuje snídani s 92 % nad cílem a vrcholy do 17 mmol/l. **(01 A1, 02 A2; rozhodnutí 2.)**
5. **Pro pacienta je NutriFee práce navíc, ne úleva – a to je třeba říkat poctivě.** 33–40 klepnutí, 6 odečtů ze senzoru a 8–11 min denně proti nule dnes; snesitelné jen díky zápisu bez psaní. Při realistickém rozptylu reakcí (SD 1,6 mmol/l) vstoupí do učení jen 47 % zápisů, první „známé“ jídlo přijde 16.–40. den, po 12 týdnech jsou známá 4–6 jídla z ~30; modelová data (šum ±0,36) ukazují nejlepší případ. Hlavní přínos pro zdraví jde přes lékaře na kontrole (report + správná dávka), ne přes rady; proto body 3 a 4 rozhodují o tom, zda aplikace cíl plní. Srovnání „místo vážení a počítání sacharidů“ v `29/02` je pro tuto kohortu nadsazené – ti lidé dnes nepočítají nic (01 odd. 0, A3).
6. **Garant maketu pochopí, ale potřebuje 60 minut, ne 15/45.** Vyprávění hlavní linie 7 741 slov ≈ 39 min čtení + 5 min animací, průvodci dalších 12 943 slov; úvod slibuje „15 minut sledování, celkem 45–60“ a nikde není zbývající čas. Nejhůř pochopitelné položky: D-CISTA, D-PRAND, D-POSTUP (karta ukazuje jen první větu „Co schvalujete“, deset prahů v závorce bez slov) a R-REAKCE (03 odd. 2).

## 1. Zásadní nálezy (A) a jak je řeším

| # | Nález | Zdroj | Ověřeno | Řešení |
|---|---|---|---|---|
| A1 | Lékař nemůže sám změnit dávku bez větve aplikace | 02 A1 | `screens-clinic.js:480` `showStepper` jen pro up/down nebo bez postupu | **rozhodnutí 1** |
| A2 | Brána „nejdřív rady“ bez ohledu na počet nabídek; výlučný blok | 01 A1, 02 A2 | `core.js:2117` | **rozhodnutí 2** |
| A3 | Blok „zvýšit“ bere každý pokles za 92 dní, i po menší porci s známou příčinou | 02 A3 | `core.js:2140` `lowEvents` jen podle jídla a data | **rozhodnutí 3** (vlastník 27. 10.: bezpečnost) |
| A4 | Postup „bazál v noci pod cílem“ nemá `sestraBody` – odpověď sestry „jídlo pozdě večer“ se na kartu nedostane; v příběhu to předvyplňuje jen demo | 02 A4 | `registry.js:36–39` jen bazalHigh/prandHigh | oprava bez dotazu |
| A5 | Kohorta připouští derivát sulfonylurey bez záznamu; aplikace radí procházku a o riziku poklesu neví | 01 A2 | `core.js:405`, K-KRITERIA | **rozhodnutí 5** |
| A6 | Po zamítnutí R-REAKCE panel přeskočí 10 kroků sc. 23 včetně „Druhý případ: menší porce“ – garant nikdy nevidí I-MENE a rozhoduje ho v souhrnu naslepo; D-CISTA, D-PRAND rovněž | 03 A1, A2 | průchod agenta, snímky `ga-reakce-23-13.png` | oprava bez dotazu (závislosti kroků) |
| A7 | Odhad času v úvodu třetinový, bez zbývajícího času | 03 A3 | `demo/intro.js:20` | **rozhodnutí 7** |

## 2. Významné nálezy (B) – co doporučuji postavit

- **Vývoj v čase** (02 B1): snídaně se v modelu zhoršují 12 → 15,5, report dává jen medián za 92 dní. Dvě čísla „první polovina · poslední 4 týdny“ + slovo směru. Graf tří křivek vlastník zavrhl (odst. 18) – tohle jsou dvě čísla. **Rozhodnutí 4.**
- **Hmotnost** (02 B7) nikde; sestra ji může vybrat voličem. **Návyky a cíle na kontrole** nejde měnit (02 B8). **Rozhodnutí 6.**
- **Večeře bez řádku** (02 B3): 49 % nad cílem, lékař se to dozví jen z tabulky. Řádek „bez návrhu (práh 2/3)“ – součást rozhodnutí 1.
- **Sloučení jídla přes jídla dne** (02 B2): „Chléb se sýrem – většinou v cíli“, ačkoli u snídaně 8/15 nad cílem. Zobrazovat podle jídla dne – postavím bez dotazu (pravidlo R-REAKCE „slévá se jen při stejné dávce“ zůstává, jen tabulka dostane sloupec).
- **Pacient 6× snížil dávku sám** – jen číslo, ne téma (02 B5); věta do „Co se dělo“ a do „Co návrh oslabuje“ – bez dotazu.
- **Bazál jen z 14 dní exportu**, 83 opsaných ranních hodnot ladem (02 B9) – doplnit do karty a souhrnu – bez dotazu.
- **Pacient:** „dejte si obvyklou porci“ u člověka bez chuti (01 B1 – doplnit větu „řekněte to na kontrole“ a počítat plánované menší porce pro lékaře); při nemoci nenabízet „včera chybí“ (B2); hystereze „známé → pokaždé jinak“ (B3); zaučení, jak najít vrchol v grafu senzoru (B7); „Cesta ke kontrole“ bez jmenovatele (B6); týdenní shrnutí s obsahem i bez rad (B9) – vše bez dotazu, texty jako návrh autora ke schválení garantem.
- **Garant:** karta položky s celým „Co schvalujete“ u D-CISTA/D-PRAND/D-POSTUP ve třech větách se slovy u prahů; D-POSTUP nabídnout až po kroku o blokaci; zásuvka bez budoucích položek; věta o provozních položkách a o neformálnosti v úvodu; telefon: panel 60 % výšky, štítek pod panelem u 13 položek – bez dotazu.
- **Podklad `29/02`** (01 A3): přepsat srovnání na „přidává 8–11 min denně; výměnou dostane paměť po jídlech a report lékaři“. **Rozhodnutí 8.**

## 3. Co funguje (shoda všech tří pohledů)

Zápis bez psaní; bezpečnostní pravidla I-* věcně správná a nezávislá na radách; „Proč tohle radíme“; režim nemoci; report s čísly, vyřazenými zápisy s důvodem a „co návrh oslabuje“; sestra před lékařem; důvod každé změny pro pacienta; poznámky garanta ukládané samy, historie, výsledky správce; nulové chyby v celém průchodu.

## 4. Rozhodnutí vlastníka (předloženo 4. 11. 2026)

Viz `05-rozhodnuti.md` (doplním po volbě).
