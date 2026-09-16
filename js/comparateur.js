/* ============================================================
   COULÉE — comparateur : course des records, tableau, calories
   Dépend de js/donnees.js (window.COULEE).
   ============================================================ */
(function () {
  'use strict';

  var D = window.COULEE;
  if (!D) return;
  var fr = D.fr;

  var ORDRE = ['crawl', 'papillon', 'dos', 'brasse'];   // couloirs 4 à 7
  var LE = { crawl: 'La nage libre', papillon: 'Le papillon', dos: 'Le dos', brasse: 'La brasse' };

  var NAGEUR = D.NAGEUR_SVG;   // partagée avec la page Allure

  var raceEl = document.getElementById('race');
  var statusEl = document.getElementById('race-status');
  var startBtn = document.getElementById('race-start');

  raceEl.innerHTML = ORDRE.map(function (id, i) {
    return (i ? '<div class="rope" aria-hidden="true"></div>' : '') +
      '<div class="lane" data-nage="' + id + '">' +
        '<div class="lane-name"><small>Couloir ' + (i + 4) + '</small><b>' + D.NOMS[id] + '</b></div>' +
        '<div class="track"><span class="race-swimmer">' + NAGEUR + '</span></div>' +
        '<div class="lane-time"><span class="chrono">0,00</span><span class="place"></span></div>' +
      '</div>';
  }).join('');
  // La course est un visuel : le résultat est annoncé en texte dans #race-status
  // et détaillé dans le tableau.
  raceEl.setAttribute('aria-hidden', 'true');
  raceEl.hidden = false;

  var lanes = [].slice.call(raceEl.querySelectorAll('.lane')).map(function (el) {
    return {
      el: el,
      id: el.getAttribute('data-nage'),
      track: el.querySelector('.track'),
      sw: el.querySelector('.race-swimmer'),
      chrono: el.querySelector('.chrono'),
      place: el.querySelector('.place')
    };
  });

  function sexe() { return document.querySelector('input[name="sexe"]:checked').value; }
  function facteur() { return +document.querySelector('input[name="vitesse"]:checked').value; }
  function classement(rec) {
    return ORDRE.slice().sort(function (a, b) { return rec[a].t - rec[b].t; });
  }
  function rang(n) { return n + (n === 1 ? 're' : 'e') + ' place'; }

  // largeurs mesurées une fois par course, pas à chaque frame
  var dist = [];
  function mesurer() {
    dist = lanes.map(function (l) { return Math.max(0, l.track.clientWidth - l.sw.offsetWidth); });
  }
  function placer(i, p) {
    lanes[i].sw.style.transform = 'translate3d(' + (p * dist[i]).toFixed(1) + 'px,0,0)';
  }

  var raf = 0, enCourse = false;

  function reset() {
    cancelAnimationFrame(raf);
    enCourse = false;
    mesurer();
    lanes.forEach(function (l, i) {
      l.el.classList.remove('done');
      placer(i, 0);
      l.chrono.textContent = '0,00';
      l.place.textContent = '';
    });
    statusEl.textContent = '';
    startBtn.textContent = '▶ Départ';
  }

  function annoncer(rec) {
    var c = classement(rec);
    var premier = rec[c[0]], dernier = rec[c[c.length - 1]];
    // à vitesse constante : la distance qui reste au dernier quand le premier touche
    statusEl.textContent =
      LE[c[0]] + ' touche le mur en ' + fr(premier.t, 2) + ' s. À cet instant, ' +
      LE[c[c.length - 1]].toLowerCase() + ' a encore ' + fr(50 - 50 * premier.t / dernier.t, 1) +
      ' m à nager, et touche ' + fr(dernier.t - premier.t, 2) + ' s plus tard.';
  }

  function arrivee(rec) {
    var c = classement(rec);
    lanes.forEach(function (l, i) {
      l.el.classList.add('done');
      placer(i, 1);
      l.chrono.textContent = fr(rec[l.id].t, 2);
      l.place.textContent = rang(c.indexOf(l.id) + 1);
    });
    enCourse = false;
    startBtn.textContent = '↺ Relancer';
    annoncer(rec);
  }

  function lancer() {
    reset();
    var rec = D.RECORDS[sexe()];
    // Pas de saut direct à l'arrivée quand le système demande « animations
    // réduites » : la course ne part QUE sur un clic explicite, et la sauter
    // rendait le bouton inutile (chaque « Relancer » réaffichait l'arrivée).
    var c = classement(rec);
    var f = facteur();
    var t0 = performance.now();
    enCourse = true;
    startBtn.textContent = '↺ Relancer';

    function frame(now) {
      // l'horodatage d'une frame est celui du DÉBUT de la frame : il peut précéder
      // t0 de quelques ms si le clic a eu lieu dans la même frame → « -0,01 »
      var t = Math.max(0, (now - t0) / 1000 * f);
      var fini = true;
      lanes.forEach(function (l, i) {
        var total = rec[l.id].t;
        var p = Math.min(t / total, 1);
        placer(i, p);
        if (p < 1) {
          fini = false;
          l.chrono.textContent = fr(t, 2);
        } else if (!l.el.classList.contains('done')) {
          l.el.classList.add('done');
          l.chrono.textContent = fr(total, 2);
          l.place.textContent = rang(c.indexOf(l.id) + 1);
        }
      });
      if (fini) { arrivee(rec); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  /* ---------- tableau ---------- */
  var tbody = document.getElementById('race-table');
  var caption = document.getElementById('table-caption');
  function tableau() {
    var s = sexe();
    var rec = D.RECORDS[s];
    var vRef = 50 / rec.crawl.t;
    caption.textContent = s === 'H' ? 'Records hommes' : 'Records dames';
    tbody.innerHTML = ORDRE.map(function (id) {
      var r = rec[id], v = 50 / r.t;
      var ecart = id === 'crawl' ? 'référence' : '−' + fr((1 - v / vRef) * 100, 1) + ' %';
      return '<tr><td><b>' + D.NOMS[id] + '</b></td>' +
        '<td>' + r.qui + ' <span class="muted">— ' + r.pays + ', ' + r.an + '</span></td>' +
        '<td class="num rec">' + fr(r.t, 2) + ' s</td>' +
        '<td class="num">' + fr(v, 2) + '</td>' +
        '<td class="num">' + fr(v * 3.6, 2) + '</td>' +
        '<td class="num">' + ecart + '</td></tr>';
    }).join('');
  }

  /* ---------- calories ---------- */
  var poidsEl = document.getElementById('poids');
  var kcalEl = document.getElementById('kcal');
  function kcal() {
    var brut = +poidsEl.value;
    var valide = poidsEl.value !== '' && brut >= 30 && brut <= 150;
    poidsEl.setAttribute('aria-invalid', valide ? 'false' : 'true');
    if (!valide) return;   // on garde le dernier affichage valide plutôt qu'un 0 ou un NaN
    var tri = Object.keys(D.MET).sort(function (a, b) { return D.MET[b] - D.MET[a]; });
    kcalEl.innerHTML = tri.map(function (id, i) {
      return '<div' + (i === 0 ? ' class="top"' : '') + '>' +
        '<span class="label">' + D.NOMS[id] + '</span>' +
        '<span class="big">' + Math.round(D.MET[id] * brut) + '</span>' +
        '<span class="unit">kcal / heure</span></div>';
    }).join('');
  }

  startBtn.addEventListener('click', lancer);
  [].slice.call(document.querySelectorAll('input[name="sexe"]')).forEach(function (r) {
    r.addEventListener('change', function () { tableau(); reset(); });
  });
  poidsEl.addEventListener('input', kcal);

  var resizeId;
  window.addEventListener('resize', function () {
    clearTimeout(resizeId);
    resizeId = setTimeout(function () {
      if (enCourse) { mesurer(); return; }   // la frame suivante replace tout le monde
      mesurer();
      lanes.forEach(function (l, i) { placer(i, l.el.classList.contains('done') ? 1 : 0); });
    }, 120);
  });

  tableau();
  kcal();
  reset();
})();
