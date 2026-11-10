# Příloha: designový systém

*Patří k [`01-cesta-k-demu.md`](01-cesta-k-demu.md) a [`00-postup.md`](00-postup.md) etapa 4. Stav makety SCHEMA 89 (9. 11. 2026); tabulky jsou vygenerované znovu nad SCHEMA 89 a vyšly beze změny. Tabulky v oddílech 2–6 jsou vygenerované skriptem přímo z `app/tokens.css`, `app/design.css` a `design-system/index.html`. Skript patří k podkladům předávky u vlastníka, v repozitáři není. Když se maketa změní, požádejte o nové vygenerování; ručně tabulky nepřepisujte.*

## 1. Co se přenáší a jak

- **`app/tokens.css` se přenáší beze změny.** Je to jediný zdroj hodnot vzhledu: barvy, písmo, odstupy, zaoblení, stíny, pohyb a rozměry komponent. Každý token začíná `--nf-`.
- **`app/design.css` tokeny jen skládá do komponent.** Nemá pevné barvy, velikosti písma ani rozměry; hlídá to `tokeny.test.cjs`. Nová komponenta v demu se řídí stejným pravidlem.
- **Písmo** je jedno, vlastní hostované, s licencí OFL v `app/fonts/` (deklarace `@font-face` jsou na začátku `tokens.css`). **Ikony** jsou obrysové SVG 24 × 24 v `app/icons.js`; licence sady ikon je v kořeni repozitáře makety.
- **Zásady vzhledu** (z katalogu, oddíl „Zásady“): jedna akční barva, stav nikdy jen barvou (vždy slovo a ikona), cíl dotyku aspoň 48 px u pacienta a 40 px v ordinaci, text pacienta od 17 px, kontrast textu aspoň 4,5 : 1, jedno primární tlačítko na obrazovce, obrys = dá se zmáčknout, plná výplň = vybráno, pohyb jen vysvětlující a s ohledem na `prefers-reduced-motion`.
- **Vysoký kontrast:** při `prefers-contrast: more` přepne `design.css` tři tokeny `--nf-hc-*` místo běžných.
- **Mapování starších názvů** (`--ink`, `--brand`, `--ok` …) na konci `tokens.css` je jen pro starší pravidla `design.css`. Nová komponenta používá jen `--nf-*`.

## 2. Kategorie tokenů
<!-- vygenerováno skriptem z app/tokens.css, app/design.css a design-system/index.html; needitovat ručně -->

Tokenů `--nf-*` celkem: **295**.

| Kategorie | Počet | Hlavní hodnoty |
|---|---|---|
| Barvy – plocha | 8 | `bg` #F2F8F9 · `bg-2` #E3F1F3 · `surface` #FFFFFF · `surface-2` #F4F9FA · `card-edge` rgba(11,28,43,.05) · `line` #E4EEF0 · … |
| Barvy – text | 4 | `ink` #0B1C2B · `text` #26394A · `muted` #536677 · `on-primary` #FFFFFF |
| Barvy – akce | 4 | `primary` #0F6F8C · `primary-strong` #0A5A72 · `primary-soft` #DCF1F4 · `primary-tint` #EEF7F9 |
| Barvy – stavy glukózy a bezpečí | 20 | `ok` #268F61 · `ok-bg` #DFF4EA · `ok-text` #1E7A52 · `over` #D2632B · `over-bg` #FDEBE2 · `over-text` #94520F · … |
| Písmo | 30 | `font-display` písmo z app/fonts/ + systémové náhradní · `font-text` písmo z app/fonts/ + systémové náhradní · `fs-2xs` .8125rem · `fs-xs` .875rem · `fs-sm` .9375rem · `fs-md` 1.0625rem · … |
| Písmo – popisky ilustrací (SVG) | 8 | `fs-fig-xs` 10px · `fs-fig-sm` 11px · `fs-fig` 12px · `fs-fig-lg` 13px · `fs-fig-xl` 16px · `fs-fig-2xl` 28px · … |
| Odstupy | 8 | `s05` 2px · `s1` 4px · `s2` 8px · `s3` 12px · `s4` 16px · `s5` 20px · … |
| Zaoblení | 7 | `r-2xs` 2px · `r-xs` 6px · `r-win` 8px · `r-sm` 10px · `r-md` 16px · `r-lg` 20px · … |
| Cíle dotyku | 5 | `tap` 48px · `tap-desk` 40px · `tap-lg` 56px · `tap-sm` 44px · `tap-xl` 64px |
| Ikony | 16 | `icon-5xs` 10px · `icon-4xs` 13px · `icon-3xs` 14px · `icon-2xs` 16px · `icon-xs` 18px · `icon-sm` 20px · … |
| Rozměry – ostatní (dávka, tkanina, šířky) | 14 | `dose-h` 44px · `dose-h-sm` 32px · `dose-border` 2px · `dose-border-sm` 1.5px · `weave-dot` 6px · `weave-row` 16px · … |
| Čáry a fokus | 8 | `bw` 2px · `bw-lg` 2.5px · `bw-xl` 3px · `halo` 4px · `focus-w` 3px · `focus-offset` 3px · … |
| Rozměry komponent | 90 | `rail-w` 224px · `desk-max` 1460px · `desk-col` 880px · `desk-end` 120px · … |
| Stíny a ztmavení | 9 | `sh-card` 0 1px 2px rgba(11,28,43,.04),0 4px 14px  · `sh-raised` 0 14px 36px rgba(11,28,43,.10) · `sh-primary` 0 1px 2px rgba(10,90,114,.24) · `sh-inset` inset 0 0 0 1px var(--nf-line) · `sh-knob` 0 2px 6px var(--nf-shadow-ink) · `sh-marker` 0 2px 8px var(--nf-shadow-ink) · … |
| Grafické prvky (fajfka) | 2 | `check-white` url("data:image/svg+xml,%3Csvg xmlns='ht · `check-ink` url("data:image/svg+xml,%3Csvg xmlns='ht |
| Pohyb | 29 | `t-success` .6s · `t-dose` .22s · `t-fast` .15s · `t` .25s · `t-slow` .4s · `t-fade` .2s · … |
| Vysoký kontrast | 3 | `hc-muted` #3D474F · `hc-line` #56636C · `hc-control` #26303A |
| Prezentační vrstva (nepřenáší se) | 30 | `demo-strong` #54467A · `demo-line` #CFC6E3 · `demo-surface` #F8F6FC · `demo-focus` #7B4FC4 · `demo-glow` rgba(123,79,196,.30) · `demo-shadow` 0 18px 50px rgba(43,24,74,.20) · … |

## 3. Typografická stupnice

| Token | Hodnota | Při výchozím písmu 16 px |
|---|---|---|
| `--nf-fs-2xs` | `.8125rem` | 13 px |
| `--nf-fs-xs` | `.875rem` | 14 px |
| `--nf-fs-sm` | `.9375rem` | 15 px |
| `--nf-fs-md` | `1.0625rem` | 17 px |
| `--nf-fs-lg` | `1.1875rem` | 19 px |
| `--nf-fs-xl` | `1.5rem` | 24 px |
| `--nf-fs-2xl` | `1.875rem` | 30 px |
| `--nf-fs-num` | `2.75rem` | 44 px |
| `--nf-fs-num-sm` | `2rem` | 32 px |
| `--nf-fs-hero` | `1.625rem` | 26 px |
| `--nf-fs-desk` | `.9375rem` | 15 px |
| `--nf-fs-h1-desk` | `clamp(1.5rem,3vw,1.875rem)` | clamp(1.5rem,3vw,1.875rem) |

| Token | Hodnota |
|---|---|
| `--nf-lh` | `1.45` |
| `--nf-lh-tight` | `1.15` |
| `--nf-w-text` | `500` |
| `--nf-w-semi` | `600` |
| `--nf-w-strong` | `700` |
| `--nf-w-display` | `700` |
| `--nf-w-display-strong` | `800` |
| `--nf-track-tight` | `-0.02em` |
| `--nf-track-caps` | `0.06em` |
| `--nf-track-snug` | `-0.01em` |
| `--nf-track-num` | `-0.03em` |
| `--nf-track-tag` | `0.02em` |
| `--nf-track-label` | `0.04em` |

## 4. Odstupy, zaoblení a cíle dotyku

| Token | Hodnota |
|---|---|
| `--nf-s05` | `2px` |
| `--nf-s1` | `4px` |
| `--nf-s2` | `8px` |
| `--nf-s3` | `12px` |
| `--nf-s4` | `16px` |
| `--nf-s5` | `20px` |
| `--nf-s6` | `24px` |
| `--nf-s8` | `32px` |
| `--nf-r-2xs` | `2px` |
| `--nf-r-xs` | `6px` |
| `--nf-r-win` | `8px` |
| `--nf-r-sm` | `10px` |
| `--nf-r-md` | `16px` |
| `--nf-r-lg` | `20px` |
| `--nf-r-pill` | `999px` |
| `--nf-tap` | `48px` |
| `--nf-tap-desk` | `40px` |
| `--nf-tap-lg` | `56px` |
| `--nf-tap-sm` | `44px` |
| `--nf-tap-xl` | `64px` |

## 5. Barevné role a kontrasty

Kontrast spočítaný podle WCAG 2.1 z hodnot v `tokens.css`.

| Role | Barva | Popředí | Pozadí | Kontrast | Použití |
|---|---|---|---|---|---|
| Akce (jen tlačítka a aktivní prvky) | petrolejová | `--nf-on-primary` #FFFFFF | `--nf-primary` #0F6F8C | 5,7 : 1 | bílý text na tlačítku |
|  |  | `--nf-primary-strong` #0A5A72 | `--nf-surface` #FFFFFF | 7,7 : 1 | text akcentu na kartě |
|  |  | `--nf-primary` #0F6F8C | `--nf-surface` #FFFFFF | 5,7 : 1 | výplň tlačítka proti kartě |
| V cíli, hotovo, splněno | zelená | `--nf-ok-text` #1E7A52 | `--nf-surface` #FFFFFF | 5,3 : 1 | text na kartě |
|  |  | `--nf-ok-text` #1E7A52 | `--nf-ok-bg` #DFF4EA | 4,6 : 1 | text na tintu štítku |
|  |  | `--nf-ok` #268F61 | `--nf-surface` #FFFFFF | 4,1 : 1 | grafický prvek na kartě |
|  |  | `--nf-ok` #268F61 | `--nf-bg` #F2F8F9 | 3,8 : 1 | grafický prvek na podkladu |
| Nad cílem, upozornění (není chyba) | oranžová | `--nf-over-text` #94520F | `--nf-surface` #FFFFFF | 6,0 : 1 | text na kartě |
|  |  | `--nf-over-text` #94520F | `--nf-over-bg` #FDEBE2 | 5,2 : 1 | text na tintu štítku |
|  |  | `--nf-over` #D2632B | `--nf-surface` #FFFFFF | 3,8 : 1 | výplň, okraj, pruh |
| Chyby, pokles pod 4, mimo rozsah, zamítnuto | červená | `--nf-low-text` #A93226 | `--nf-surface` #FFFFFF | 6,6 : 1 | text na kartě |
|  |  | `--nf-low-text` #A93226 | `--nf-low-bg` #FCE8E6 | 5,6 : 1 | text na tintu štítku |
|  |  | `--nf-on-primary` #FFFFFF | `--nf-low` #D9453D | 4,3 : 1 | bílá ikona na výplni |
| Informace (podobné jídlo, poznámka lékaře) | modrá | `--nf-info-text` #2B4D69 | `--nf-surface` #FFFFFF | 8,9 : 1 | text na kartě |
|  |  | `--nf-info-text` #2B4D69 | `--nf-info-bg` #E5EEF5 | 7,5 : 1 | text na tintu |
| Běžný a vedlejší text | inkoust | `--nf-ink` #0B1C2B | `--nf-surface` #FFFFFF | 17,3 : 1 | titulky na kartě |
|  |  | `--nf-text` #26394A | `--nf-surface` #FFFFFF | 11,9 : 1 | text na kartě |
|  |  | `--nf-muted` #536677 | `--nf-surface` #FFFFFF | 5,9 : 1 | vedlejší text na kartě |
|  |  | `--nf-muted` #536677 | `--nf-bg` #F2F8F9 | 5,5 : 1 | vedlejší text na podkladu |
|  |  | `--nf-border-control` #6F8B98 | `--nf-surface` #FFFFFF | 3,6 : 1 | obrys ovládacího prvku |
|  |  | `--nf-border-control` #6F8B98 | `--nf-bg` #F2F8F9 | 3,4 : 1 | obrys na podkladu |
| Štítek DEMO (jen maketa) | fialová | `--nf-demo` #6B5B95 | `--nf-demo-bg` #EFEBF7 | 5,0 : 1 | text štítku |

## 6. Komponenty v katalogu

Katalog má 25 karet komponent aplikace a 5 karet prezentační vrstvy.

| Kotva | Komponenta | Co to je (první věta z katalogu) | Varianty v ukázce (třídy) | Stavy v ukázce |
|---|---|---|---|---|
| `#c-tlacitka` | Tlačítka | Jedno primární na obrazovce. | `.primary` `.quiet` `.danger` `.sm` `.big` | `disabled` |
| `#c-volby` | Volby a čipy | .choice je vybíratelná možnost (jedna z několika) s obrysem 2 px, .chosen vybraná – plná petrolejová s bílým textem. | `.chosen` `.big` | `aria-pressed` |
| `#c-posuvnik` | Posuvník hodnoty | jeden prvek pro každou volbu čísla v ordinaci i u pacienta – nahradil mřížky „pilulek“ (čas v cíli, čas pod 3,9, HbA1c, hmotnost, dávky) i čipy glukózy. .vslider: velká hodnota s jednotkou a slovem … | `.glu` `.low` `.quiet` `.sm` `.primary` | `aria-pressed` `disabled` |
| `#c-prepinace` | Přepínače | Segmentovaný přepínač je pilulka s petrolejovou aktivní položkou (filtry seznamu). | `.segmented` `.on` `.toggle` | `aria-pressed` `aria-checked` |
| `#c-stitky` | Štítky a stavy | Stav jídla, stupeň reakce a stav položky registru. | `.ok` `.over` `.bad` `.info` `.similar` `.unknown` | – |
| `#c-karty` | Karty pacienta | Jedna komponenta .card pro pacienta i ordinaci (od verze 59; dřív pět implementací). | `.warn` `.tint` `.milestone` `.sm` `.bad` `.ok` | – |
| `#c-hrdina` | Hrdina, volby a bezpečnostní pravidlo | Hrdina .card.hero: jediná zvýrazněná karta obrazovky Dnes – podbarvená, bez stínu a bez ikony, zpráva .hero-msg velkým písmem (--nf-fs-hero), primární akce přes celou šířku a vedlejší akce vedle sebe … | `.hero` `.primary` `.big` `.chosen` `.opt` `.doc` `.low` | `aria-pressed` |
| `#c-remeslo` | Rámeček ilustrací, časové hlavičky a potvrzení | Ilustrace rad .lever-fig: jeden rámeček 300 × 100 pro všechny rady – hlavní talíř r 36, druhý r 22, tah --nf-fig-stroke, výška --nf-fig-h; pořadí se čte zleva, číslo nikdy pod ručičkou, „+“ v ose … | `.flat` `.quiet` `.sm` `.just-saved` `.ok` `.primary` `.big` `.done` `.over` `.bad` `.warn` | – |
| `#c-inzulin` | Řádek inzulinu a pás dne | Připomínka dávky od lékaře (aplikace ji jen zobrazuje) a stav dne ve čtyřech slotech. | `.done` `.now` `.sm` | – |
| `#c-navyky` | Návyky a seznamy | Řádek návyku s kolečkem stavu; položky oddělené linkou, ne kartami. | – | – |
| `#c-vysledek` | Výsledek: pruh start → vrchol a stupnice | Jediné zobrazení hodnot glukózy pro pacienta: vodorovná stupnice 4–16 se dvěma plochými pásmy (zelené v cíli, oranžové nad cílem) a čárkovanou hranicí cíle. | `.result` `.over` `.bad` `.ok` | – |
| `#c-rady` | Rada před jídlem | Rada má páku, text, jistotu a odpověď, která není povinná. | `.quiet` `.sm` | – |
| `#c-kroky` | Kroky a postup | Tři kroky před jídlem jako tenký pruh, kroky kontroly v ordinaci jako číslované pilulky. | `.on` `.done` `.now` | – |
| `#c-formular` | Volič hodnot a pole | V ordinaci se nepíše: hodnoty se volí voličem. | `.ok` | – |
| `#c-mene` | Méně je víc: otázka po jedné, Co teď s „Potom“, krátké pravidlo, víc o datech | Otázka po jedné: v kroku 1 je otevřená jen jedna otázka s číslem .qnum; zodpovězená je řádek .qdone s fajfkou a „Změnit“, čekající šedé řádky .qnext pod nadpisem „Potom“. | `.hero` `.primary` `.big` `.doc` `.low` `.event` `.result` `.over` `.how` `.mini-card` | – |
| `#c-tabbar` | Lišta záložek | Čtyři záložky pacienta (Dnes · Jídla · Můj plán · Bezpečí; od verze 86 „Můj plán“), klasická lišta od kraje ke kraji přilepená ke spodnímu okraji, nad ní jemná linka a stín nahoru; spodní odsazení … | – | `aria-current` |
| `#c-ordinace` | Ordinace: dlaždice, návrhová karta, položka registru | Dlaždice souhrnu nesou barvu, znak i slovo. | `.now` `.flat` `.on` | – |
| `#c-jidlo` | Jídlo a učení | Karta jídla: neutrální talíř uvnitř prstence učení (čtyři oblouky = čtyři shodné zápisy; fajfka = známé jídlo), název, štítek úrovně (bledý, stav) a štítek reakce (zelený / oranžový). | `.food` `.ok` | `aria-expanded` |
| `#c-vyber` | Výběr jídla a porce | Řádek jídla (.food-opt, vybraný = bledě petrolejový s petrolejovým okrajem) a talíře porcí (.choice.plate): obvyklá, větší, menší. | `.chosen` `.unknown` `.food` | `aria-pressed` |
| `#c-cesta` | Číslo jako hrdina: cesta ke kontrole | Každé rozhodovací číslo je sázené velkým písmem s tlumenou jednotkou (.hero-num, 44 px; .sm 32 px). | `.path` `.sm` `.done` | – |
| `#c-podpis` | Dávka, tkanina zápisů a seznam jídel | Token dávky .dose: pilulka s ikonou klíče (key-round), číslem a „j.“ – všude, kde pacient dávku vidí (krok 1, pás dne, Plán, převzetí, nový plán, náhled u sestry). | `.done` `.sm` `.path` `.list-card` `.over` `.ok` `.weave-card` | – |
| `#c-navrh` | Ordinace: návrhová karta „posoudit dávku“ | Proč návrh vznikl jako čísla v dlaždicích, oddíly 1–3 jako nadpisy s číslem v kolečku, v postupu jen aktivní větev (ostatní sbalené), rozhodnutí v podbarveném pruhu. | `.current` `.chosen` `.sm` `.warn` `.primary` `.quiet` | `aria-pressed` `disabled` |
| `#c-davky` | Ordinace: dávky voličem | V ordinaci se nepíše. | `.sm` `.chosen` | `aria-pressed` |
| `#c-registr` | Registr: řádek položky a toast | Řádek registru na dva řádky (název · kód a kategorie), stav jedním slovníkem: ke schválení · schváleno · zamítnuto (stav „upraveno“ zrušen 27. 10. 2026); první věta poznámky garanta kurzívou pod … | `.flat` `.ok` | – |
| `#c-faze2` | Fáze 2: podnět z provozu, směr podobného jídla, řádek štítků | Podnět z provozu .card.tint.impulse je v detailu položky registru nad průvodcem: text podnětu jako citace, datum, položka a dvě akce „Vypnout položku hned“ → „Založit novou verzi ke schválení“; … | `.tint` `.impulse` `.sm` `.bad` `.primary` `.sim` `.warn` | – |

### Stavy hlavních tříd v `app/design.css`

| Třída | Stavy a varianty, které má `design.css` |
|---|---|
| `.btn` | `.big` `.danger` `.done` `.primary` `.quiet` `.sm` `:active` `:disabled` `:focus-visible` `:hover` `[aria-pressed="true"]` |
| `.choice` | `.big` `.chosen` `.quiet` `.sm` `:active` `:focus-visible` `:hover` `[aria-pressed="true"]` |
| `.chip` | `.quiet` |
| `.vslider` | `.off` `.sm` |
| `.toggle` | `.on` `[aria-checked="true"]` |
| `.tag` | `.bad` `.info` `.low` `.ok` `.over` `.similar` `.unknown` `.warn` |
| `.card` | `.flat` `.hero` `.just-saved` `.low` `.tint` `.warn` |
| `.food-opt` | `.chosen` `:focus-visible` `:hover` `[aria-pressed="true"]` |
| `.dnode` | `.done` `.missed` `.next` `.now` |
| `.prop` | `.current` `.done` |
| `.tile` | `:hover` `[aria-expanded="true"]` `[aria-expanded]` |
| `.reg-row` | `.on` `:hover` `[aria-pressed="true"]` |
| `.quiet` | `:hover` |

### Karty prezentační vrstvy (nepřenášet)

| Kotva | Karta |
|---|---|
| `#c-vrstva` | Lišta a panel „Ovládání ukázky“ s tlačítkem Dál |
| `#c-vrstva-stitek` | Štítek „ke schválení“ a rozhodnutí v kroku |
| `#c-vrstva-zvyrazneni` | Zvýraznění místa v příběhu |
| `#c-vrstva-bublina` | Bublina při klepnutí do zamčené obrazovky |
| `#c-vrstva-souhrn` | Souhrn rozhodnutí na celou šířku |

## 7. Jak otevřít katalog a inspektor

1. Otevřete `design-system/index.html` v prohlížeči. Stačí soubor z disku, nebo statický server ve složce makety. Katalog čte `app/tokens.css` a `app/design.css` přímo, takže se od makety nemůže rozejít.
2. Levý sloupec je obsah: **Zásady**, **Tokeny** (barvy, písmo, odstupy, zaoblení, stíny a pohyb, všechny ostatní tokeny), **Komponenty** (25 karet), **Prezentační vrstva**, **Obrazovky** a **Předání vývojáři**. Kotvy karet jsou v tabulce v oddílu 6 (například `index.html#c-posuvnik`).
3. Klepnutím na políčko tokenu se zkopíruje název proměnné.
4. **Inspektor** je pravý sloupec. Klepněte na kterýkoli prvek v náhledu komponenty a uvidíte jeho značku, třídy, použité tokeny a pravidla CSS. Tlačítko **Kopírovat CSS** zkopíruje pravidla, **Kopírovat jako zadání** zkopíruje popis prvku jako zadání pro AI asistenta.
5. Stavy, které katalog neukazuje ve statickém náhledu (najetí myší, fokus, stisk), vyvolejte přímo myší a klávesou Tab. Pravidla pro ně jsou v tabulce „Stavy hlavních tříd“ v oddílu 6.

## 8. Co z katalogu nepřenášet

- **Sekci „Prezentační vrstva“** (`#vrstva`, pět karet v oddílu 6): lišta a panel ukázky, štítek „ke schválení“, zvýraznění místa v příběhu, bublina a souhrn rozhodnutí garanta. Fialová barva patří jen ukázce.
- **Řádek `<link … href="../demo/demo.css…">`** v `design-system/index.html` a tokeny `--nf-demo-*` (30 tokenů v kategorii „Prezentační vrstva“). Bez `demo/demo.css` se sekce prezentační vrstvy jen nevykreslí správně; zbytek katalogu funguje.
- **Odkaz v sekci „Obrazovky“** vede na maketu, která vyžaduje přihlášení. Jak ji spustit bez přihlášení, popisuje [`01-cesta-k-demu.md`](01-cesta-k-demu.md).
- **Štítek DEMO** v hlavičce katalogu a token `--nf-demo` patří jen maketě a demu se syntetickými daty, ne ostré aplikaci.

V maketě hlídá úplnost katalogu `tokeny.test.cjs` (každý token z `tokens.css` je v katalogu, `design.css` nemá pevné hodnoty) a v hlavní sadě test „Katalog: sekce Prezentační vrstva“. Když z katalogu v repozitáři dema sekci prezentační vrstvy odstraníte, tento test tam nepouštějte; v maketě zůstává.
