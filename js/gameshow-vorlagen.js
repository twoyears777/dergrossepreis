/* Manna – Gameshow-Inhalte: Feld-Modell und fertige Vorlagen für „Der große Preis“
   Reine Inhalte, keine Logik. Neue Vorlagen nur hier eintragen.
   Wird in index.html direkt nach js/data.js geladen (teilt sich die globalen Variablen, Reihenfolge nicht ändern).
   Die Gameshows sind vorerst ausgeblendet (GAMESHOWS_AN in js/data.js), die Vorlagen bleiben trotzdem hier. */

/* ---------- Feld-Modell ---------- */
const TYPES=['frage','mc','schaetz','aufgabe','action'];
const blank=()=>({type:'frage',text:'',answer:'',options:['','','',''],correct:0,unit:''});
const F=(text,answer)=>Object.assign(blank(),{type:'frage',text,answer});
const MC=(text,options,correct)=>Object.assign(blank(),{type:'mc',text,options,correct});
const EST=(text,answer,unit)=>Object.assign(blank(),{type:'schaetz',text,answer:String(answer),unit:unit||''});

/* ---------- Vorlagen ---------- */
const TEMPLATES=[
  {id:'mix',name:'Gemischtes Quiz',title:'Der große Preis',desc:'Allgemeinwissen, Bibel, Sport, Schätzen, Natur & Tiere – mit allen Fragetypen',
   categories:()=>[
      {name:'Allgemeinwissen',items:[
        F('Wie viele Beine hat eine Spinne?','8'),
        MC('Wie heißt die Hauptstadt von Australien?',['Sydney','Canberra','Melbourne','Perth'],1),
        F('Wie viele Bundesländer hat Deutschland?','16'),
        MC('Welches chemische Element hat das Symbol „Au“?',['Silber','Aluminium','Gold','Argon'],2),
        F('In welchem Jahr fiel die Berliner Mauer?','1989')]},
      {name:'Bibel',items:[
        F('Wer baute die Arche?','Noah'),
        F('Wie viele Jünger hatte Jesus?','12'),
        F('In welcher Stadt wurde Jesus geboren?','Bethlehem'),
        F('Wie hieß der Riese, den David besiegt hat?','Goliat'),
        F('Wie viele Bücher hat die Bibel (evangelische Ausgabe)?','66')]},
      {name:'Sport',items:[
        F('Wie viele Spieler hat eine Fußballmannschaft auf dem Feld?','11'),
        F('Wie oft wurde die deutsche Männer-Nationalmannschaft Fußball-Weltmeister?','4-mal (1954, 1974, 1990, 2014)'),
        F('Wie lang ist ein Marathon?','42,195 km'),
        F('In welcher Sportart gibt es einen „Birdie“?','Golf'),
        F('In welcher deutschen Stadt fanden 1972 die Olympischen Sommerspiele statt?','München')]},
      {name:'Schätzen',items:[
        EST('Wie viele Minuten hat ein Tag?',1440,'Minuten'),
        EST('Wie hoch ist der Eiffelturm (in Metern)?',330,'m'),
        EST('Wie viele Millionen Einwohner hat Deutschland?',84,'Millionen'),
        EST('Wie viele Knochen hat ein erwachsener Mensch?',206,'Knochen'),
        EST('Wie viele Kilometer ist der Mond von der Erde entfernt?',384400,'km')]},
      {name:'Natur & Tiere',items:[
        F('Welches ist das größte Säugetier der Welt?','Blauwal'),
        F('Wie nennt man ein Känguru-Baby?','Joey'),
        F('Wie viele Herzen hat ein Oktopus?','3'),
        F('Welcher Planet ist der Sonne am nächsten?','Merkur'),
        F('Welches Tier schläft bis zu 22 Stunden am Tag?','Koala')]}
    ]},
  {id:'bibel',name:'Bibel-Quiz',title:'Der große Bibel-Preis',desc:'Altes & Neues Testament, Personen, Wunder & Gleichnisse, Bibel-Schätzfragen',
   categories:()=>[
      {name:'Altes Testament',items:[
        F('Wer baute die Arche?','Noah'),
        F('An wie vielen Tagen erschuf Gott die Welt, bevor er am siebten Tag ruhte?','6'),
        F('Wer führte das Volk Israel aus Ägypten?','Mose'),
        MC('Wie hieß die Frau von Abraham?',['Rebekka','Sara','Rahel','Lea'],1),
        MC('Wie viele Plagen kamen über Ägypten?',['7','10','12','40'],1)]},
      {name:'Neues Testament',items:[
        F('In welcher Stadt wurde Jesus geboren?','Bethlehem'),
        F('Wie viele Jünger hatte Jesus?','12'),
        MC('Wie viele Evangelien gibt es im Neuen Testament?',['3','4','5','12'],1),
        F('Welcher Jünger hat Jesus verraten?','Judas (Iskariot)'),
        F('Wie heißt das letzte Buch der Bibel?','Die Offenbarung (des Johannes)')]},
      {name:'Personen',items:[
        F('Wer besiegte den Riesen Goliat?','David'),
        MC('Wie hieß der Bruder von Mose?',['Aaron','Josua','Kaleb','Elia'],0),
        F('Wer war der erste König Israels?','Saul'),
        F('Welcher Jünger ging Jesus auf dem Wasser entgegen?','Petrus'),
        F('Wie hieß der Zöllner, der auf einen Baum kletterte, um Jesus zu sehen?','Zachäus')]},
      {name:'Wunder & Gleichnisse',items:[
        F('Was verwandelte Jesus bei der Hochzeit zu Kana?','Wasser in Wein'),
        MC('Wie viele Brote hatte Jesus bei der Speisung der Fünftausend?',['2','5','7','12'],1),
        F('Welche Tiere hütete der verlorene Sohn, als es ihm ganz schlecht ging?','Schweine'),
        F('Welchen Freund weckte Jesus nach vier Tagen im Grab wieder auf?','Lazarus'),
        F('In welchem Gleichnis hilft ein Mann einem Überfallenen, an dem andere vorbeigegangen sind?','Der barmherzige Samariter')]},
      {name:'Bibel-Schätzfragen',items:[
        EST('Wie viele Bücher hat die Bibel (evangelische Ausgabe)?',66,'Bücher'),
        EST('Wie viele Tage und Nächte regnete es bei der Sintflut?',40,'Tage'),
        EST('Wie viele Psalmen gibt es?',150,'Psalmen'),
        EST('Wie viele Männer wurden bei der Speisung mit fünf Broten und zwei Fischen satt?',5000,'Männer'),
        EST('Wie alt wurde Methusalem laut Bibel?',969,'Jahre')]}
   ]},
  {id:'weihnachten',name:'Weihnachtsquiz',title:'Der große Weihnachtspreis',desc:'Weihnachtsgeschichte, Weihnachten weltweit, Klassiker, Plätzchen & Co., Schätzfragen',
   categories:()=>[
      {name:'Weihnachtsgeschichte',items:[
        F('Wie hießen die Eltern von Jesus?','Maria und Josef'),
        F('In welcher Stadt wurde Jesus geboren?','Bethlehem'),
        MC('Wem erschienen die Engel in der Weihnachtsnacht auf dem Feld?',['Den Hirten','Den Weisen','Den Soldaten','Den Wirtsleuten'],0),
        MC('Was brachten die Weisen aus dem Morgenland mit?',['Gold, Weihrauch und Myrrhe','Gold, Silber und Seide','Brot, Wein und Öl','Myrrhe, Zimt und Gold'],0),
        F('In welchen zwei Evangelien wird die Geburt Jesu erzählt?','Matthäus und Lukas')]},
      {name:'Weihnachten weltweit',items:[
        MC('An welchem Tag ist in Deutschland Heiligabend?',['23. Dezember','24. Dezember','25. Dezember','6. Januar'],1),
        F('Wie heißt der Weihnachtsmann in Großbritannien?','Father Christmas'),
        MC('In welchem Land isst man an Weihnachten traditionell gern Fast-Food-Hähnchen?',['USA','Japan','Brasilien','Australien'],1),
        F('Welche Stadt in Finnland gilt als Wohnort des Weihnachtsmanns?','Rovaniemi'),
        MC('In welchem Land bringt die Hexe Befana am 6. Januar Geschenke?',['Spanien','Italien','Polen','Griechenland'],1)]},
      {name:'Klassiker',items:[
        F('Wie heißt das Rentier mit der roten Nase?','Rudolph'),
        MC('In welchem Land wurde der Adventskranz erfunden?',['Deutschland','Schweden','Italien','USA'],0),
        F('Wer hat den Adventskranz erfunden?','Johann Hinrich Wichern'),
        MC('Wer komponierte das Ballett „Der Nussknacker“?',['Tschaikowsky','Mozart','Bach','Beethoven'],0),
        F('Wie heißt der geizige Hauptcharakter in Charles Dickens’ „Eine Weihnachtsgeschichte“?','Ebenezer Scrooge')]},
      {name:'Plätzchen & Co.',items:[
        F('Wie heißt das Weihnachtsgebäck mit Rosinen, für das Dresden berühmt ist?','Stollen'),
        MC('Woraus besteht Marzipan hauptsächlich?',['Mandeln und Zucker','Nüssen und Honig','Mehl und Butter','Kokos und Zucker'],0),
        F('Wie heißt das heiße Getränk aus Rotwein und Gewürzen vom Weihnachtsmarkt?','Glühwein'),
        MC('Aus welcher Stadt kommen die berühmten Lebkuchen mit geschützter Herkunftsbezeichnung?',['Nürnberg','Köln','Dresden','Lübeck'],0),
        F('Was bedeutet das Wort „Advent“ übersetzt?','Ankunft')]},
      {name:'Weihnachts-Schätzfragen',items:[
        EST('Wie viele Türchen hat ein klassischer Adventskalender?',24,'Türchen'),
        EST('Wie viele Strophen hatte „Stille Nacht, heilige Nacht“ im Original?',6,'Strophen'),
        EST('In welchem Jahr wurde „Stille Nacht, heilige Nacht“ zum ersten Mal gesungen?',1818,''),
        EST('Wie viele Kilometer sind es Luftlinie von Berlin nach Bethlehem?',2900,'km'),
        EST('Wie viele Sekunden hat der Heiligabend?',86400,'Sekunden')]}
   ]}
];
