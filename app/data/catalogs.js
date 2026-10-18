/* Katalogy návyků a osobních pokynů lékaře — součást jádra (přesun z demo/ 18. 10. 2026).
   Návyky: položka registru R-NAVYKY / R-PROCHAZKA; pokyny: R-POKYNY. Věty jsou návrh autora makety, lékař do nich dosazuje hodnotu voličem.
   Pokyn pro nemoc je od 18. 10. 2026 rozdělený: bazál se při nemoci píchá dál, inzulin k jídlu jen když pacient jí. */
(function (global) {
'use strict';
var NF = global.NutriFee; NF.data = NF.data || {};
NF.data.habits = [
  { id: 'H-ZAPIS', item: 'R-NAVYKY', default: true, title: 'Zapisovat hlavní jídla', short: 'Zapsat hlavní jídla', why: 'Z každého zápisu se aplikace učí, jak vaše tělo reaguje. Po třech zápisech stejného jídla umí poradit.', training: [{ id: 't-zapis', text: 'Pacient sám prošel tři kroky „Chystám se jíst“ a zapsal zkušební jídlo', page: 'meal', preview: { step: 3, bolus: 'before', portion: 'usual' } }] },
  { id: 'H-PORCE', item: 'R-NAVYKY', default: true, title: 'Držet obvyklou porci ke každé dávce', short: 'Obvyklá porce', why: 'Dávka inzulinu je nastavená na obvyklé množství. Když ho držíte, dávka sedí a rady jsou přesnější.', training: [{ id: 't-porce', text: 'Pacient ví, že rada k porci přijde jen před píchnutím a proč', page: 'meal', preview: { step: 3, bolus: 'before', portion: 'bigger' } }] },
  { id: 'H-INZULIN', item: 'R-NAVYKY', default: true, title: 'Potvrzovat inzulin k jídlu', short: 'Potvrdit inzulin', why: 'Bez potvrzení nevíme, jestli glukóza reaguje na jídlo, nebo na chybějící inzulin. Lékař pak nemůže posoudit dávku.', training: [{ id: 't-inzulin', text: 'Pacient ví, že se ho aplikace před každým jídlem zeptá, jestli si už píchl a kolik', page: 'meal', preview: { step: 1 } }] },
  { id: 'H-BAZAL', item: 'R-NAVYKY', default: true, title: 'Dávat inzulin na noc (bazál) každý večer ve stejný čas', short: 'Bazál večer', why: 'Ranní glukóza je zrcadlo bazálu. Stejný čas podání umožní lékaři bazál posoudit.', training: [{ id: 't-bazal', text: 'Pacient našel večerní připomínku bazálu a ví, jak ji potvrdit', page: 'today' }] },
  { id: 'H-CAS', item: 'R-NAVYKY', default: false, title: 'Snídaně ve stejném čase', short: 'Snídaně 7–8 h', why: 'Pravidelný čas snídaně dělá ranní hodnoty srovnatelné.', training: [] },
  { id: 'H-PROCHAZKA', item: 'R-PROCHAZKA', default: false, title: 'Procházka po večeři', short: 'Procházka po večeři', why: 'Krátký pohyb po jídle zmírní vzestup glukózy bez změny jídla.', training: [{ id: 't-prochazka', text: 'Pacient ví, kdy je pohyb po píchnutí v pořádku (podle pokynů lékaře)', page: 'safety' }] }
];
NF.data.instructions = [
  { id: 'I-NEVIM', title: 'Nevím, jestli byl inzulin píchnutý', text: 'Když nevíte, jestli jste si inzulin už píchli, znovu ho nepíchejte. Změřte glukózu za {v} a řiďte se pokynem pro vysokou, nebo nízkou glukózu.', value: 60, unit: 'min', step: 15, default: true },
  { id: 'I-HYPO', title: 'Nízká glukóza', text: 'Když glukóza klesne pod {v}, snězte 15 g rychlých sacharidů (asi 1,5 dl džusu) a změřte za 15 minut.', value: 3.9, unit: 'mmol/l', step: 0.1, default: true },
  { id: 'I-MENE', title: 'Méně jídla než obvykle', text: 'Když sníte méně, než na kolik máte inzulin, změřte glukózu za {v} a při poklesu postupujte jako u nízké glukózy. Je to pokyn lékaře, ne rada aplikace.', value: 60, unit: 'min', step: 15, default: true },
  { id: 'I-NEMOC-BAZAL', title: 'Nemoc: inzulin na noc (bazál)', text: 'Bazál si píchejte dál ve stejný čas, i když nejíte. Pijte a měřte glukózu každé {v}.', value: 3, unit: 'h', step: 1, default: true },
  { id: 'I-NEMOC-JIDLO', title: 'Nemoc: inzulin k jídlu', text: 'Když jídlo vynecháte, inzulin k němu nepíchejte. Když jíte, píchněte podle plánu. Při zvracení nebo glukóze nad {v} déle než 3 hodiny volejte ordinaci.', value: 15, unit: 'mmol/l', step: 0.5, default: true },
  { id: 'I-VYSOKA', title: 'Vysoká glukóza', text: 'Když je glukóza nad {v} déle než 3 hodiny, volejte ordinaci.', value: 15, unit: 'mmol/l', step: 0.5, default: false },
  { id: 'I-KONTAKT', title: 'Kdy a kam volat', text: 'V ordinačních hodinách ordinace, jinak pohotovost. Při bezvědomí, křečích nebo dušnosti záchranná služba.', value: true, default: true }
];
})(typeof window !== 'undefined' ? window : globalThis);
