function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (modal.classList.contains("hidden")) topZIndex += 2;
    modal.style.zIndex = topZIndex;
    modal.classList.remove("hidden");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("hidden");
    if (id === "eventsModal") resetEventsModal();
    if (id === "editDialog")  resetEditDialog();
}

function resetEventsModal() {
    const divn     = document.getElementById("nessuna");
    const listP    = document.getElementById("promemorieList");
    const listA    = document.getElementById("appuntamentiList");
    const sectionP = document.getElementById("promemorieSection");
    const sectionA = document.getElementById("appuntamentiSection");
    const dateTitle= document.getElementById("modalDate");

    if (divn)      divn.innerHTML = "";
    if (listP)     listP.innerHTML = "";
    if (listA)     listA.innerHTML = "";
    if (sectionP)  sectionP.style.display = "none";
    if (sectionA)  sectionA.style.display = "none";
    if (dateTitle) dateTitle.textContent = "";
}

function resetEditDialog() {
    currentEditId = null;
    const descrizione = document.getElementById("descrizioneAppEdit");
    const dataInizio  = document.getElementById("dataInizioAppEdit");
    const durata      = document.getElementById("durataAppEdit");
    if (descrizione) descrizione.value = "";
    if (dataInizio)  dataInizio.value  = "";
    if (durata)      durata.value      = "";
    clearUserSelection();
}

function initModalSystem() {
    const saveEditBtn = document.getElementById("saveEditBtn");
    if (saveEditBtn) {
        saveEditBtn.addEventListener("click", async () => {
            if (currentEditId != null) await updateAppuntamento(currentEditId);
        });
    }

    const cancelEditBtn = document.getElementById("cancelEditBtn");
    if (cancelEditBtn) cancelEditBtn.addEventListener("click", () => closeModal("editDialog"));

    const deleteCancelBtn = document.getElementById("deleteCancelBtn");
    if (deleteCancelBtn) deleteCancelBtn.addEventListener("click", () => closeModal("deleteDialog"));

    const saveEditPromBtn = document.getElementById("saveEditPromBtn");
    if (saveEditPromBtn) {
        saveEditPromBtn.addEventListener("click", async () => await confirmUpdatePromemoria());
    }

    const cancelEditPromBtn = document.getElementById("cancelEditPromBtn");
    if (cancelEditPromBtn) cancelEditPromBtn.addEventListener("click", () => closeModal("editPromemoriaDialog"));
}

function showUtenti()  { openModal("utenti_Modal"); }
function closeUtenti() { closeModal("utenti_Modal"); }

function askDeleteMode() {
    return new Promise(resolve => {
        const dialog    = document.getElementById("deleteDialog");
        const singleBtn = document.getElementById("deleteSingleBtn");
        const allBtn    = document.getElementById("deleteAllBtn");
        const cancelBtn = document.getElementById("deleteCancelBtn");

        openModal("deleteDialog");

        const cleanup = () => {
            closeModal("deleteDialog");
            singleBtn.onclick = null;
            allBtn.onclick    = null;
            cancelBtn.onclick = null;
        };

        singleBtn.onclick = () => { cleanup(); resolve("single"); };
        allBtn.onclick    = () => { cleanup(); resolve("all"); };
        cancelBtn.onclick = () => { cleanup(); resolve(null); };
    });
}

function askEditMode() {
    return new Promise(resolve => {
        const dialog    = document.getElementById("deleteDialog");
        const titleEl   = dialog.querySelector("h3");
        const descEl    = dialog.querySelector("p");
        const singleBtn = document.getElementById("deleteSingleBtn");
        const allBtn    = document.getElementById("deleteAllBtn");
        const cancelBtn = document.getElementById("deleteCancelBtn");

        const origTitle  = titleEl.textContent;
        const origDesc   = descEl.textContent;
        const origSingle = singleBtn.textContent;
        const origAll    = allBtn.textContent;

        titleEl.textContent   = "Modifica promemoria ricorrente";
        descEl.textContent    = "Vuoi modificare solo questa occorrenza o tutta la serie?";
        singleBtn.textContent = "Solo questa";
        allBtn.textContent    = "Tutta la serie";

        openModal("deleteDialog");

        const cleanup = () => {
            closeModal("deleteDialog");
            titleEl.textContent   = origTitle;
            descEl.textContent    = origDesc;
            singleBtn.textContent = origSingle;
            allBtn.textContent    = origAll;
            singleBtn.onclick = null;
            allBtn.onclick    = null;
            cancelBtn.onclick = null;
        };

        singleBtn.onclick = () => { cleanup(); resolve("single"); };
        allBtn.onclick    = () => { cleanup(); resolve("all"); };
        cancelBtn.onclick = () => { cleanup(); resolve(null); };
    });
}
