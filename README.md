# Coulée

Refonte complète de mon tout premier site, [Lanatation.fr](https://github.com/Pierre-Dunand-Chatellet/Lanatation.fr),
fait quand j'avais 13 ans. Même sujet, la natation, sept ans de pratique en plus.

En ligne : https://dunandchatellet.fr/coulee/

## Ce que ça fait

L'accueil ouvre sur un plongeon animé, piloté par le défilement de la page : le nageur quitte
le plot, entre dans l'eau et file vers le mur pendant qu'on descend. Il ne se joue qu'une fois
par visite.

Quatre pages ensuite :

| Page | Contenu |
| --- | --- |
| `nages.html` | Les 4 nages comparées : technique, vitesse, dépense d'énergie |
| `comparateur.html` | Course animée entre deux nages sur la même distance |
| `allure.html` | Calcul d'allure, course contre le record du monde, points World Aquatics, séance générée |
| `disciplines.html` | Eau libre, water-polo, plongeon, natation artistique, frise des Jeux depuis 1896 |

## Comment c'est fait

HTML, CSS et JavaScript, sans framework ni dépendance : le site se dépose tel quel sur un
hébergement. Les polices (Anton, Inter, JetBrains Mono) sont servies en local, pas par Google.

`js/donnees.js` est la seule source des records et des temps de référence ; les pages les
écrivent aussi en dur pour rester lisibles sans JavaScript, et les valeurs sont réécrites au
chargement. Les records et les règles (profondeur des bassins, hauteur des fanions, points
World Aquatics) viennent des textes officiels, pas d'une estimation.

## Honnêteté sur la fabrication

**Ce projet a été codé avec l'aide d'une IA.** Ce qui vient de moi : l'idée, le contenu, les
choix de design et de fonctionnement, la vérification des données, les tests et la mise en
ligne. Je préfère le dire que le laisser croire.

---

Pierre Dunand-Chatellet — [tous mes projets](https://dunandchatellet.fr/projets.html)
