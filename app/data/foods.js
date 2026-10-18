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
    var veg = /zelenin|salát|rajč|okurk|špenát|brokol|květák|kapust|zelí|paprik|mrkv|lečo|ratatouille|houb|fazolk/i.test(name) || /zelenin/i.test((extra && extra.first) || '');
    var plate = source === 'tekute' ? 'polevka' : protein && veg ? 'priloha_maso_zelenina' : protein ? 'priloha_maso' : veg ? (side === 'bez' ? 'zelenina' : 'priloha_maso_zelenina') : 'priloha';
    if (veg && !protein && side !== 'bez') plate = 'priloha'; /* příloha se zeleninou bez bílkoviny: zelenina je navíc, hlavní je příloha */
    return { source: source, prep: prepN, plate: plate, veg: veg };
  }
  function add(names, side, prep, size, meal, extra) {
    names.split('|').forEach(function (name) {
      n++; var f = { id: 'F' + n, name: name.trim(), tags: tagsFor(name.trim(), side, prep, extra), meal: meal };
      if (extra) Object.keys(extra).forEach(function (k) { f[k] = extra[k]; });
      out.push(f);
    });
  }
  /* snídaně */
  add('Ovesná kaše s mlékem a banánem|Ovesná kaše s jablkem|Rýžová kaše se skořicí|Jáhlová kaše s ovocem|Krupicová kaše', 'bez', 'varene', 'bezne', 'breakfast', { addon: 'bílý jogurt nebo hrst ořechů', first: 'jogurt', react: 5.4 });
  add('Chléb se sýrem a zeleninou|Chléb s máslem a šunkou|Chléb s tvarohovou pomazánkou|Rohlík se sýrem|Celozrnný chléb s vajíčkem', 'pecivo', 'studene', 'bezne', 'breakfast', { addon: 'plátek sýra nebo vejce navíc', first: 'zeleninu a sýr', react: 2.5 });
  add('Müsli s jogurtem a medem|Cereálie s mlékem|Granola s jogurtem', 'bez', 'studene', 'bezne', 'breakfast', { addon: 'hrst ořechů', first: 'jogurt', react: 5.1 });
  add('Míchaná vejce se zeleninou|Omeleta se šunkou|Vejce natvrdo s chlebem|Šunka s vejci (hemenex)', 'bez', 'varene', 'bezne', 'breakfast', { addon: '', first: 'zeleninu', react: 1.1 });
  add('Koblihy|Croissant s džemem|Loupák s máslem|Buchty s povidly|Vánočka s máslem|Makovec|Bábovka|Palačinky s džemem|Lívance s marmeládou', 'pecivo', 'varene', 'bezne', 'breakfast', { addon: 'tvaroh nebo bílý jogurt', first: 'tvaroh', react: 5.8 });
  add('Jogurt s ovocem|Tvaroh s ovocem|Skyr s ořechy|Cottage s rajčaty', 'bez', 'studene', 'male', 'breakfast', { addon: 'hrst ořechů', first: 'ořechy', react: 1.8 });
  /* obědy, večeře — česká klasika */
  add('Smažený řízek s bramborovou kaší|Smažený řízek s bramborovým salátem|Smažený sýr s hranolkami|Smažené rybí filé s bramborem|Smažené žampiony s bramborem|Smažený květák s bramborem|Kuřecí řízek s bramborem|Smažené kuřecí nugety s hranolkami', 'brambory', 'smazene', 'bezne', 'lunch', { addon: 'salát z čerstvé zeleniny', first: 'salát nebo maso', react: 5.2 });
  add('Svíčková na smetaně s knedlíkem|Hovězí guláš s knedlíkem|Vepřo knedlo zelo|Rajská omáčka s knedlíkem|Koprová omáčka s knedlíkem|Znojemská pečeně s knedlíkem|Segedínský guláš s knedlíkem|Kuře na paprice s knedlíkem|Ovocné knedlíky s tvarohem|Bramborové knedlíky se zelím a uzeným', 'knedlik', 'varene', 'bezne', 'lunch', { addon: 'maso nebo zeleninu navíc', first: 'maso', react: 6.0 });
  add('Kuřecí maso na kari s rýží|Rizoto se zeleninou a kuřecím|Kuřecí čína s rýží|Vepřové nudličky s rýží|Losos s rýží a zeleninou|Rýže s fazolemi|Plněné papriky s rýží|Zapečená rýže se zeleninou', 'ryze', 'varene', 'bezne', 'lunch', { addon: 'zeleninu nebo maso navíc', first: 'maso a zeleninu', react: 4.4 });
  add('Špagety boloňské|Špagety carbonara|Těstoviny s kuřecím a smetanovou omáčkou|Těstovinový salát|Lasagne|Zapečené těstoviny se sýrem|Penne s rajčatovou omáčkou|Gnocchi se špenátem', 'testoviny', 'varene', 'bezne', 'lunch', { addon: 'kuřecí maso nebo sýr navíc', first: 'maso nebo sýr', react: 4.8 });
  add('Pečené kuře s bramborem|Vepřová pečeně s bramborem|Sekaná s bramborovou kaší|Kuřecí stehno s bramborem|Bramborák|Bramboráky s kysaným zelím|Zapečené brambory se zeleninou|Brambory na loupačku s tvarohem|Šunkafleky|Halušky se zelím', 'brambory', 'varene', 'bezne', 'lunch', { addon: 'zeleninový salát', first: 'maso a zeleninu', react: 4.0 });
  add('Bramboračka|Kulajda|Gulášová polévka|Čočková polévka|Hrachová polévka|Zelňačka|Dršťková polévka|Kuřecí vývar s nudlemi|Rajská polévka s rýží|Fazolová polévka|Květáková polévka|Hovězí vývar s knedlíčky', 'bez', 'varene', 'male', 'lunch', { addon: 'plátek sýra nebo šunky navíc', first: 'zavářku', react: 2.6 });
  add('Čočka na kyselo s vejcem|Čočka s uzeným|Fazole na kyselo|Hrachová kaše s cibulkou|Zapečený květák se sýrem|Zeleninové lečo s vejci|Špenát s vejcem a bramborem', 'bez', 'varene', 'bezne', 'lunch', { addon: 'vejce navíc', first: 'vejce', react: 3.2 });
  add('Grilovaný losos se zeleninou|Kuřecí prsa se zeleninou|Krůtí steak se salátem|Hovězí steak se zeleninou|Pečená treska se zeleninou|Tofu se zeleninou', 'bez', 'varene', 'bezne', 'dinner', { addon: '', first: 'zeleninu', react: 1.4 });
  add('Zeleninový salát s kuřecím|Salát s tuňákem|Řecký salát|Caesar salát|Salát s kozím sýrem|Šopský salát', 'bez', 'studene', 'bezne', 'dinner', { addon: 'vejce nebo sýr', first: 'zeleninu', react: 1.6 });
  /* hotovky a rychlé jídlo */
  add('Pizza Margherita|Pizza šunková|Pizza salámová|Pizza Quattro formaggi', 'pecivo', 'varene', 'velke', 'dinner', { addon: 'salát před pizzou', first: 'salát', react: 5.9 });
  add('Kebab v pitě|Gyros v pitě|Burger s hranolkami|Cheeseburger|Hot dog|Párek v rohlíku|Langoš se sýrem|Smažený sýr v housce|Bageta se šunkou a sýrem|Bageta s kuřecím|Sendvič s tuňákem|Tortilla s kuřecím', 'pecivo', 'smazene', 'velke', 'dinner', { addon: 'zeleninu navíc', first: 'maso a zeleninu', react: 6.2 });
  add('Sushi set|Pad thai|Kuře kung pao s rýží|Smažené nudle se zeleninou|Kuřecí s bambusem a rýží|Bún bò Nam Bộ|Pho bo|Kari s rýží', 'ryze', 'varene', 'bezne', 'dinner', { addon: 'maso nebo zeleninu navíc', first: 'maso a zeleninu', react: 4.9 });
  add('Lasagne z chlazeného pultu|Hotové rizoto z krabičky|Instantní nudlová polévka|Mražená pizza|Hotová svíčková v sáčku|Hotový guláš v konzervě|Kuřecí nugety mražené|Bramborové krokety mražené|Zapečené těstoviny hotové|Segedín hotový', 'testoviny', 'varene', 'bezne', 'dinner', { addon: 'salát nebo vejce', first: 'zeleninu', react: 5.4 });
  add('Chlebíčky s vlašským salátem|Obložené chlebíčky|Utopenec s chlebem|Nakládaný hermelín s chlebem|Tlačenka s cibulí a chlebem|Sekaná s chlebem a hořčicí|Párky s chlebem a hořčicí|Klobása s chlebem|Bramborový salát', 'pecivo', 'studene', 'bezne', 'dinner', { addon: 'zeleninu', first: 'maso', react: 4.2 });
  /* svačiny */
  add('Jablko|Banán|Hroznové víno|Hruška|Mandarinky|Ovocný salát', 'bez', 'studene', 'male', 'snack', { addon: 'hrst ořechů', first: 'ořechy', react: 2.9 });
  add('Sušenky|Čokoládová tyčinka|Oplatky|Perník|Zákusek|Dort|Zmrzlina|Chipsy|Slané tyčinky|Popcorn', 'pecivo', 'studene', 'male', 'snack', { addon: 'bílý jogurt k tomu', first: 'jogurt', react: 5.5 });
  add('Ořechy|Sýr|Vařené vejce|Hummus se zeleninou|Zeleninové tyčinky', 'bez', 'studene', 'male', 'snack', { addon: '', first: 'zeleninu', react: 0.9 });
  add('Knedlíky s vejci|Houskový knedlík s vajíčkem', 'knedlik', 'varene', 'bezne', 'dinner', { addon: 'vejce navíc', first: 'vejce', react: 5.6 });
  return out;
};
})(typeof window !== 'undefined' ? window : globalThis);
