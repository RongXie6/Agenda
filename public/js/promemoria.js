// Mostra il campo "fine ricorrenza" solo se è selezionata una ricorrenza
function toggleDataFineRow() {
    const ric = document.querySelector("#ricorrenza").value;
    document.getElementById("dataFinePromRow").style.display = (ric === "nessuna") ? "none" : "";
}

function toggleDataFineEditRow() {
    const ric = document.getElementById("ricorrenzaPromEdit").value;
    document.getElementById("dataFinePromEditRow").style.display = (ric === "nessuna") ? "none" : "";
}

async function addPromemoria() {
    const descrizione = document.querySelector("#descrizioneProm").value.trim();
    const dataInizio  = document.querySelector("#dataInizioProm").value;
    let durataMin     = document.querySelector("#durataProm").value;
    let ora           = document.querySelector("#oraProm").value;
    const ricorrenza  = document.querySelector("#ricorrenza").value;
    let dataFine      = document.querySelector("#dataFineProm").value;

    if (!descrizione) { alert("Inserisci una descrizione"); return; }
    if (!dataInizio)  { alert("Inserisci una data"); return; }

    durataMin = (durataMin === "" || durataMin === "0") ? null : parseInt(durataMin, 10);
    ora       = (ora === "" || ora === "00:00")         ? null : ora;
    // La fine ricorrenza vale solo per le ricorrenti
    dataFine  = (ricorrenza === "nessuna" || dataFine === "") ? null : dataFine;

    if (dataFine && dataFine < dataInizio) {
        alert("La data di fine non può precedere la data di inizio");
        return;
    }

    try {
        const res  = await fetch(url + "/promemoria.php", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ descrizione, dataInizio, durataMin, ora, ricorrenza, dataFine })
        });
        const data = await res.json();

        if (data.code === 1) {
            alert("Promemoria aggiunto");
            document.querySelector("#descrizioneProm").value = "";
            document.querySelector("#dataInizioProm").value  = "";
            document.querySelector("#oraProm").value         = "";
            document.querySelector("#durataProm").value      = "";
            document.querySelector("#ricorrenza").value      = "nessuna";
            document.querySelector("#dataFineProm").value    = "";
            toggleDataFineRow();
            await loadData();
        } else {
            alert(data.desc || "Fallito");
        }
    } catch (err) {
        console.error(err);
    }
}

async function deletePromemoria(id, data = null, ora = null, durata = null) {
    let pData;
    try {
        const p = await fetch(url + `/promemoria.php?id=${id}`);
        pData = await p.json();
    } catch (err) {
        console.error(err);
        alert("Errore di rete");
        return;
    }

    let needConfirm = true;

    if (pData.ricorrenza !== "nessuna") {
        const choice = await askDeleteMode();
        if (!choice) return;

        if (choice === "single") {
            try {
                const res = await fetch(url + "/promemoriaEccezioni.php", {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ id, data, ora, durata, cancellato: true })
                });
                const result = await res.json();
                if (result.code === 1) {
                    alert("Promemoria cancellato");
                    await loadData();
                    closeModal("eventsModal");
                } else {
                    alert(result.message || result.desc || "Errore cancellazione");
                }
            } catch (err) {
                console.error(err);
                alert("Errore di rete");
            }
            return;
        }
        needConfirm = false;
    }

    if (needConfirm && !confirm("Vuoi cancellare questo promemoria?")) return;

    try {
        const res    = await fetch(url + "/promemoria.php?id=" + encodeURIComponent(id), {
            method:  "DELETE",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ id })
        });
        const result = await res.json();
        if (result.code === 1) {
            alert("Promemoria cancellato");
            await loadData();
            closeModal("eventsModal");
        } else {
            alert(result.message || result.desc || "Errore cancellazione");
        }
    } catch (err) {
        console.error(err);
        alert("Errore di rete");
    }
}

async function showEditPromemoria(id, dateYMD, originalDate = null) {
    let pData;
    try {
        const res = await fetch(`${url}/promemoria.php?id=${id}`);
        pData = await res.json();
    } catch (err) {
        console.error(err);
        alert("Errore nel caricamento del promemoria");
        return;
    }

    if (!pData || pData.code === 0) { alert("Promemoria non trovato"); return; }

    currentEditPromId          = id;
    currentEditPromData        = pData;
    currentEditPromIsRecurring = pData.ricorrenza && pData.ricorrenza !== "nessuna";

    if (currentEditPromIsRecurring) {
        const choice = await askEditMode();
        if (!choice) return;

        if (choice === "single") {
            const eccDate = originalDate || dateYMD;
            currentEditPromDate = eccDate;
            const existingEcc = eccezioniData.find(e =>
                Number(e.idPromemoria) === Number(id) &&
                e.data === eccDate &&
                Number(e.cancellato) === 0
            );
            currentEditPromExistingNuovaData = existingEcc ? (existingEcc.nuovaData || null) : null;
            const displayData = existingEcc ? {
                ...pData,
                descrizione: existingEcc.descrizione    || pData.descrizione,
                ora:         existingEcc.nuovaOra       || pData.ora,
                durataMin:   existingEcc.nuovaDurataMin || pData.durataMin,
                _nuovaData:  existingEcc.nuovaData      || null
            } : pData;
            _openPromemoriaEditForm(displayData, false);
        } else {
            currentEditPromDate              = null;
            currentEditPromExistingNuovaData = null;
            _openPromemoriaEditForm(pData, true);
        }
    } else {
        currentEditPromDate = null;
        _openPromemoriaEditForm(pData, true);
    }
}

function _openPromemoriaEditForm(pData, showRicorrenza) {
    const title      = document.getElementById("editPromTitle");
    const descrInput = document.getElementById("descrizionePromEdit");
    const dataInput  = document.getElementById("dataInizioPromEdit");
    const oraInput   = document.getElementById("oraPromEdit");
    const durataInput= document.getElementById("durataPromEdit");
    const ricRow     = document.getElementById("ricorrenzaPromEditRow");
    const ricSelect  = document.getElementById("ricorrenzaPromEdit");
    const fineRow    = document.getElementById("dataFinePromEditRow");
    const fineInput  = document.getElementById("dataFinePromEdit");

    title.textContent = currentEditPromDate ? "Modifica questa occorrenza" : "Modifica tutta la serie";

    descrInput.value  = pData.descrizione || "";
    const dataBase    = pData._nuovaData || currentEditPromDate || (pData.dataInizio ? pData.dataInizio.split("T")[0].split(" ")[0] : "");
    dataInput.value   = dataBase;
    oraInput.value    = pData.ora ? pData.ora.substring(0, 5) : "";
    durataInput.value = pData.durataMin || "";

    ricRow.style.display = showRicorrenza ? "" : "none";
    if (showRicorrenza) ricSelect.value = pData.ricorrenza || "nessuna";

    // Fine ricorrenza: visibile solo quando si modifica l'intera serie ricorrente
    const ricEff = pData.ricorrenza && pData.ricorrenza !== "nessuna";
    fineInput.value = pData.dataFine ? pData.dataFine.split("T")[0].split(" ")[0] : "";
    fineRow.style.display = (showRicorrenza && ricEff) ? "" : "none";

    openModal("editPromemoriaDialog");
}

async function confirmUpdatePromemoria() {
    const descrizione = document.getElementById("descrizionePromEdit").value.trim();
    const dataInizio  = document.getElementById("dataInizioPromEdit").value;
    const ora         = document.getElementById("oraPromEdit").value || null;
    const durataMin   = document.getElementById("durataPromEdit").value !== ""
                        ? parseInt(document.getElementById("durataPromEdit").value, 10) : null;
    const ricSelect   = document.getElementById("ricorrenzaPromEdit");

    if (!descrizione) { alert("Inserisci una descrizione"); return; }
    if (!dataInizio)  { alert("Inserisci una data"); return; }

    try {
        if (currentEditPromDate !== null) {
            const nuovaData = dataInizio !== currentEditPromDate ? dataInizio : null;

            if (nuovaData && nuovaData !== currentEditPromExistingNuovaData &&
                currentEditPromData &&
                isNaturalOccurrence(currentEditPromData.ricorrenza, currentEditPromData.dataInizio, nuovaData)) {
                alert("La data scelta coincide già con un'altra occorrenza di questo promemoria.\nScegli una data diversa.");
                return;
            }

            const res = await fetch(url + "/promemoriaEccezioni.php", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    id:          currentEditPromId,
                    data:        currentEditPromDate,
                    nuovaData:   nuovaData,
                    ora:         ora    || "",
                    durata:      durataMin != null ? durataMin : "",
                    descrizione: descrizione,
                    cancellato:  false
                })
            });
            const result = await res.json();
            if (result.code === 1) {
                closeModal("editPromemoriaDialog");
                closeModal("eventsModal");
                await loadData();
            } else {
                alert(result.desc || "Errore nel salvataggio");
            }
        } else {
            const ricVal   = ricSelect.value;
            let dataFineVal = document.getElementById("dataFinePromEdit").value;
            dataFineVal = (ricVal === "nessuna" || dataFineVal === "") ? null : dataFineVal;

            if (dataFineVal && dataFineVal < dataInizio) {
                alert("La data di fine non può precedere la data di inizio");
                return;
            }

            const res = await fetch(url + "/promemoria.php", {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    id: currentEditPromId,
                    descrizione,
                    dataInizio,
                    ora:        ora || null,
                    durataMin,
                    ricorrenza: ricVal,
                    dataFine:   dataFineVal
                })
            });
            const result = await res.json();
            if (result.code === 1) {
                closeModal("editPromemoriaDialog");
                closeModal("eventsModal");
                await loadData();
            } else {
                alert(result.desc || "Errore nel salvataggio");
            }
        }
    } catch (err) {
        console.error(err);
        alert("Errore di rete");
    }
}
