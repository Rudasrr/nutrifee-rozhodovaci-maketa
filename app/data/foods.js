/* Seznam jídel — součást jádra (přesun z demo/ 18. 10. 2026). Syntetický seznam ~200 běžných českých jídel a hotovek (položka registru J-DATABAZE);
   skutečný zdroj a licence se vyberou pro studii. Hodnota `react` je modelová reaktivita pro simulovaný senzor v ukázce; produkce ji nečte. */
(function (global) {
'use strict';
var NF = global.NutriFee; NF.data = NF.data || {};
NF.data.foods = function () {
  var out = [], n = 0;
  /* Štítky R27 odvozené z původního zápisu databáze (příloha/příprava) a z názvu: zdroj sacharidů · úprava · obrázek talíře. Velikost se neeviduje. */
  function tagsFor(name, side, prep, extra) {
    var source = side;
    if (side === 'bez' && /kaše|müsli|cereál|granola|ovesn/i.test(name)) source = 'ovesne';
    else if (/polévk|vývar|guláš\s*polévk/i.test(name)) source = 'tekute';
    else if (/čočk|fazol|cizrn|hrách|quinoa/i.test(name) && side === 'bez') source = 'lusteniny';
    else if (/jablko|banán|hruška|ovoce|ovocný|pomeranč|jahod|borůvk/i.test(name) && side === 'bez') source = 'ovoce';
    else if (/dort|koláč|buchta|zákusek|zmrzlin|sušenk|čokolád|bábovk|palačink|lívanc/i.test(name) && side === 'bez') source = 'sladke';
    var prepN = prep === 'studene' ? 'varene' : prep; if (/kaše/i.test(name) && source !== 'brambory') prepN = 'kase';
    var protein = /maso|řízek|kuře|kuřec|ryb|los|treska|vejc|vajíč|sýr|šunk|tvaroh|jogurt|guláš|karban|sekan|klobás|párek|hovězí|vepř|krůt|tuň|kebab|gyros|burger|hot dog|tofu|salám|játr|kachn|hus|králí|mleté|roštěn|špíz|smažen|vajec/i.test(name);
    var veg = /zelenin|salát|rajč|okurk|špenát|brokol|květák|kapust|zelí|paprik|mrkv|lečo|ratatouille|houb|fazolk/i.test(name) || !!(extra && extra.zel);
    var plate = source === 'tekute' ? 'polevka' : protein && veg ? 'priloha_maso_zelenina' : protein ? 'priloha_maso' : veg ? (side === 'bez' ? 'zelenina' : 'priloha_maso_zelenina') : 'priloha';
    if (veg && !protein && side !== 'bez') plate = 'priloha'; /* příloha se zeleninou bez bílkoviny: zelenina je navíc, hlavní je příloha */
    return { source: source, prep: prepN, plate: plate, veg: veg };
  }
  function add(names, side, prep, size, meal, extra) {
    names.split('|').forEach(function (name) {
      n++; var f = { id: 'F' + n, name: name.trim(), tags: tagsFor(name.trim(), side, prep, extra), meal: meal };
      if (extra) Object.keys(extra).forEach(function (k) { if (k !== 'zel') f[k] = extra[k]; }); /* zel = jen pro obrázek talíře (štítky R27) */
      out.push(f);
    });
  }
  /* snídaně */
  add('Ovesná kaše s mlékem a banánem|Ovesná kaše s jablkem|Rýžová kaše se skořicí|Jáhlová kaše s ovocem|Krupicová kaše', 'bez', 'varene', 'bezne', 'breakfast', { react: 5.4 });
  add('Chléb se sýrem a zeleninou|Chléb s máslem a šunkou|Chléb s tvarohovou pomazánkou|Rohlík se sýrem|Celozrnný chléb s vajíčkem', 'pecivo', 'studene', 'bezne', 'breakfast', { react: 2.5, zel: 1 });
  /* Kontrola 2 (B7, 29. 10. 2026): „Müsli s jogurtem a medem“ → „Müsli s mlékem a medem“ (stejné místo i id): modelový pacient u müsli dostává doplněk k jídlu, který se u jídla s bílkovinou nenabízí. */
  add('Müsli s mlékem a medem|Cereálie s mlékem|Granola s jogurtem', 'bez', 'studene', 'bezne', 'breakfast', { react: 5.1 });
  add('Míchaná vejce se zeleninou|Omeleta se šunkou|Vejce natvrdo s chlebem|Šunka s vejci (hemenex)', 'bez', 'varene', 'bezne', 'breakfast', { react: 1.1, zel: 1 });
  add('Koblihy|Croissant s džemem|Loupák s máslem|Buchty s povidly|Vánočka s máslem|Makovec|Bábovka|Palačinky s džemem|Lívance s marmeládou', 'pecivo', 'varene', 'bezne', 'breakfast', { react: 5.8 });
  add('Jogurt s ovocem|Tvaroh s ovocem|Skyr s ořechy|Cottage s rajčaty', 'bez', 'studene', 'male', 'breakfast', { react: 1.8 });
  /* obědy, večeře — česká klasika */
  add('Smažený řízek s bramborovou kaší|Smažený řízek s bramborovým salátem|Smažený sýr s hranolkami|Smažené rybí filé s bramborem|Smažené žampiony s bramborem|Smažený květák s bramborem|Kuřecí řízek s bramborem|Smažené kuřecí nugety s hranolkami', 'brambory', 'smazene', 'bezne', 'lunch', { react: 5.2 });
  add('Svíčková na smetaně s knedlíkem|Hovězí guláš s knedlíkem|Vepřo knedlo zelo|Rajská omáčka s knedlíkem|Koprová omáčka s knedlíkem|Znojemská pečeně s knedlíkem|Segedínský guláš s knedlíkem|Kuře na paprice s knedlíkem|Ovocné knedlíky s tvarohem|Bramborové knedlíky se zelím a uzeným', 'knedlik', 'varene', 'bezne', 'lunch', { react: 6.0 });
  add('Kuřecí maso na kari s rýží|Rizoto se zeleninou a kuřecím|Kuřecí čína s rýží|Vepřové nudličky s rýží|Losos s rýží a zeleninou|Rýže s fazolemi|Plněné papriky s rýží|Zapečená rýže se zeleninou', 'ryze', 'varene', 'bezne', 'lunch', { react: 4.4, zel: 1 });
  add('Špagety boloňské|Špagety carbonara|Těstoviny s kuřecím a smetanovou omáčkou|Těstovinový salát|Lasagne|Zapečené těstoviny se sýrem|Penne s rajčatovou omáčkou|Gnocchi se špenátem', 'testoviny', 'varene', 'bezne', 'lunch', { react: 4.8 });
  add('Pečené kuře s bramborem|Vepřová pečeně s bramborem|Sekaná s bramborovou kaší|Kuřecí stehno s bramborem|Bramborák|Bramboráky s kysaným zelím|Zapečené brambory se zeleninou|Brambory na loupačku s tvarohem|Šunkafleky|Halušky se zelím', 'brambory', 'varene', 'bezne', 'lunch', { react: 4.0, zel: 1 });
  add('Bramboračka|Kulajda|Gulášová polévka|Čočková polévka|Hrachová polévka|Zelňačka|Dršťková polévka|Kuřecí vývar s nudlemi|Rajská polévka s rýží|Fazolová polévka|Květáková polévka|Hovězí vývar s knedlíčky', 'bez', 'varene', 'male', 'lunch', { react: 2.6 });
  add('Čočka na kyselo s vejcem|Čočka s uzeným|Fazole na kyselo|Hrachová kaše s cibulkou|Zapečený květák se sýrem|Zeleninové lečo s vejci|Špenát s vejcem a bramborem', 'bez', 'varene', 'bezne', 'lunch', { react: 3.2 });
  add('Grilovaný losos se zeleninou|Kuřecí prsa se zeleninou|Krůtí steak se salátem|Hovězí steak se zeleninou|Pečená treska se zeleninou|Tofu se zeleninou', 'bez', 'varene', 'bezne', 'dinner', { react: 1.4, zel: 1 });
  add('Zeleninový salát s kuřecím|Salát s tuňákem|Řecký salát|Caesar salát|Salát s kozím sýrem|Šopský salát', 'bez', 'studene', 'bezne', 'dinner', { react: 1.6, zel: 1 });
  /* hotovky a rychlé jídlo */
  add('Pizza Margherita|Pizza šunková|Pizza salámová|Pizza Quattro formaggi', 'pecivo', 'varene', 'velke', 'dinner', { react: 5.9 });
  add('Kebab v pitě|Gyros v pitě|Burger s hranolkami|Cheeseburger|Hot dog|Párek v rohlíku|Langoš se sýrem|Smažený sýr v housce|Bageta se šunkou a sýrem|Bageta s kuřecím|Sendvič s tuňákem|Tortilla s kuřecím', 'pecivo', 'smazene', 'velke', 'dinner', { react: 6.2, zel: 1 });
  add('Sushi set|Pad thai|Kuře kung pao s rýží|Smažené nudle se zeleninou|Kuřecí s bambusem a rýží|Bún bò Nam Bộ|Pho bo|Kari s rýží', 'ryze', 'varene', 'bezne', 'dinner', { react: 4.9, zel: 1 });
  add('Lasagne z chlazeného pultu|Hotové rizoto z krabičky|Instantní nudlová polévka|Mražená pizza|Hotová svíčková v sáčku|Hotový guláš v konzervě|Kuřecí nugety mražené|Bramborové krokety mražené|Zapečené těstoviny hotové|Segedín hotový', 'testoviny', 'varene', 'bezne', 'dinner', { react: 5.4, zel: 1 });
  add('Chlebíčky s vlašským salátem|Obložené chlebíčky|Utopenec s chlebem|Nakládaný sýr s bílou plísní s chlebem|Tlačenka s cibulí a chlebem|Sekaná s chlebem a hořčicí|Párky s chlebem a hořčicí|Klobása s chlebem|Bramborový salát', 'pecivo', 'studene', 'bezne', 'dinner', { react: 4.2 });
  /* svačiny */
  add('Jablko|Banán|Hroznové víno|Hruška|Mandarinky|Ovocný salát', 'bez', 'studene', 'male', 'snack', { react: 2.9 });
  add('Sušenky|Čokoládová tyčinka|Oplatky|Perník|Zákusek|Dort|Zmrzlina|Chipsy|Slané tyčinky|Popcorn', 'pecivo', 'studene', 'male', 'snack', { react: 5.5 });
  add('Ořechy|Sýr|Vařené vejce|Hummus se zeleninou|Zeleninové tyčinky', 'bez', 'studene', 'male', 'snack', { react: 0.9, zel: 1 });
  add('Knedlíky s vejci|Houskový knedlík s vajíčkem', 'knedlik', 'varene', 'bezne', 'dinner', { react: 5.6 });
  /* Složení pro rady (rozhodnutí vlastníka 29. 10. 2026, kontrola 3, A2): texty rad „pořadí“ a „doplněk“ se u jídel nepíšou. Každé jídlo má jen strukturované údaje
     a větu skládá šablona schválené položky R-PORADI / R-DOPLNEK (NF.orderFirst, NF.addonFor):
       slozky    – části jídla, které jde sníst napřed (klíče seznamu R-PORADI „slozky“); prázdné = pořadí se nenabízí,
       bilkovina – jídlo už bílkovinu nebo tuk má (maso, ryba, vejce, sýr, tvaroh, jogurt, smažené, majonéza): doplněk se nenabízí,
       jednolite – kaše, polévka, smíchané, zapečené nebo zabalené jídlo: není co sníst napřed (Q2, 27. 10. 2026); slozky jsou prázdné,
       doplnek  – skupina povolených doplňků z R-DOPLNEK „skupiny“ (sladke · slane · teple).
     Prošlo všech 171 jídel; zápis: 'složky|příznaky|skupina doplňku', příznak j = jednolité, b = bílkovina nebo tuk. Nastavuje se až po sestavení seznamu, aby se nezměnila id jídel.
     Kontrola 4 (30. 10. 2026): koblihy jsou smažené (b, doplněk se nenabízí, jako u bramboráku); maso nebo sýr v obalu (nugety, smažený sýr s hranolkami)
     se napřed sníst nedá – pořadí se nenabízí; nugety bez přílohy jsou jednolité. Název sýra s bílou plísní je obecný (zásada 9). */
  var C = {
    'Ovesná kaše s mlékem a banánem': '|j|sladke', 'Ovesná kaše s jablkem': '|j|sladke', 'Rýžová kaše se skořicí': '|j|sladke', 'Jáhlová kaše s ovocem': '|j|sladke', 'Krupicová kaše': '|j|sladke',
    'Chléb se sýrem a zeleninou': 'zelenina,syr|b|slane', 'Chléb s máslem a šunkou': 'sunka|b|slane', 'Chléb s tvarohovou pomazánkou': '|b|slane', 'Rohlík se sýrem': 'syr|b|slane', 'Celozrnný chléb s vajíčkem': 'vejce|b|slane',
    'Müsli s mlékem a medem': '|j|sladke', 'Cereálie s mlékem': '|j|sladke', 'Granola s jogurtem': '|jb|sladke',
    'Míchaná vejce se zeleninou': '|jb|slane', 'Omeleta se šunkou': '|jb|slane', 'Vejce natvrdo s chlebem': 'vejce|b|slane', 'Šunka s vejci (hemenex)': '|jb|slane',
    'Koblihy': '|b|sladke', 'Croissant s džemem': '||sladke', 'Loupák s máslem': '||sladke', 'Buchty s povidly': '||sladke', 'Vánočka s máslem': '||sladke', 'Makovec': '||sladke', 'Bábovka': '||sladke', 'Palačinky s džemem': '||sladke', 'Lívance s marmeládou': '||sladke',
    'Jogurt s ovocem': '|jb|sladke', 'Tvaroh s ovocem': '|jb|sladke', 'Skyr s ořechy': '|jb|sladke', 'Cottage s rajčaty': '|jb|slane',
    'Smažený řízek s bramborovou kaší': 'maso|b|teple', 'Smažený řízek s bramborovým salátem': 'maso|b|teple', 'Smažený sýr s hranolkami': '|b|teple', 'Smažené rybí filé s bramborem': 'ryba|b|teple',
    'Smažené žampiony s bramborem': '|b|teple', 'Smažený květák s bramborem': '|b|teple', 'Kuřecí řízek s bramborem': 'maso|b|teple', 'Smažené kuřecí nugety s hranolkami': '|b|teple',
    'Svíčková na smetaně s knedlíkem': 'maso|b|teple', 'Hovězí guláš s knedlíkem': 'maso|b|teple', 'Vepřo knedlo zelo': 'zelenina,maso|b|teple', 'Rajská omáčka s knedlíkem': '||teple', 'Koprová omáčka s knedlíkem': '||teple',
    'Znojemská pečeně s knedlíkem': 'maso|b|teple', 'Segedínský guláš s knedlíkem': 'zelenina,maso|b|teple', 'Kuře na paprice s knedlíkem': 'maso|b|teple', 'Ovocné knedlíky s tvarohem': '|b|sladke', 'Bramborové knedlíky se zelím a uzeným': 'zelenina,maso|b|teple',
    'Kuřecí maso na kari s rýží': 'maso|b|teple', 'Rizoto se zeleninou a kuřecím': '|jb|teple', 'Kuřecí čína s rýží': 'zelenina,maso|b|teple', 'Vepřové nudličky s rýží': 'maso|b|teple', 'Losos s rýží a zeleninou': 'zelenina,ryba|b|teple',
    'Rýže s fazolemi': '||teple', 'Plněné papriky s rýží': 'zelenina,maso|b|teple', 'Zapečená rýže se zeleninou': '|j|teple',
    'Špagety boloňské': '|jb|teple', 'Špagety carbonara': '|jb|teple', 'Těstoviny s kuřecím a smetanovou omáčkou': '|jb|teple', 'Těstovinový salát': '|j|slane', 'Lasagne': '|jb|teple', 'Zapečené těstoviny se sýrem': '|jb|teple', 'Penne s rajčatovou omáčkou': '|j|teple', 'Gnocchi se špenátem': '|j|teple',
    'Pečené kuře s bramborem': 'maso|b|teple', 'Vepřová pečeně s bramborem': 'maso|b|teple', 'Sekaná s bramborovou kaší': 'maso|b|teple', 'Kuřecí stehno s bramborem': 'maso|b|teple', 'Bramborák': '|b|teple', 'Bramboráky s kysaným zelím': 'zelenina|b|teple',
    'Zapečené brambory se zeleninou': '|j|teple', 'Brambory na loupačku s tvarohem': 'tvaroh|b|teple', 'Šunkafleky': '|jb|teple', 'Halušky se zelím': '|j|teple',
    'Bramboračka': '|j|slane', 'Kulajda': '|j|slane', 'Gulášová polévka': '|jb|slane', 'Čočková polévka': '|j|slane', 'Hrachová polévka': '|j|slane', 'Zelňačka': '|j|slane', 'Dršťková polévka': '|jb|slane', 'Kuřecí vývar s nudlemi': '|jb|slane', 'Rajská polévka s rýží': '|j|slane', 'Fazolová polévka': '|j|slane', 'Květáková polévka': '|j|slane', 'Hovězí vývar s knedlíčky': '|jb|slane',
    'Čočka na kyselo s vejcem': 'vejce|b|teple', 'Čočka s uzeným': '|jb|teple', 'Fazole na kyselo': '|j|teple', 'Hrachová kaše s cibulkou': '|j|teple', 'Zapečený květák se sýrem': '|jb|teple', 'Zeleninové lečo s vejci': '|jb|teple', 'Špenát s vejcem a bramborem': 'zelenina,vejce|b|teple',
    'Grilovaný losos se zeleninou': 'zelenina,ryba|b|teple', 'Kuřecí prsa se zeleninou': 'zelenina,maso|b|teple', 'Krůtí steak se salátem': 'zelenina,maso|b|teple', 'Hovězí steak se zeleninou': 'zelenina,maso|b|teple', 'Pečená treska se zeleninou': 'zelenina,ryba|b|teple', 'Tofu se zeleninou': 'zelenina|b|teple',
    'Zeleninový salát s kuřecím': 'zelenina,maso|b|slane', 'Salát s tuňákem': 'zelenina,ryba|b|slane', 'Řecký salát': 'zelenina,syr|b|slane', 'Caesar salát': 'zelenina|b|slane', 'Salát s kozím sýrem': 'zelenina,syr|b|slane', 'Šopský salát': 'zelenina,syr|b|slane',
    'Pizza Margherita': '|b|slane', 'Pizza šunková': '|b|slane', 'Pizza salámová': '|b|slane', 'Pizza Quattro formaggi': '|b|slane',
    'Kebab v pitě': '|jb|teple', 'Gyros v pitě': '|jb|teple', 'Burger s hranolkami': '|jb|teple', 'Cheeseburger': '|jb|teple', 'Hot dog': '|jb|teple', 'Párek v rohlíku': '|jb|teple', 'Langoš se sýrem': '|b|teple', 'Smažený sýr v housce': '|jb|teple',
    'Bageta se šunkou a sýrem': '|jb|slane', 'Bageta s kuřecím': '|jb|slane', 'Sendvič s tuňákem': '|jb|slane', 'Tortilla s kuřecím': '|jb|teple',
    'Sushi set': '|b|slane', 'Pad thai': '|jb|teple', 'Kuře kung pao s rýží': 'zelenina,maso|b|teple', 'Smažené nudle se zeleninou': '|jb|teple', 'Kuřecí s bambusem a rýží': 'zelenina,maso|b|teple', 'Bún bò Nam Bộ': '|jb|teple', 'Pho bo': '|jb|teple', 'Kari s rýží': '||teple',
    'Lasagne z chlazeného pultu': '|jb|teple', 'Hotové rizoto z krabičky': '|j|teple', 'Instantní nudlová polévka': '|j|slane', 'Mražená pizza': '|b|slane', 'Hotová svíčková v sáčku': 'maso|b|teple', 'Hotový guláš v konzervě': '|jb|teple',
    'Kuřecí nugety mražené': '|jb|teple', 'Bramborové krokety mražené': '|b|teple', 'Zapečené těstoviny hotové': '|jb|teple', 'Segedín hotový': 'zelenina,maso|b|teple',
    'Chlebíčky s vlašským salátem': '|b|slane', 'Obložené chlebíčky': '|b|slane', 'Utopenec s chlebem': 'maso|b|slane', 'Nakládaný sýr s bílou plísní s chlebem': 'syr|b|slane', 'Tlačenka s cibulí a chlebem': 'maso|b|slane', 'Sekaná s chlebem a hořčicí': 'maso|b|slane', 'Párky s chlebem a hořčicí': 'maso|b|slane', 'Klobása s chlebem': 'maso|b|slane', 'Bramborový salát': '|jb|slane',
    'Jablko': '||sladke', 'Banán': '||sladke', 'Hroznové víno': '||sladke', 'Hruška': '||sladke', 'Mandarinky': '||sladke', 'Ovocný salát': '|j|sladke',
    'Sušenky': '||sladke', 'Čokoládová tyčinka': '||sladke', 'Oplatky': '||sladke', 'Perník': '||sladke', 'Zákusek': '||sladke', 'Dort': '||sladke', 'Zmrzlina': '||sladke', 'Chipsy': '|b|slane', 'Slané tyčinky': '||slane', 'Popcorn': '||slane',
    'Ořechy': '|jb|slane', 'Sýr': '|jb|slane', 'Vařené vejce': '|jb|slane', 'Hummus se zeleninou': 'zelenina|b|slane', 'Zeleninové tyčinky': '|j|slane',
    'Knedlíky s vejci': '|jb|teple', 'Houskový knedlík s vajíčkem': '|jb|teple'
  };
  out.forEach(function (f) {
    var c = String(C[f.name] || '||').split('|');
    f.slozky = c[0] ? c[0].split(',') : []; f.bilkovina = c[1].indexOf('b') >= 0; f.jednolite = c[1].indexOf('j') >= 0; f.doplnek = c[2] || null;
  });
  return out;
};
})(typeof window !== 'undefined' ? window : globalThis);
