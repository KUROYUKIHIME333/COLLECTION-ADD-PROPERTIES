document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const logDiv = document.getElementById("log");
  const targetCollectionInput = document.getElementById("targetCollection");
  const refFieldInTargetInput = document.getElementById("refFieldInTarget");
  const sourceCollectionInput = document.getElementById("sourceCollection");
  const refFieldInSourceInput = document.getElementById("refFieldInSource");
  const fieldsMappingTextarea = document.getElementById("fieldsMapping");
  const firebaseConfigTextarea = document.getElementById("firebaseConfig");

  const logToUI = (message, isError = false) => {
    const p = document.createElement("p");
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    p.className = isError ? "text-red-400" : "text-green-300";
    logDiv.appendChild(p);
    logDiv.scrollTop = logDiv.scrollHeight;
  };

  const getNestedValue = (obj, path) => {
    const keys = path.split(".");
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
    const keys = path.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current.hasOwnProperty(key) || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
  };

  const updateCollections = async () => {
    startBtn.disabled = true;
    startBtn.classList.remove("bg-green-500", "hover:bg-green-600");
    startBtn.classList.add("bg-gray-500", "cursor-not-allowed");
    logDiv.innerHTML = "";

    logToUI("Début du processus de mise à jour...");

    const targetCollectionName = targetCollectionInput.value.trim();
    const refFieldInTarget = refFieldInTargetInput.value.trim();
    const sourceCollectionName = sourceCollectionInput.value.trim();
    const refFieldInSource = refFieldInSourceInput.value.trim();
    const firebaseConfigString = firebaseConfigTextarea.value.trim();
    const fieldsMappingString = fieldsMappingTextarea.value.trim();

    if (
      !targetCollectionName ||
      !refFieldInTarget ||
      !sourceCollectionName ||
      !refFieldInSource ||
      !firebaseConfigString ||
      !fieldsMappingString
    ) {
      logToUI("Erreur : Veuillez remplir tous les champs du formulaire.", true);
      startBtn.disabled = false;
      startBtn.classList.remove("bg-gray-500", "cursor-not-allowed");
      startBtn.classList.add("bg-green-500", "hover:bg-green-600");
      return;
    }

    let firebaseConfig, fieldsMapping;
    try {
      firebaseConfig = JSON.parse(firebaseConfigString);
      fieldsMapping = JSON.parse(fieldsMappingString);
    } catch (error) {
      logToUI(`Erreur JSON : ${error.message}. Vérifiez la syntaxe.`, true);
      startBtn.disabled = false;
      startBtn.classList.remove("bg-gray-500", "cursor-not-allowed");
      startBtn.classList.add("bg-green-500", "hover:bg-green-600");
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      const db = firebase.firestore();
      logToUI("Firebase initialisé avec succès.");

      logToUI(
        `Récupération des documents de la collection '${targetCollectionName}'...`
      );
      const targetDocsSnapshot = await db
        .collection(targetCollectionName)
        .get();
      if (targetDocsSnapshot.empty) {
        logToUI(
          `Aucun document trouvé dans la collection cible. Terminé.`,
          true
        );
        startBtn.disabled = false;
        startBtn.classList.remove("bg-gray-500", "cursor-not-allowed");
        startBtn.classList.add("bg-green-500", "hover:bg-green-600");
        return;
      }

      logToUI(`${targetDocsSnapshot.docs.length} documents cibles trouvés.`);

      for (const targetDoc of targetDocsSnapshot.docs) {
        logToUI(`--- Traitement du document ID : ${targetDoc.id} ---`);

        const refValueInTarget = getNestedValue(
          targetDoc.data(),
          refFieldInTarget
        );
        if (refValueInTarget === undefined) {
          logToUI(
            `  Avertissement : Le champ de référence '${refFieldInTarget}' est manquant dans ce document. On passe au suivant.`,
            true
          );
          continue;
        }

        const sourceQuerySnapshot = await db
          .collection(sourceCollectionName)
          .where(refFieldInSource, "==", refValueInTarget)
          .limit(1)
          .get();

        if (sourceQuerySnapshot.empty) {
          logToUI(
            `  Avertissement : Aucun document source trouvé pour la valeur '${refValueInTarget}'. On passe au suivant.`,
            true
          );
          continue;
        }

        const sourceDoc = sourceQuerySnapshot.docs[0];
        logToUI(`  Document source trouvé avec l'ID : ${sourceDoc.id}.`);
        const sourceData = sourceDoc.data();

        const updateData = {};
        let hasUpdates = false;

        for (const targetField in fieldsMapping) {
          const sourceField = fieldsMapping[targetField];

          if (typeof sourceField === "object" && sourceField !== null) {
            let nestedUpdates = {};
            for (const nestedTargetField in sourceField) {
              const nestedSourceField = sourceField[nestedTargetField];
              const sourceValue = getNestedValue(sourceData, nestedSourceField);

              if (sourceValue !== undefined) {
                setNestedValue(nestedUpdates, nestedTargetField, sourceValue);
                hasUpdates = true;
                logToUI(
                  `  - Copie du champ imbriqué '${nestedSourceField}' vers '${targetField}.${nestedTargetField}'.`
                );
              } else {
                logToUI(
                  `  - Avertissement : Le champ source '${nestedSourceField}' est manquant.`,
                  true
                );
              }
            }
            updateData[targetField] = nestedUpdates;
          } else {
            const sourceValue = getNestedValue(sourceData, sourceField);
            if (sourceValue !== undefined) {
              setNestedValue(updateData, targetField, sourceValue);
              hasUpdates = true;
              logToUI(
                `  - Copie du champ '${sourceField}' vers '${targetField}'.`
              );
            } else {
              logToUI(
                `  - Avertissement : Le champ source '${sourceField}' est manquant.`,
                true
              );
            }
          }
        }

        if (hasUpdates) {
          const targetDocRef = db
            .collection(targetCollectionName)
            .doc(targetDoc.id);
          await targetDocRef.update(updateData);
          logToUI(`  Succès : Document cible ${targetDoc.id} mis à jour.`);
        } else {
          logToUI(
            `  Avertissement : Aucun champ valide à mettre à jour pour le document ${targetDoc.id}.`
          );
        }
      }

      logToUI("🎉 Processus de mise à jour terminé avec succès !");
    } catch (error) {
      logToUI(`Une erreur inattendue est survenue : ${error.message}`, true);
      console.error(error);
    } finally {
      startBtn.disabled = false;
      startBtn.classList.remove("bg-gray-500", "cursor-not-allowed");
      startBtn.classList.add("bg-green-500", "hover:bg-green-600");
    }
  };

  startBtn.addEventListener("click", updateCollections);
});
