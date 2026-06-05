function getSelectedUserIds() {
    return Array.from(document.querySelectorAll(".userCheckbox"))
        .filter(cb => cb.checked)
        .map(cb => cb.value);
}

function clearUserSelection() {
    document.querySelectorAll(".userCheckbox").forEach(cb => { cb.checked = false; });
}

function setSelectedUsers(userIds) {
    clearUserSelection();
    userIds.forEach(id => {
        const cb = document.querySelector(`.userCheckbox[value="${id}"]`);
        if (cb) cb.checked = true;
    });
}

async function checkUsersAvailability(selectedUserIds, dataInizio, durataMin, excludeAppuntamentoId = null) {
    const dataI    = parseLocalDate(dataInizio);
    const dataFine = new Date(dataI.getTime() + durataMin * 60000);
    const utentiC  = [];

    const res          = await fetch(`${url}/appuntamento.php?utenti=${selectedUserIds.join(',')}`);
    const appuntamenti = await res.json();

    for (const a of appuntamenti) {
        if (excludeAppuntamentoId != null && String(a.id) === String(excludeAppuntamentoId)) continue;

        const inizioEsistente = parseLocalDate(a.dataInizio);
        const fineEsistente   = new Date(inizioEsistente.getTime() + (parseInt(a.durataMin || 0, 10) * 60000));

        if (dataI < fineEsistente && dataFine > inizioEsistente) {
            const labelU = document.querySelector("#u" + a.idPersona);
            if (labelU && !utentiC.includes(labelU.innerText)) utentiC.push(labelU.innerText);
        }
    }
    return utentiC;
}

async function addAppuntamento() {
    const descrizione = document.querySelector("#descrizioneApp").value.trim();
    const dataInizio  = document.querySelector("#dataInizioApp").value;
    let durataMin     = document.querySelector("#durataApp").value;

    if (!descrizione) { alert("Inserisci una descrizione"); return; }
    if (!dataInizio)  { alert("Inserisci data e ora"); return; }

    durataMin = (durataMin === "" || durataMin === "0") ? 0 : parseInt(durataMin, 10);

    const utentiIds = getSelectedUserIds();
    if (utentiIds.length === 0) { alert("Seleziona almeno un utente"); return; }

    try {
        const utentiC = await checkUsersAvailability(utentiIds, dataInizio, durataMin);
        if (utentiC.length > 0) {
            alert("I seguenti utenti non sono liberi:\n" + utentiC.join("\n"));
            return;
        }

        const res  = await fetch(url + "/appuntamento.php", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ descrizione, dataInizio, durataMin, utenti: utentiIds })
        });
        const data = await res.json();

        if (data.code === 1) {
            alert("Appuntamento aggiunto");
            document.querySelector("#descrizioneApp").value = "";
            document.querySelector("#dataInizioApp").value  = "";
            document.querySelector("#durataApp").value      = "";
            clearUserSelection();
            closeModal("utenti_Modal");
            await loadData();
        } else {
            alert(data.desc || "Fallito");
        }
    } catch (err) {
        console.error(err);
        alert("Errore di rete");
    }
}

async function deleteAppuntamento(id) {
    if (!confirm("Vuoi cancellare questo appuntamento?")) return;

    try {
        const res  = await fetch(url + "/appuntamento.php?id=" + encodeURIComponent(id), {
            method:  "DELETE",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ id })
        });
        const data = await res.json();

        if (data.code === 1) {
            alert("Appuntamento cancellato");
            await loadData();
            closeModal("eventsModal");
        } else {
            alert(data.message || data.desc || "Errore cancellazione");
        }
    } catch (err) {
        console.error(err);
        alert("Errore di rete");
    }
}

async function showEdit(id) {
    let appDetail;
    try {
        const res = await fetch(`${url}/appuntamento.php?id=${id}`);
        appDetail = await res.json();
    } catch (err) {
        console.error(err);
        return;
    }

    if (!appDetail || appDetail.code === 0) return;

    currentEditId = id;
    document.getElementById("descrizioneAppEdit").value = appDetail.descrizione || "";
    document.getElementById("dataInizioAppEdit").value  = toDatetimeLocalValue(appDetail.dataInizio);
    document.getElementById("durataAppEdit").value      = appDetail.durataMin || 0;

    setSelectedUsers((appDetail.utenti || []).map(u => String(u.id)));
    openModal("editDialog");
}

async function updateAppuntamento(id) {
    const editDialog  = document.getElementById("editDialog");
    const descrizione = editDialog.querySelector("#descrizioneAppEdit").value.trim();
    const dataInizio  = editDialog.querySelector("#dataInizioAppEdit").value;
    let durataMin     = editDialog.querySelector("#durataAppEdit").value;

    if (!descrizione) { alert("Inserisci una descrizione"); return; }
    if (!dataInizio)  { alert("Inserisci data e ora"); return; }

    durataMin = (durataMin === "" || durataMin === "0") ? 0 : parseInt(durataMin, 10);

    const utentiIds = getSelectedUserIds();
    if (utentiIds.length === 0) { alert("Seleziona almeno un utente"); return; }

    try {
        const utentiC = await checkUsersAvailability(utentiIds, dataInizio, durataMin, id);
        if (utentiC.length > 0) {
            alert("I seguenti utenti non sono liberi:\n" + utentiC.join("\n"));
            return;
        }

        const res  = await fetch(url + "/appuntamento.php", {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ id, descrizione, dataInizio, durataMin, utenti: utentiIds })
        });
        const resU = await res.json();

        if (resU.code === 1) {
            alert("Appuntamento modificato");
            closeModal("editDialog");
            closeModal("utenti_Modal");
            await loadData();
        } else {
            alert(resU.message || resU.desc || "Errore modifica");
        }
    } catch (err) {
        console.error(err);
        alert("Errore di rete");
    }
}
