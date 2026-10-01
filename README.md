# NutriFee — interaktivní maketa

Maketa aplikace pro pacienty s diabetem 2. typu na inzulinu s **pevnými dávkami**. Aplikace se učí
z pacientových zápisů, jak jeho tělo reaguje na jednotlivá jídla, před jídlem radí (obvyklá porce,
doplněk, pořadí, pohyb), připomíná předepsaný inzulin a ptá se na podání. Lékař na kontrole dostane
report se souhrnem a **návrhy na příští plán s důvodem a postupem ověření** — jen schvaluje, upravuje
nebo odmítá.

**Není klinický nástroj, není validovaná, neobsahuje skutečná data.** Všude je označení
„DEMO · syntetická data · není určeno pro léčbu“.

**https://rudasrr.github.io/nutrifee-rozhodovaci-maketa/** — statická stránka, bez backendu, nic se neodesílá.

## Spuštění

Dvojklik na `nutrifee-rozhodovaci-maketa.html`. Pro uložení průchodu mezi obnoveními stránky:

```bash
cd maketa-rozhodovaci && python3 -m http.server 8731
```

Testy:

```bash
cd maketa-rozhodovaci && node nutrifee-rozhodovaci-maketa.test.cjs
```

## Zásady, které maketa hlídá

1. **Dávku určuje jen lékař.** Aplikace ji zobrazuje, připomíná a ptá se na podání. Nevymýšlí směr ani výši.
   V reportu lékaři je jen návrhová karta „posoudit dávku“: proč vznikla, co ji oslabuje, co ověřit
   (sedí / nesedí) a **větev lékařova schváleného postupu** (zvýšit / snížit / ponechat). Jednotky volí lékař voličem.
2. **Cíl je konzistence jídla k pevné dávce, ne omezování.** Pacient nepočítá sacharidy.
3. **Rada k množství jídla:** před píchnutím oběma směry k obvyklé; po píchnutí a při „nevím“ jen z větší
   porce zpět k obvyklé; nikdy „sněz víc“.
4. **Každý výpočet, rada, práh i text nese položku schvalovacího registru** se štítkem „✓“. V maketě je vše
   schválené předem; lékař-garant může kdykoli schválit / upravit / zamítnout s komentářem, rozhodnutí platí
   okamžitě a historie jen přibývá.
5. **Lékař mezi kontrolami nic nedělá.** Nemoc ukončuje pacient, výpadek dat končí sám.
6. **Nic se neodesílá, žádná generativní AI ve výpočtech.** Stopa s vstupy a výstupy je exportovatelná.
7. **V ordinaci se nepíše** — výběr, zaškrtnutí, volič.
8. **Pacient vidí výsledek, dostane poděkování a vidí cíl.** Po příchodu dat karta „Jak to dopadlo“, poděkování za čin
   (ne za hodnotu glukózy), jednorázové milníky za snahu, karta „Cesta ke kontrole“ (dní do kontroly, známá jídla X z N),
   týdenní shrnutí. Nic z toho nejde do reportu lékaře.

## Průchod ukázkou

Tlačítko **Další ▶** (nebo šipka vpravo) odehraje jeden krok za lékaře, sestru nebo pacienta a panel
vyprávění řekne, co se děje, čeho si všimnout, proč a co z toho plyne. **Panel prezentujícího** nabízí
kapitoly a odbočky (zaučení se nezdařilo · po píchnutí: větší / menší porce / nevím · jak pacient s radami
naložil). Lékař a sestra jsou na desktopu, pacient v rámečku telefonu.

| Dějství | Co ukazuje |
|---|---|
| 1 V ordinaci | Karta, čtyři podmínky, dávky voličem, startovní sada návyků, osobní pokyny; sestra zaučí s náhledem telefonu |
| 2 Doma | Tři kroky před jídlem (inzulin první); po týdnu známá jídla s rozmezím na stupnici a „X z N v cíli“ |
| 3 Rada | Před píchnutím porce zpět k obvyklé; po píchnutí jen z větší; vlastní jídlo třemi klepnutími |
| 4 Nemoc | Pacient označí nemoc, aplikace pomáhá jinak (jen bezpečné rady, pokyny lékaře), ukončí ji pacient |
| 5 Registr | Lékař-garant upraví text rady s komentářem; platí okamžitě, historie zůstává |
| 6 Kontrola | Pacient: report před kontrolou. Lékař: souhrn → návrhy jeden po druhém → potvrzení → předání. Stopa |

## Kód

```
app/    jádro — doména, obrazovky, morph-vykreslení. Vanilla JS, bez závislostí, běží z file://
demo/   prezentační vrstva — registr a katalogy, ~200 jídel, simulovaný senzor, příběh, vyprávění
```

Vynecháním složky `demo/` a jejích `<script>` řádků vznikne produkční sestavení bez přepisování
obrazovek: jádro startuje prázdné a bez schválené položky registru nic nevyhodnocuje ani neradí.
Po změně struktury zvyš `NF.SCHEMA` v `app/core.js` i `?v=` v HTML (test to hlídá).

## Co je simulované

Senzor (deterministický model průběhu po jídle), seznam jídel (syntetický; skutečný zdroj a licenci
vybere studie), souhrn ze senzoru, schválení registru, posun času. Prahy návrhů k dávce jsou návrh
autora makety odvozený z běžných konsenzuálních cílů; ve studii je určí garant-lékař.
