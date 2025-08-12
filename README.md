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

## Fichiers à utiliser:

index.html
```html
<!DOCTYPE html>
<html lang="fr" class="bg-gray-900 text-gray-100">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Outil de Mise à Jour de Collection Firestore</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body {
                font-family: 'Inter', sans-serif;
                background-image: linear-gradient(to bottom, #111827, #1f2937, #111827);
            }
        </style>
    </head>
    <body class="min-h-screen flex flex-col items-center p-4 font-sans">
        <div class="w-full max-w-xl bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
            <h1 class="text-3xl font-extrabold text-green-400 drop-shadow-lg text-center mb-8">
                Outil de mise à jour Firestore
            </h1>
            <div>
                <label for="targetCollection" class="block mb-1 font-semibold text-gray-300">Collection à modifier (cible)</label>
                <input type="text" id="targetCollection" placeholder="Ex: mouvements" class="w-full rounded-md bg-gray-900 border border-gray-700 px-4 py-2 focus:outline-none focus:border-green-400 transition" />
            </div>

            <div>
                <label for="refFieldInTarget" class="block mb-1 font-semibold text-gray-300">Champ référence dans la collection cible</label>
                <input type="text" id="refFieldInTarget" placeholder="Ex: organisationId" class="w-full rounded-md bg-gray-900 border border-gray-700 px-4 py-2 focus:outline-none focus:border-green-400 transition" />
            </div>

            <div>
                <label for="sourceCollection" class="block mb-1 font-semibold text-gray-300">Collection source (à chercher)</label>
                <input type="text" id="sourceCollection" placeholder="Ex: organisations" class="w-full rounded-md bg-gray-900 border border-gray-700 px-4 py-2 focus:outline-none focus:border-green-400 transition" />
            </div>

            <div>
                <label for="refFieldInSource" class="block mb-1 font-semibold text-gray-300">Champ référence dans la collection source</label>
                <input type="text" id="refFieldInSource" placeholder="Ex: codeOrganisation" class="w-full rounded-md bg-gray-900 border border-gray-700 px-4 py-2 focus:outline-none focus:border-green-400 transition" />
            </div>

            <div>
                <label for="fieldsMapping" class="block mb-1 font-semibold text-gray-300">Mapping champs (JSON)</label>
                <textarea id="fieldsMapping" rows="6" placeholder='Ex: { "organisation": { "référence": "ref", "désignation": "nom" }, "autreChamp": "champSource" }' class="w-full rounded-md bg-gray-900 border border-gray-700 px-4 py-2 font-mono text-green-300 focus:outline-none focus:border-green-400 transition resize-y"></textarea>
            </div>

            <div>
                <label for="firebaseConfig" class="block mb-1 font-semibold text-gray-300">Firebase config (objet JSON)</label>
                <textarea id="firebaseConfig" rows="6" placeholder='Ex: { "apiKey": "...", "authDomain": "...", "projectId": "..." }' class="w-full rounded-md bg-gray-900 border border-gray-700 px-4 py-2 font-mono text-green-300 focus:outline-none focus:border-green-400 transition resize-y"></textarea>
            </div>

            <button id="startBtn" class="w-full py-3 bg-green-500 hover:bg-green-600 rounded-md font-bold text-gray-900 shadow-md transition">
                Lancer la mise à jour
            </button>

            <div id="log" class="mt-6 h-48 overflow-y-auto bg-gray-700 text-green-300 font-mono text-sm p-4 rounded-md whitespace-pre-wrap"></div>
        </div>
        
        <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
        <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js"></script>
        <script src="script.js"></script>
    </body>
</html>
```

script.js
```js
document.addEventListener('DOMContentLoaded', () => {

    const startBtn = document.getElementById('startBtn');
    const logDiv = document.getElementById('log');
    const targetCollectionInput = document.getElementById('targetCollection');
    const refFieldInTargetInput = document.getElementById('refFieldInTarget');
    const sourceCollectionInput = document.getElementById('sourceCollection');
    const refFieldInSourceInput = document.getElementById('refFieldInSource');
    const fieldsMappingTextarea = document.getElementById('fieldsMapping');
    const firebaseConfigTextarea = document.getElementById('firebaseConfig');

    const logToUI = (message, isError = false) => {
        const p = document.createElement('p');
        p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        p.className = isError ? 'text-red-400' : 'text-green-300';
        logDiv.appendChild(p);
        logDiv.scrollTop = logDiv.scrollHeight;
    };

    const getNestedValue = (obj, path) => {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (current && current.hasOwnProperty(key)) {
                current = current[key];
            } else {
                return undefined;
            }
        }
        return current;
    };

    const setNestedValue = (obj, path, value) => {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current.hasOwnProperty(key) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
    };

    const updateCollections = async () => {
        startBtn.disabled = true;
        startBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
        startBtn.classList.add('bg-gray-500', 'cursor-not-allowed');
        logDiv.innerHTML = '';

        logToUI("Début du processus de mise à jour...");

        const targetCollectionName = targetCollectionInput.value.trim();
        const refFieldInTarget = refFieldInTargetInput.value.trim();
        const sourceCollectionName = sourceCollectionInput.value.trim();
        const refFieldInSource = refFieldInSourceInput.value.trim();
        const firebaseConfigString = firebaseConfigTextarea.value.trim();
        const fieldsMappingString = fieldsMappingTextarea.value.trim();

        if (!targetCollectionName || !refFieldInTarget || !sourceCollectionName || !refFieldInSource || !firebaseConfigString || !fieldsMappingString) {
            logToUI("Erreur : Veuillez remplir tous les champs du formulaire.", true);
            startBtn.disabled = false;
            startBtn.classList.remove('bg-gray-500', 'cursor-not-allowed');
            startBtn.classList.add('bg-green-500', 'hover:bg-green-600');
            return;
        }

        let firebaseConfig, fieldsMapping;
        try {
            firebaseConfig = JSON.parse(firebaseConfigString);
            fieldsMapping = JSON.parse(fieldsMappingString);
        } catch (error) {
            logToUI(`Erreur JSON : ${error.message}. Vérifiez la syntaxe.`, true);
            startBtn.disabled = false;
            startBtn.classList.remove('bg-gray-500', 'cursor-not-allowed');
            startBtn.classList.add('bg-green-500', 'hover:bg-green-600');
            return;
        }

        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            const db = firebase.firestore();
            logToUI("Firebase initialisé avec succès.");

            logToUI(`Récupération des documents de la collection '${targetCollectionName}'...`);
            const targetDocsSnapshot = await db.collection(targetCollectionName).get();
            if (targetDocsSnapshot.empty) {
                logToUI(`Aucun document trouvé dans la collection cible. Terminé.`, true);
                startBtn.disabled = false;
                startBtn.classList.remove('bg-gray-500', 'cursor-not-allowed');
                startBtn.classList.add('bg-green-500', 'hover:bg-green-600');
                return;
            }

            logToUI(`${targetDocsSnapshot.docs.length} documents cibles trouvés.`);

            for (const targetDoc of targetDocsSnapshot.docs) {
                logToUI(`--- Traitement du document ID : ${targetDoc.id} ---`);

                const refValueInTarget = getNestedValue(targetDoc.data(), refFieldInTarget);
                if (refValueInTarget === undefined) {
                    logToUI(`  Avertissement : Le champ de référence '${refFieldInTarget}' est manquant dans ce document. On passe au suivant.`, true);
                    continue;
                }

                const sourceQuerySnapshot = await db.collection(sourceCollectionName)
                    .where(refFieldInSource, "==", refValueInTarget)
                    .limit(1)
                    .get();

                if (sourceQuerySnapshot.empty) {
                    logToUI(`  Avertissement : Aucun document source trouvé pour la valeur '${refValueInTarget}'. On passe au suivant.`, true);
                    continue;
                }

                const sourceDoc = sourceQuerySnapshot.docs[0];
                logToUI(`  Document source trouvé avec l'ID : ${sourceDoc.id}.`);
                const sourceData = sourceDoc.data();

                const updateData = {};
                let hasUpdates = false;

                for (const targetField in fieldsMapping) {
                    const sourceField = fieldsMapping[targetField];

                    if (typeof sourceField === 'object' && sourceField !== null) {
                        let nestedUpdates = {};
                        for (const nestedTargetField in sourceField) {
                            const nestedSourceField = sourceField[nestedTargetField];
                            const sourceValue = getNestedValue(sourceData, nestedSourceField);

                            if (sourceValue !== undefined) {
                                setNestedValue(nestedUpdates, nestedTargetField, sourceValue);
                                hasUpdates = true;
                                logToUI(`  - Copie du champ imbriqué '${nestedSourceField}' vers '${targetField}.${nestedTargetField}'.`);
                            } else {
                                logToUI(`  - Avertissement : Le champ source '${nestedSourceField}' est manquant.`, true);
                            }
                        }
                        updateData[targetField] = nestedUpdates;
                    } else {
                        const sourceValue = getNestedValue(sourceData, sourceField);
                        if (sourceValue !== undefined) {
                            setNestedValue(updateData, targetField, sourceValue);
                            hasUpdates = true;
                            logToUI(`  - Copie du champ '${sourceField}' vers '${targetField}'.`);
                        } else {
                            logToUI(`  - Avertissement : Le champ source '${sourceField}' est manquant.`, true);
                        }
                    }
                }

                if (hasUpdates) {
                    const targetDocRef = db.collection(targetCollectionName).doc(targetDoc.id);
                    await targetDocRef.update(updateData);
                    logToUI(`  Succès : Document cible ${targetDoc.id} mis à jour.`);
                } else {
                    logToUI(`  Avertissement : Aucun champ valide à mettre à jour pour le document ${targetDoc.id}.`);
                }
            }

            logToUI("🎉 Processus de mise à jour terminé avec succès !");

        } catch (error) {
            logToUI(`Une erreur inattendue est survenue : ${error.message}`, true);
            console.error(error);
        } finally {
            startBtn.disabled = false;
            startBtn.classList.remove('bg-gray-500', 'cursor-not-allowed');
            startBtn.classList.add('bg-green-500', 'hover:bg-green-600');
        }
    };

    startBtn.addEventListener('click', updateCollections);

});
```

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