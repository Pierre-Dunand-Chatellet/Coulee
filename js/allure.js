/* ============================================================
   COULÉE — calculateur d'allure
   Riegel : T2 = T1 × (D2 / D1)^1.06
   ============================================================ */
(function () {
  'use strict';

  var EXPOSANT = 1.06;

  var t1 = document.getElementById('t1');
  var d1 = document.getElementById('d1');
  var d2 = document.getElementById('d2');
  var bassin = document.getElementById('bassin');
  var out = {
    label: document.getElementById('res-label'),
    temps: document.getElementById('res-temps'),
    allure: document.getElementById('res-allure'),
    longueurs: document.getElementById('res-longueurs'),
    vitesse: document.getElementById('res-vitesse'),
    splitLabel: document.getElementById('res-split-label'),
    splits: document.getElementById('splits')
  };

  // « 1:45 », « 1:45.3 », « 1:45,30 », « 38.5 », « 38 » → secondes
  function lire(v) {
    var m = String(v).trim().replace(',', '.').match(/^(?:(\d{1,3}):)?(\d{1,2}(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)$/);
    if (!m) return NaN;
    var s = parseFloat(m[2]);
    if (m[1] !== undefined && s >= 60) return NaN;   // « 1:75 » n'est pas un temps
    return (m[1] ? parseInt(m[1], 10) * 60 : 0) + s;
  }

  // On arrondit AVANT de découper en minutes : sinon 59,996 s s'affiche « 0:60,00 ».
  function formater(sec, dec) {
    var f = Math.pow(10, dec);
    var total = Math.round(sec * f) / f;
    var h = Math.floor(total / 3600);
    var m = Math.floor((total - h * 3600) / 60);
    var s = total - h * 3600 - m * 60;
    var sTxt = s.toFixed(dec).replace('.', ',');
    if (s < 10) sTxt = '0' + sTxt;
    return (h ? h + ':' + (m < 10 ? '0' : '') + m : m) + ':' + sTxt;
  }

  function fr(n, d) {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  // Les outils sous le calculateur (toi contre le record, niveau, séance) suivent
  // ce résultat : on l'annonce à chaque calcul plutôt que de leur faire relire le formulaire.
  function annoncer(detail) {
    var ev;
    try { ev = new CustomEvent('allure:maj', { detail: detail }); }
    catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('allure:maj', false, false, detail); }
    document.dispatchEvent(ev);
  }

  function calculer() {
    var T1 = lire(t1.value);
    var D1 = +d1.value, D2 = +d2.value, B = +bassin.value;
    out.label.textContent = 'Temps estimé sur ' + D2 + ' m';

    if (!isFinite(T1) || T1 <= 0) {
      annoncer({ ok: false });
      t1.setAttribute('aria-invalid', 'true');
      out.temps.textContent = '—';
      out.allure.textContent = 'Temps illisible';
      out.longueurs.textContent = '—';
      out.vitesse.textContent = '—';
      out.splitLabel.textContent = 'Passages';
      out.splits.innerHTML = '';
      return;
    }
    t1.setAttribute('aria-invalid', 'false');

    var T2 = T1 * Math.pow(D2 / D1, EXPOSANT);
    out.temps.textContent = formater(T2, 0);
    out.allure.textContent = formater(T2 / D2 * 100, 1) + ' /100 m';
    out.longueurs.textContent = D2 / B;
    out.vitesse.textContent = fr(D2 / T2, 2) + ' m/s';

    // un passage tous les 2 longueurs (50 m en bassin de 25, 100 m en bassin de 50),
    // doublé tant qu'il y aurait plus de 16 cases
    var pas = Math.max(2 * B, 50);
    while (D2 / pas > 16) pas *= 2;
    out.splitLabel.textContent = 'Passages tous les ' + pas + ' m, à allure constante';
    var html = '';
    for (var d = pas; d <= D2; d += pas) {
      html += '<div><span class="d">' + d + ' m</span><span class="t">' + formater(T2 * d / D2, 1) + '</span></div>';
    }
    // Jamais vrai avec les distances actuelles du menu ; garde-fou si on en ajoute
    // une qui n'est pas un multiple du pas (ex. 150 m) : on affiche quand même l'arrivée.
    if ((D2 / pas) % 1) {
      html += '<div><span class="d">' + D2 + ' m</span><span class="t">' + formater(T2, 1) + '</span></div>';
    }
    out.splits.innerHTML = html;
    annoncer({ ok: true, T1: T1, D1: D1, T2: T2, D2: D2, B: B });
  }

  // Formulaire à un seul champ texte et sans bouton : Entrée l'envoie (règle
  // d'« envoi implicite » du HTML), ce qui rechargeait la page et effaçait la saisie.
  document.getElementById('paceForm').addEventListener('submit', function (e) {
    e.preventDefault();
    calculer();
  });

  [t1, d1, d2, bassin].forEach(function (el) {
    el.addEventListener('input', calculer);
    el.addEventListener('change', calculer);
  });
  calculer();
})();
