# Rozhodnutí vlastníka 6. 11. 2026 k rozporům z předávky

Rozpory: `predani/00-postup.md` odd. 5, `predani/10-atlas-pacient.md` „Rozpory k rozhodnutí“ (R1–R10), `predani/20-atlas-ordinace.md` odd. 7 (R1–R9).

1. **Porušení zásad z `15` opravit v maketě jako SCHEMA 87** (Doporučeno). Patří sem:
   - stopa: bezpečnostní pravidla pod 4 / nevím / menší porce; odpovědi pacienta, které jsou jen ve stavu; verze a otisk položek u událostí; podmínky zařazení a ověřovací body;
   - krok 3 při glukóze pod 4 bez hlavního tlačítka „Píchnuto … uložit“;
   - posuvník místo −/+ u čísel pacienta;
   - meze u pěti parametrů;
   - denní doby slotů jako položka registru;
   - zastaralé názvy testů a README.
2. **`15` a podklady dát do veřejného repozitáře.** Vlastník: „Jména neřeš, dej to ven do repa ať je to jednoduché.“
3. **Předávku uložit do repozitáře makety (`predani/`) až po opravách** (Doporučeno). Soukromá stránka zatím slouží jako náhled: https://claude.ai/artifact/2GjrTADpfk3oUAYFr4n5k6

Některé rozpory už rozhodnuté byly a dokumenty se jen dopíší za maketou („co maketa dělá, platí“):
- podnět z provozu: garant navrhuje, výrobce provádí (30. 10.); v ukázce vypnutí odehraje výrobce;
- sestra před lékařem na obrazovce kontroly (30. 10.);
- karta k dávce „Souhlasím“ + „Jiné rozhodnutí“ (SCHEMA 84, 4. 11.);
- 14 provozních položek;
- 171 jídel.

## Doplněno 7. 11. 2026 (po SCHEMA 87)

4. Denní doby slotů (do 10:00 / 15:30 / 21:00) zůstávají **provozní** parametry S-PRIPOMINKY; garant je neschvaluje (Doporučeno).
5. Přepínač nemoci zůstává **na Dnes i v Bezpečí** (Doporučeno).

Zbývá zapsat do `15` a do oddílů rozporů v `predani/` a opravit v příběhu ověřovací body přes `NF.setVerify`, aby stopa O30 měla `navrh.overeni`.
