<p align="center">
  <img src="icons/logo.png" alt="Emerald" width="140">
</p>

<h1 align="center">Emerald</h1>

<p align="center"><b>Overlay visuel de stratégie Blackjack pour navigateur</b><br>
Tirer · Rester · Doubler · Partager — avec probabilités en temps réel</p>

---

## ✨ Fonctionnalités

- **Overlay flottant et déplaçable** par-dessus n'importe quelle table de Blackjack en ligne
- **Recommandation instantanée** basée sur le tableau de stratégie de base (totaux durs, mains souples, paires)
- **Multi-mains** : ajoutez autant de mains que vous en jouez, chaque main a sa propre recommandation
- **Probabilités en direct** (modèle deck infini) :
  - Probabilité que le croupier saute
  - Probabilité de gagner / d'égaliser en restant
  - Probabilité de sauter si vous tirez
- **Détection Blackjack et bust** automatique
- Thème sombre émeraude, code couleur identique au tableau (vert = Tirer, bleu = Doubler, rouge = Rester, gris = Partager)

## 🚀 Installation

1. Clonez ce repo : `git clone https://github.com/vskstudio/Emerald.git`
2. Ouvrez `chrome://extensions` dans Chrome (ou Edge/Brave)
3. Activez le **Mode développeur** (en haut à droite)
4. Cliquez sur **Charger l'extension non empaquetée** et sélectionnez le dossier `Emerald`

## 🎮 Utilisation

1. Ouvrez votre table de Blackjack en ligne
2. Cliquez sur l'icône **Emerald** dans la barre d'outils → l'overlay apparaît
3. Sélectionnez la **carte visible du croupier**
4. Ajoutez vos cartes (et celles des autres mains avec **+ Ajouter une main**)
5. La recommandation et les probabilités se mettent à jour instantanément
6. **Nouvelle donne** pour repartir à zéro

## 📊 Stratégie

La logique suit exactement le tableau de stratégie de base intégré (`src/strategy.js`) :

| Code | Action | Couleur |
|------|--------|---------|
| T | Tirer (Hit) | 🟩 Vert |
| D | Doubler (Double) | 🟦 Bleu |
| R | Rester (Stay) | 🟥 Rouge |
| P | Partager (Split) | ⬜ Gris |

## ⚠️ Avertissement

Cet outil est fourni à titre éducatif. La stratégie de base réduit l'avantage de la maison mais **ne garantit aucun gain**. Jouez de manière responsable.

---

<p align="center">Made with 💚 by <a href="https://github.com/vskstudio">VSK Studio</a></p>
