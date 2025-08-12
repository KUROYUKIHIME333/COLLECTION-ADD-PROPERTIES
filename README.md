# Outil de Mise à Jour de Collection Firestore

Cet outil est une application web simple en HTML et JavaScript pur qui vous permet de mettre à jour de manière groupée des documents dans une collection Firestore. Il synchronise les champs d'une collection cible en se basant sur les données d'une collection source.

## Comment démarrer

Créez les fichiers :

```index.html``` (pour l'interface utilisateur de l'outil)

```script.js``` (pour la logique de mise à jour)

Copiez le code :

Copiez le code HTML ci-dessous dans votre fichier ```index.html```.

Copiez le code JavaScript ci-dessous dans votre fichier ```script.js```.

Ouvrez le fichier :

Ouvrez simplement le fichier ```index.html``` dans votre navigateur web.

## Fonctionnalités

- HTML et JS pur : Ne nécessite pas de serveur backend comme Node.js et Express.

- Design responsive : L'interface s'adapte aux écrans d'ordinateur et de mobile.

- Suivi en direct : Un journal d'activité intégré vous permet de suivre l'avancement de la mise à jour en temps réel.

## Configuration

Pour utiliser l'outil, vous devez fournir les informations suivantes :

- Collection à modifier (cible) : Le nom de la collection que vous souhaitez mettre à jour.

- Champ référence dans la collection cible : Le nom du champ dans votre collection cible qui contient la valeur de référence.

- Collection source (à chercher) : Le nom de la collection où se trouvent les données à copier.

- Champ référence dans la collection source : Le nom du champ dans la collection source qui correspond à la valeur de référence.

- Mapping champs (JSON) : Un objet JSON qui définit la correspondance entre les champs de la collection cible et les champs de la collection source.

- Firebase config (objet JSON) : La configuration de votre projet Firebase.

# Avertissement

⚠️ Cet outil modifie vos données Firestore. 
Veuillez vous assurer d'avoir une sauvegarde de vos données avant de lancer le processus de mise à jour.