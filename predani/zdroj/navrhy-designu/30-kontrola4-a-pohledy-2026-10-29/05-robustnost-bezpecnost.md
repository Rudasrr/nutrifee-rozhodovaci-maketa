# Kontrola 4 · Robustnost a bezpečnost záznamu rozhodnutí garanta (29. 10. 2026)

**Rozsah:** `maketa-rozhodovaci/demo/auth.js`, `sync.js`, `sync-config.js`, `results.js`, `presenter.js` (deník, koncepty poznámek, localStorage), `nutrifee-rozhodovaci-maketa.html` (CSP), návrh tabulky a RLS v `navrhy-designu/05-supabase-rozhodnuti-garanta.md`, `15` odst. 2.6 a 12. Maketa se neměnila.

**Metoda:** kopie makety SCHEMA 77 na `127.0.0.1:8773`, Playwright s **mockem Supabase** (REST i Auth) přes `context.route('**/*')`. Mock odpovídá jako PostgREST: PK → 409, RLS podle textu návrhu (insert jen `user_id = auth.uid()`, select vlastní / správce vše), výchozí strop `max rows = 1000`, a umí výpadek, zpoždění, ztracenou odpověď a vynucené 401/403/400/500. **Na skutečný server nešel žádný požadavek:** vše mimo 127.0.0.1 a `*.supabase.co` mock ruší a `*.supabase.co` obsluhuje sám; v logu mocku je 0 zablokovaných ani propuštěných požadavků ven. Skripty jsou v pracovní složce sezení (dočasná): `…/scratchpad/k4-sec/sim/` (`mock.cjs`, `rel.cjs`, `expire2.cjs`, `sec.cjs`, `sec2.cjs`, `misc.cjs`, `hang.cjs`); spouští se `SHOT=…/scratchpad/shot node rel.cjs`.

**Závažnost:** **A** = rozhodnutí nebo poznámka se ztratí, nebo garant či správce vidí nepravdivý stav · **B** = oprava potřebná, ale ztráta jen v okrajové situaci, nebo slabina bezpečnosti zmírněná jinou vrstvou · **C** = drobnost, hygiena.

**Počty: A 4 · B 7 · C 9.** Co funguje dobře, je na konci (oddíl „V pořádku“).

---

## Přehled scénářů (1)

| Scénář | Výsledek simulace | Nález |
|---|---|---|
| Výpadek sítě, pak obnova | fronta drží 2 záznamy; **20 s po obnově serveru nic neodešle**, odešle až událost `online` | B1 |
| Chyba 500, server se opraví | čeká, dokud garant něco dalšího nerozhodne nebo neklepne „Zkusit znovu“ | B1 |
| Pomalá síť / zaseknutý požadavek | badge pravdivě „neuloženo“; zaseknutý požadavek blokuje frontu, „Zkusit znovu“ nic nedělá | C6 |
| 401, obnova tokenu projde | znovu odesláno, uloženo | v pořádku |
| 401, obnova tokenu zamítnuta (vypršení uprostřed) | **koncept poznámky zahozen; po novém přihlášení rozhodnutí chybí v deníku a fronta se neodešle do F5** | **A1** |
| 403 jednou, pak OK | další rozhodnutí frontu uvolní | v pořádku |
| Trvale odmítnutý řádek (400/403) | **celá fronta stojí navždy**, odhlásit jde jen se zahozením všeho | B2 |
| Odpověď ztracena po zápisu (commit proběhl) | „Zkusit znovu“ → 409 → bráno jako uložené, **na serveru 1 řádek** | v pořádku |
| F5 během ukládání | po načtení znovu odesláno → 409 → uloženo, **bez duplicity** | v pořádku |
| Dvě karty, offline | **rozhodnutí z karty B se z fronty v localStorage ztratí a po zavření B nikdy neodejde** | **A2** |
| Dvě karty, online | server má vše, **deník v kartě A po F5 nemá rozhodnutí z karty B** | **A2** |
| Dvě zařízení, obě přihlášená | **zařízení A ukazuje „zamítnuto“, server a správce „schváleno“** | **A3** |
| Dva garanti | oddělené podle `user_id`; v Supabase v pořádku, ale správce třídí podle e-mailu od klienta | B5 |
| Smazaný localStorage / soukromé okno | neodeslané se ztratí bez varování (zavření karty nic nehlídá) | B1 |
| Opakované odeslání, pořadí | idempotentní (PK `client:id`, 409 = uloženo); pořadí ale podle hodin klienta | B4 |
| Hodiny klienta | stav položky i „reset“ se řadí podle `at` z prohlížeče; budoucí `at` skryje vše | B4 |
| Velký počet řádků | **při > 1000 řádcích správce i obnova vidí nejstarších 1000, nejnovější chybí** | **A4** |

Pravdivost stavu pro garanta: lišta (badge „neuloženo: N / rozhodnutí uložena ✓“) je pravdivá; **řádek pod poznámkou „Uloženo 18:05.“ a hláška „Schváleno a zapsáno do historie.“ ale znamenají jen uložení v prohlížeči** (B3).

---

## A · Ztráta nebo nepravdivý stav

### A1 · Vypršení přihlášení uprostřed práce: koncept poznámky zmizí, rozhodnutí chybí v deníku, fronta stojí

**Důkaz (`expire2.cjs`, `rel.cjs` S4):** garant má rozepsanou poznámku u jedné položky (koncept, `nutrifee-garant-drafts`), server zamítne token i jeho obnovu (400; stane se po odvolání relace, změně hesla či role nebo při detekci znovupoužití refresh tokenu). Garant klepne Schválit u K-KRITERIA.
```
POST 401 → REFRESH 400 → signOut
localStorage: nutrifee-garant-drafts = {}      ← koncept pryč
              nutrifee-garant = []              ← deník vymazán (server ho má, kromě posledního)
              nutrifee-sync-queue = [K-KRITERIA] ← fronta drží
po novém přihlášení: LOGIN, GET 2 -> 2 (obnova), žádný POST; pending 1, lastErr „HTTP 400“ (z obnovy tokenu)
po F5 +4 s: POST 201 [K-KRITERIA]; server má B-HYPO + K-KRITERIA, deník garanta jen B-HYPO
```
Výsledek: (1) **rozepsaná poznámka se ztratí** bez upozornění (`auth.js:41–44` → `D.garantClear` maže `drafts`); (2) `login()` volá `dropForeign` a `restore`, ale ne `flush`, takže fronta se odešle až po F5 nebo dalším rozhodnutí; (3) obnova proběhne **dřív**, než se fronta odešle, a po F5 se už nespustí, takže **K-KRITERIA garant vidí jako „nerozhodnuto“, i když na serveru je „schváleno“**. Garant ji rozhodne znovu, nebo si myslí, že se rozhodnutí ztratilo.

**Oprava (maketa):**
- `signOut` při vypršení (ne při ručním odhlášení) **nemazat** `drafts` ani deník; mazat je jen při ručním odhlášení nebo přihlášení jiného účtu (`uid` se liší).
- V `login()` po `write(s)` volat nejdřív `D.sync.retry()` a `restore()` spustit až po vyprázdnění fronty (nebo restore sloučit s položkami fronty: záznamy z fronty mají `sid`, deník je může převzít přímo).
- Po přihlášení vynulovat `lastErr`.

### A2 · Dvě karty téhož prohlížeče se přepisují: fronta i deník

**Příčina:** `sync.js` drží frontu v paměti a `save()` zapisuje celé pole do `nutrifee-sync-queue`; `presenter.js` stejně deník (`saveGlog`) a koncepty. Druhá karta načte stav jen při startu a událost `storage` nikdo neposlouchá. Poslední zápis vyhrává.

**Důkaz (`rel.cjs` S8, S8b):**
```
offline: karta A rozhodne K-KRITERIA, karta B C-CILE, karta A R-NAVYKY
localStorage fronta: [K-KRITERIA, R-NAVYKY]          ← C-CILE z karty B chybí
karta B zavřena, síť zpět, A „Zkusit znovu“: server [K-KRITERIA, R-NAVYKY]   ← C-CILE ztraceno natrvalo
online varianta: server [K-KRITERIA, C-CILE, R-NAVYKY], deník A po F5 [K-KRITERIA, R-NAVYKY]
```
Dvě karty jsou běžné (garant si otevře registr vedle příběhu nebo maketu omylem znovu z e-mailu).

**Oprava:** jedna z možností, od nejjednodušší:
- při každém zápisu fronty a deníku nejdřív **načíst aktuální stav z localStorage a sloučit podle id** (`id` fronty, `sid` deníku), pak uložit; přidat posluchač `window.addEventListener('storage', …)`, který sloučí změny z druhé karty a překreslí;
- nebo jedna karta = jeden zapisovatel (`BroadcastChannel` / Web Locks API) a ostatní karty ukážou „Maketa je otevřená v jiné kartě“.

### A3 · Obnova ze serveru jen po přihlášení: druhé zařízení ukazuje starý stav

**Příčina:** `D.sync.restore()` volá jen `login()`. Přihlášení drží localStorage a token se obnovuje sám, takže zařízení zůstane přihlášené dny. Po F5 nebo návratu se deník čte jen z localStorage.

**Důkaz (`rel.cjs` S9):** dvě zařízení (oddělené prohlížeče), stejný účet, obě přihlášená. A zamítne K-KRITERIA; B po F5 rozhodnutí z A **nevidí** (`false`); B pak K-KRITERIA schválí; A po F5 ukazuje **„rejected“**, server (a tedy panel správce) má poslední **„approved“**. Garant na A vidí na obrazovce „Tahle část nefunguje“ a v souhrnu zamítnutí, které už neplatí; souhrn, který potvrdí, nesouhlasí s tím, co vidí správce.

**Oprava:** volat `restore()` i při startu stránky s platným přihlášením, při `visibilitychange` na `visible` a po vyprázdnění fronty; deník brát jako mezipaměť serveru (sloučit podle `sid`, řadit podle času serveru, viz B4).

### A4 · Strop 1000 řádků: správce i obnova potichu ztratí nejnovější záznamy

**Příčina:** `results.js:17` a `sync.js:69` čtou `?order=at.asc&limit=5000` bez stránkování. Supabase má ve výchozím nastavení API **Max rows = 1000** a vyšší `limit` tiše ořízne. Řazení vzestupně znamená, že odpadnou **nejnovější** řádky. Chyba se nikde neohlásí.

**Důkaz (`rel.cjs` S10, `misc.cjs`):** jeden průchod maketou (skok na každou scénu + 28 rozhodnutí) vytvoří **88 řádků** (30 `scene`, 30 `progress`, 28 `decision`); Zpět, poznámky a změny rozhodnutí přidávají další. Panel správce čte řádky **všech** účtů (i zkoušky správce), takže strop padne zhruba po 11 průchodech celkem. V simulaci 1102 řádků garanta, poslední je „zamítnuto“: `GET 1101 -> 1000`, deník po obnově `approved` (skutečně platné je zamítnutí). Panel správce se chová stejně.

**Oprava:** stránkovat (hlavička `Range: 0-999`, pak další stránky, dokud `Content-Range` neukáže konec; nebo smyčka podle `received_at > poslední`), nebo pro panel číst **pohled s posledním stavem** (SQL níže); obnovu omezit na řádky po posledním resetu. Do té doby ověřit v Supabase (Settings → API → Max rows) a počet řádků v tabulce (jen čtení, vlastník v SQL Editoru).
```sql
-- návrh: pohled jen s platným stavem položek (řazení podle času serveru)
create view public.garant_stav with (security_invoker = true) as
select distinct on (user_id, item) user_id, item, kind, status, comment, received_at
from public.garant_rozhodnuti
where kind in ('decision','note')
order by user_id, item, received_at desc;
```

---

## B · Potřebné opravy

### B1 · Žádné automatické opakování a žádné varování při zavření

**Důkaz (`rel.cjs` S1, S2):** po výpadku i po chybě 500 zůstává fronta 20 s / 15 s po obnově serveru neodeslaná; odejde jen po události `online` (prohlížeč ji pošle jen při změně připojení počítače, ne při výpadku Supabase, DNS nebo wifi s přihlašovací stránkou), po dalším rozhodnutí nebo po klepnutí „Zkusit znovu“. `beforeunload`/`pagehide` nikdo neposlouchá. Garant, který po souhrnu na konci zavře kartu, nechá poslední rozhodnutí v localStorage; v soukromém okně nebo po smazání dat prohlížeče se **ztratí**, jinak odejdou až při příští návštěvě.

**Oprava:** opakování s rostoucí prodlevou (např. 2, 5, 15, 30, 60 s, pak každou minutu) a při `visibilitychange`; při neprázdné frontě `beforeunload` s dotazem prohlížeče a v `pagehide` pokus o odeslání s `fetch(..., { keepalive: true })`; v souhrnu ve finále věta „Čeká na odeslání N rozhodnutí – nezavírejte okno“.

### B2 · Jeden trvale odmítnutý řádek zablokuje celou frontu

**Důkaz (`rel.cjs` S3b):** řádek, který server trvale odmítne (400 neplatná hodnota, 403 RLS po změně role, 413 velikost), stojí na začátku fronty; každý další pokus pošle stejnou dávku a selže: `POST 400 ×3`, `pending 3`. Odhlásit jde jen tlačítkem „Odhlásit a zahodit neuložené“, které zahodí i platná rozhodnutí. 409 se řeší po řádcích, jiné kódy ne.

**Oprava:** při 400/403/422 poslat dávku po řádcích (jako u 409), trvale odmítnutý řádek přesunout do „neodeslatelné“ (`nutrifee-sync-dead`) s viditelným hlášením „1 rozhodnutí server odmítl (HTTP 400)“ a pokračovat; 5xx a síť opakovat (B1).

### B3 · „Uloženo“ u poznámky a „zapsáno do historie“ znamená jen prohlížeč

**Důkaz (`rel.cjs` S1):** offline, poznámka uložena: `savedLine` = **„Uloženo 18:05.“**, zároveň lišta „neuloženo: 2“. Po Schválit panel řekne „Schváleno a zapsáno do historie.“ i bez serveru. Garant čte řádek u pole, ne lištu.

**Oprava:** `savedLine` ví o frontě (`D.sync` má id záznamu = `sid`): „Uloženo 18:05“ jen když řádek se `sid` už není ve frontě, jinak „Uloženo v tomto prohlížeči · čeká na odeslání“. Totéž v hlášce po rozhodnutí.

### B4 · Pořadí a reset podle hodin klienta

**Příčina:** `at` posílá prohlížeč (`new Date().toISOString()`); podle něj řadí obnova, deník (`rt`), panel správce (`byAt`, `itemState`) i `afterReset`. Sloupec `received_at` (čas serveru) existuje, ale nečte se. Řazení je navíc řetězcové mezi formáty `…Z` (prohlížeč) a `…+00:00` (PostgREST); v praxi to vychází, ale je to náhoda.

**Důkaz (`misc.cjs` CLK, `sec.cjs`):** zařízení s hodinami o 3 h napřed zamítne v 9:00 (at 12:00), správné zařízení schválí v 10:00 → platný stav **„rejected“**. Řádek `reset` s `at` v budoucnosti (rozjeté hodiny nebo podvrh) skryje v panelu správce i při obnově **všechna** pozdější rozhodnutí: garant po přihlášení dostal deník s 0 položkami, správce u něj vidí „nerozhodnuto“.

**Oprava:** řadit podle `received_at` (server), `at` brát jen jako informaci; serverový čas vynutit spouštěčem (B5). V klientu porovnávat přes `Date.parse`, ne řetězce.

### B5 · Identita a čas v řádku pochází od klienta; panel správce třídí podle e-mailu

**Příčina:** podle `05-supabase…` (odst. 4) pravidlo vložení kontroluje jen `user_id = auth.uid()` a roli. `user_email`, `decided_by`, `at`, `client` posílá prohlížeč. `results.js:32` určuje účet řádku podle `user_email` (komentář tvrdí „plní ho server z JWT“, ale návrh žádný spouštěč nepopisuje).

**Důkaz (`sec.cjs` SEC1, SEC4):** přihlášený garant (nebo kdokoli s jeho ukradeným tokenem) pošle přímo na REST řádky se svým `user_id`, ale `user_email = garant2@…` → mock s politikou podle návrhu: **201**. Správce pak v „Výsledky garanta“ vidí **druhého garanta**, který „zamítl K-KRITERIA“. Garant tím nemůže změnit cizí řádky (žádná politika update/delete), ale může vyrobit cizí jméno v přehledu.

**Oprava (SQL jen jako návrh, spustí vlastník):**
```sql
create or replace function private.garant_rozhodnuti_stamp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.user_id     := auth.uid();
  new.user_email  := auth.jwt() ->> 'email';
  new.received_at := now();
  return new;
end $$;
create trigger garant_rozhodnuti_stamp before insert on public.garant_rozhodnuti
for each row execute function private.garant_rozhodnuti_stamp();
-- kontrolní omezení hodnot
alter table public.garant_rozhodnuti
  add constraint kind_ok   check (kind in ('decision','note','scene','progress','summary','reset')),
  add constraint status_ok check (status is null or status in ('approved','rejected')),
  add constraint comment_len check (char_length(coalesce(comment,'')) <= 4000);
```
V `results.js` seskupovat podle `user_id` a e-mail jen zobrazovat.

### B6 · Vložení HTML do panelu správce přes e-mail účtu

**Příčina:** `results.js:136` předává `a.key` (= `user_email`, jinak `user_id` nebo `decided_by`) jako **label** do `NF.screens.btn`, který label neescapuje (`app/screens.js:10`). Ostatní texty ze serveru v `results.js` (poznámky, názvy scén, `how`, `rejectedIds`, `title`) escapované jsou – ověřeno vložením do každého pole.

**Důkaz (`sec.cjs` SEC2, SEC3):** řádek s `user_email = '<a id="pwn4" href="https://example.invalid/login">Přihlaste se znovu</a><img … onerror=…>'` → v panelu správce vznikne skutečný odkaz `a#pwn4` a `img#img4`. **JavaScript se nespustil**: CSP `script-src 'self'` zablokovala inline handler (konzole: „Executing inline event handler violates … script-src 'self'“). Zbývá podvržený odkaz nebo text v panelu správce (phishing „přihlaste se znovu“). Garantova strana je v pořádku: tentýž obsah v poznámce (`</textarea>…`) se v kartě, zásuvce i registru zobrazí jako text (`sec2.cjs`).

**Oprava:** `btn(e(a.key), …)`; obecně v `demo/` nepředávat do `btn` label s daty ze serveru bez `e()`. Spolu s B5 (e-mail plní server) zmizí i zdroj.

### B7 · Nastavení projektu Supabase, které z kódu ověřit nejde (jen čtení, provede vlastník)

Klíč `sb_publishable_…` je veřejný záměrně a to je v pořádku; v kódu ani v historii publikačního repozitáře **není** service klíč (`service_role`, `sb_secret`, JWT `eyJhbGci…` – prohledán celý `git log -p`). Bezpečnost tedy stojí jen na nastavení projektu, a to je potřeba ověřit:
1. **Stará politika z odst. 1 návrhu** `"maketa smi vkladat" … to anon with check (true)` musí být smazaná (jinak kdokoli z internetu vloží řádky s libovolným `user_id`/`user_email` a správce je uvidí jako garanta).
2. Politiky čtou roli z **`app_metadata`**, ne z `user_metadata` (tu si uživatel mění sám přes `auth.updateUser`).
3. **Registrace vypnutá** (Authentication → Sign In / Providers → Allow new users to sign up). Návrh ji jen „doporučuje“. Se zapnutou registrací si kdokoli s veřejným klíčem založí účet ve sdíleném projektu; maketě to neublíží (bez role), ale druhé aplikaci vlastníka možná ano, a spouštěč `nutrifee_role_garanta` by roli garanta přidělil každému, kdo se zaregistruje s e-mailem garanta, kdyby účet garanta někdy zanikl.
4. **Projekt je sdílený s jinou aplikací vlastníka a jeho veřejný klíč je ve veřejném repozitáři.** Každá tabulka té aplikace ve schématu `public` bez RLS je čitelná a zapisovatelná pro kohokoli. Spustit Security Advisor (Database → Advisors).

```sql
-- jen čtení
select policyname, roles, cmd, qual, with_check from pg_policies where tablename = 'garant_rozhodnuti';
select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
select count(*) from public.garant_rozhodnuti;
```

---

## C · Drobnosti

- **C1 · Jméno a e-mail vlastníka v metadatech commitů veřejného repozitáře.** Soubory makety skutečná jména ani e-maily nemají (jen `@example.test` v testech), ale autor 70 commitů nese skutečné jméno a 6 commitů skutečný e-mail. Doporučení: `git config user.email` na adresu `…@users.noreply.github.com`; historii nepřepisovat bez rozhodnutí vlastníka.
- **C2 · Po vynuceném odhlášení zůstává v localStorage fronta** s e-mailem a texty poznámek a trvalé id prohlížeče `nutrifee-sync-client`. Na sdíleném počítači je přečte další uživatel. Ruční odhlášení to řeší (čeká na vyprázdnění fronty).
- **C3 · Brána přihlášení není řízení přístupu k obsahu.** Vložením `nutrifee-auth` s `role: admin` do localStorage se zobrazí celá maketa i tlačítko „Výsledky garanta“; data ale server bez platného tokenu nevydá (RLS). Obsah makety je stejně veřejný na GitHubu – jen pro úplnost.
- **C4 · Funkce spouštěče `public.nutrifee_role_garanta()`** patří do neveřejného schématu (`private`) se `security definer` a `set search_path = ''`. Přímo ji zavolat nejde (trigger), jde o hygienu.
- **C5 · `dropForeign` potichu zahodí neodeslaná rozhodnutí jiného účtu**, když se na stejném prohlížeči přihlásí někdo jiný. Chce to aspoň hlášku s počtem.
- **C6 · `fetch` bez časového limitu.** Zaseknutý požadavek (`hang.cjs`: 40 s) drží `sending = true`; „Zkusit znovu“ i událost `online` nic neudělají, dokud nedoběhne. Badge je po celou dobu pravdivý („neuloženo: 2“). Oprava: `AbortController` s limitem 15 s.
- **C7 · Clickjacking.** CSP v `<meta>` neumí `frame-ancestors` a GitHub Pages nepošle `X-Frame-Options`; přihlašovací stránku jde vložit do cizího rámu. Riziko malé (dva účty).
- **C8 · Tokeny v localStorage.** Při XSS by šly ukrást; zmírňuje to přísná CSP (`script-src 'self'`, žádné cizí skripty, `connect-src` jen na projekt). Pro maketu přijatelné.
- **C9 · Bez omezení počtu zápisů.** Přihlášený účet může tabulku zahltit řádky. U dvou účtů je to zanedbatelné; omezení velikosti `comment` viz B5.

---

## V pořádku (ověřeno simulací nebo čtením)

- **Idempotence:** id řádku `client:D-čas-náhoda`, PK v tabulce, 409 = uloženo, u dávky po řádcích. Ztracená odpověď po zápisu i F5 během ukládání dají na serveru jeden řádek (`rel.cjs` S6, S7).
- **401** → obnova tokenu → jeden opakovaný pokus; výpadek sítě při obnově tokenu neodhlásí (`auth.js:36`).
- **Odhlášení s neuloženými** se zdrží a nabídne výslovné zahození.
- **Poznámky v UI garanta** (karta, zásuvka, registr, textarea) jsou escapované; `</textarea>` z dat ze serveru pole neopustí (`sec2.cjs`).
- **CSP** `default-src 'none'; script-src 'self'; connect-src 'self' https://<projekt>.supabase.co; form-action 'none'; base-uri 'none'` – inline JavaScript zablokovaný i při vložení HTML (B6). `referrer: no-referrer`.
- **URL:** `user_id` v obnově přes `encodeURIComponent`, název tabulky jen z konfigurace; žádné čtení `location`/`hash` v `app/` ani `demo/`.
- **Žádný tajný klíč** v kódu ani historii; e-maily jen `@example.test`; hesla se do HTML nepíšou (`auth.js:88`); chybové hlášky přihlášení nerozlišují „neexistující účet“ a „špatné heslo“.
- **RLS podle návrhu:** žádná politika update/delete → tabulka je jen pro přidávání; garant cizí řádky nečte ani nemění; anon nic (pokud platí B7.1).

---

## (3) Co z toho platí pro ostrou aplikaci (doporučení, ne chyby makety)

Ostrá aplikace má stejný vzor – zápis na zařízení, fronta, server – jen s daty pacientů (zápisy jídel, inzulin, poklesy, export) a se schvalováním pravidel garantem. Ztracený nebo zdvojený zápis tam je klinické riziko, ne jen nepřesný přehled.

1. **Odchozí fronta se stálým klíčem (outbox):** každý zápis má klíč vytvořený na zařízení, server ho přijme nejvýš jednou (PK nebo `unique` + `on conflict do nothing` pod politikou, která to dovolí); opakování s rostoucí prodlevou, oddělení neodeslatelných záznamů, časový limit požadavku, odeslání při `pagehide`. V mobilní aplikaci úložiště s transakcemi (SQLite / IndexedDB), ne localStorage.
2. **Jeden zapisovatel a slučování:** více karet, zařízení a dvě role u jednoho pacienta (pacient, sestra při kontrole) – slučovat podle klíče, nikdy nepřepisovat celé pole; po návratu do aplikace a po odeslání fronty stáhnout změny ze serveru.
3. **Pravdivý stav uložení u každého záznamu:** „na zařízení · čeká“ vs. „na serveru HH:MM“; u pacienta jednoduše (ikona a slovo), v ordinaci před kontrolou výslovně „všechny zápisy pacienta do HH:MM jsou na serveru“.
4. **Dva časy:** čas události ze zařízení (jídlo, inzulin – klinicky důležitý, s časovou zónou) a čas přijetí ze serveru (pořadí, audit). Řadit a rozhodovat „poslední platné“ podle serveru; velký rozdíl hodin zařízení zapsat do stopy.
5. **Identitu, roli a čas plní server** (spouštěč, `auth.uid()`, `now()`), klient je nikdy neposílá. Role jen v `app_metadata`, ne v `user_metadata`.
6. **Schválení garanta = podpis konfigurace:** jen přidávaný záznam (bez update/delete), řetězení otisků nebo podpis verze registru, dvoufázové přihlášení (MFA) pro garanta a správce, záznam o tom, kdo co četl.
7. **Čtení bez stropu:** stránkování podle klíče (`received_at`, `id`), pohledy s platným stavem místo stahování celé historie.
8. **Samostatný projekt** pro ostrý provoz (EU, smlouva o zpracování, zálohy s obnovou k okamžiku), žádné sdílení s jinou aplikací; registrace vypnutá, účty zakládá ordinace.
9. **Testy RLS v CI** (pgTAP nebo testy přes REST se dvěma účty: cizí řádek nečte, nemění, nepodvrhne `user_id`/e-mail/čas; anon nic) a kontrola tajných klíčů v repozitáři.
10. **Hlavičky ze serveru, ne z `<meta>`:** CSP včetně `frame-ancestors 'none'`, HSTS; escapovat každý text ze serveru centrálně (i labely tlačítek).
11. **Vypršení přihlášení nesmí zahodit rozepsané:** koncept zůstane na zařízení, po novém přihlášení se nabídne; varování před vypršením.
12. **Minimum osobních údajů v datech:** v řádcích jen `user_id`, e-mail z adresáře účtů; lhůty uchování a smazání.
