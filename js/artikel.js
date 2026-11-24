/* Manna – Artikel für „Pädagogischer Kram“
   Ein neuer Artikel ist ein neuer Eintrag in ARTIKEL. Die Kachel auf der Seite „Pädagogischer Kram“
   und die Artikelseite entstehen daraus automatisch.
   Jeder Abschnitt hat eine id. Darüber kann man direkt hinspringen: Die Gruppenphasen-Schilder an den Spielen
   öffnen den Artikel 'gruppenphasen' beim Abschnitt mit derselben id wie die Phase (siehe PHASEN in spielformat.js). */
const ARTIKEL=[
  {id:'gruppenphasen',titel:'Gruppenphasen',kachelTitel:'Gruppenphasen',kachel:'Die klassischen Gruppenphasen. Absolutes Grundwissen!',
   einleitung:'Jede Gruppe durchläuft mehrere Phasen. Es ist wichtig, als Leitung zu wissen, wo die Gruppe grade steht und das Programm daran anzupassen!',
   abschnitte:[
    {id:'anfang',titel:'Anfangsphase',text:'Diese Phase beginnt mit einer neuen Gruppe, aber ebenso immer, wenn jemand Neues dazukommt. Die Gruppe tastet sich ab und ist vorsichtig. Es eignen sich gut Spiele zum Kennenlernen, bei denen niemand bloßgestellt wird. Die Leitung muss darauf achten, dass alle in den Gruppenfindungsprozess einbezogen sind und bleiben.'},
    {id:'rollen',titel:'Rollenfindungsphase',text:'Das erste Kennenlernen ist vorbei. In dieser Phase finden sich die Rollen in der Gruppe. Es gibt Machtkämpfe, die am besten spielerisch mit klaren Regeln ausgetragen werden. Konflikte, aber auch Gruppenteilnehmende, die sich zurückziehen. Die Gruppenleitung muss sich bemühen, alle einzubeziehen und mit klaren Regeln Halt im Rollenfindungsprozess zu geben.'},
    {id:'vertraut',titel:'Vertrautheitsphase',text:'Die Rollen sind gefunden. Die Gruppe fühlt sich sicher. Ein Wir-Gefühl, ein starkes Vertrautheitsgefühl entsteht. Es funktionieren Spiele mit mehr Nähe, Vertrauen und Zusammenarbeit. Die Gruppe kann in dieser Phase sich „in sich selbst verlieren“. Gleichzeitig ist es die Phase, in der die Gruppe besonders leistungsfähig ist.'},
    {id:'differenz',titel:'Differenzierungsphase',text:'Die Gruppe ist stabil, und Einzelne zeigen wieder mehr eigene Interessen. Unterschiede dürfen sein, ohne dass die Gruppe zerfällt. Gut sind Spiele, bei denen man Verantwortung übernimmt oder sich in wechselnden Teams einbringt. Dies ist die Phase, in der die Gruppe am leistungsfähigsten ist. Punktuelle große Projekte können das Wir-Gefühl der Gruppe stark fördern.'},
    {id:'abloesung',titel:'Ablösungsphase',text:'Die gemeinsame Zeit geht zu Ende, zum Beispiel am Ende einer Freizeit oder wenn die Gruppe auseinandergeht. Gut sind Spiele und Rituale, die auf das Erlebte zurückschauen und einen guten Abschluss schaffen.'}
  ]},
  {id:'vier-ohren',titel:'Vier-Ohren-Modell',untertitel:'Die vier Ebenen der Kommunikation',kachelTitel:'Vier-Ohren-Modell – die vier Ebenen der Kommunikation',kachel:'Warum dieselbe Nachricht ganz unterschiedlich ankommen kann.',
   einleitung:'Nach Friedemann Schulz von Thun hat jede Nachricht vier Seiten, und jeder hört mit vier „Ohren“. Missverständnisse entstehen oft, weil jemand auf einem anderen Ohr hört, als es gemeint war. In der Gruppenleitung hilft das Modell, Konflikte zu verstehen und klarer zu kommunizieren.',
   abschnitte:[
    {id:'sache',titel:'Sachinhalt',text:'Worüber ich informiere: die reinen Fakten. Beispiel: „Die Tür ist offen.“ Wer auf diesem Ohr hört, prüft, ob die Information sachlich stimmt.'},
    {id:'selbst',titel:'Selbstoffenbarung',text:'Was ich von mir zeige: Gefühle, Haltung, Befinden. Beim Satz „Die Tür ist offen.“ zum Beispiel: „Mir ist kalt.“ Wer auf diesem Ohr hört, fragt sich: Was ist mit der Person los?'},
    {id:'beziehung',titel:'Beziehung',text:'Was ich von dir halte und wie wir zueinander stehen. Beim Satz „Die Tür ist offen.“ zum Beispiel: „Du denkst nie daran, sie zu schließen.“ Wer auf diesem Ohr hört, fühlt sich schnell angegriffen oder bestätigt.'},
    {id:'appell',titel:'Appell',text:'Wozu ich dich bringen möchte. Beim Satz „Die Tür ist offen.“ zum Beispiel: „Mach sie bitte zu.“ Wer auf diesem Ohr hört, fragt sich: Was soll ich jetzt tun?'}
  ]},
  /* ENTWURF: Texte sind Vorschläge von Claude und werden durch Lukas' Fassung ersetzt. */
  {id:'sicherheit',titel:'Sicherheit',kachelTitel:'Sicherheit',kachel:'Damit im Ernstfall alle wissen, was zu tun ist.',
   einleitung:'Wo Gruppen spielen, toben und unterwegs sind, kann immer etwas passieren. Gute Vorbereitung sorgt dafür, dass im Ernstfall niemand lange überlegen muss.',
   abschnitte:[
    {id:'notfall',titel:'Was tun im Notfall?',text:'Hier geht es um den Rahmen, den es für den Notfall braucht. Eine Anleitung zur Ersten Hilfe ersetzt das nicht, dafür gibt es Erste-Hilfe-Kurse.',
     teile:[
      {titel:'Erste-Hilfe-Schein',text:'Bei jeder Gruppenstunde und jeder Aktion sollte mindestens eine Person aus dem Team einen aktuellen Erste-Hilfe-Kurs haben. Für die Juleica muss der Kurs meist innerhalb der letzten zwei Jahre gemacht worden sein. Bei Kindergruppen ist ein Kurs „Erste Hilfe am Kind“ sinnvoll.'},
      {titel:'Welches Material sollte da sein?',text:['- Ein vollständiger Verbandkasten, der regelmäßig geprüft wird (Ablaufdaten!)','- Kühlpacks','- Einmalhandschuhe','- Ein geladenes Handy','- Eine Liste mit Notfallnummern und den Kontakten der Eltern','- Bei Ausflügen und Freizeiten: eine Erste-Hilfe-Tasche zum Mitnehmen']},
      {titel:'Wo ist das Material?',text:'Alle im Team sollten wissen, wo Verbandkasten, Notfallnummern und Feuerlöscher sind, und wie man zur Not ins Gebäude und wieder hinaus kommt. Am besten zeigt man das jedem neuen Teammitglied einmal.'},
      {titel:'Wie reagiere ich im Notfall?',text:['Ruhe bewahren und sich einen Überblick verschaffen. Die Unfallstelle absichern, sich selbst nicht in Gefahr bringen.','Eine Person kümmert sich um die verletzte Person, eine andere um den Rest der Gruppe. Die Gruppe wird beschäftigt und von der Unfallstelle weggebracht.']},
      {titel:'Wen kontaktiere ich?',text:['- Notruf 112 bei allem, was ernst sein könnte. Wer anruft, beantwortet die Fragen der Leitstelle und legt nicht als Erstes auf.','- Ärztlicher Bereitschaftsdienst 116 117, wenn es nicht lebensbedrohlich ist, aber ein Arzt drauf schauen sollte.','- Die Eltern bzw. Erziehungsberechtigten.','- Die verantwortliche Person beim Träger, zum Beispiel Jugendreferent oder Gemeindeleitung.','Danach alles kurz aufschreiben: Was ist wann passiert, und was wurde gemacht? Das hilft, falls später Fragen kommen, zum Beispiel von der Versicherung.']}
     ]}
  ]}
];
