/* Manna – Verbindung zu Supabase (Server in Frankfurt)
   Wird von der App (Spiel einreichen) und vom Editor (Einreichungen ansehen) benutzt.
   Der Schlüssel hier ist der ÖFFENTLICHE („publishable“). Er darf im Code stehen:
   Was damit erlaubt ist, regeln die Zugriffsregeln in der Datenbank (nur einreichen, nicht lesen).
   NIE den geheimen Schlüssel („secret“ / „service_role“) hier eintragen. */
(function (root) {
  'use strict';
  root.MannaDB = Object.freeze({
    url: 'https://atdfiktajxmhjqrhwgbb.supabase.co',
    key: 'sb_publishable_XVvHrzG_pDKErkF37hsN4A_NYzt-Dc-',
    // Testphase: Konten gibt es nur für Tester (von Hand im Supabase-Dashboard angelegt).
    // Anmelden geht für alle, der Knopf „Konto erstellen“ ist ausgeblendet.
    // Für alle freischalten: hier true eintragen UND im Supabase-Dashboard „Allow new users to sign up“ einschalten
    // (vorher eigenen Mailversand einrichten, sonst kommen keine Bestätigungsmails an).
    kontenFuerAlle: false
  });
})(typeof window !== 'undefined' ? window : globalThis);
