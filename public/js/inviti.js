// Aggiorna il badge col numero di inviti in attesa sul pulsante "Inviti"
async function aggiornaBadgeInviti() {
    const btn = document.getElementById("invitiBtn");
    if (!btn) return;
    try {
        const res = await fetch(url + "/inviti.php");
        const inviti = await res.json();
        const n = Array.isArray(inviti) ? inviti.length : 0;
        btn.textContent = n > 0 ? `Inviti (${n})` : "Inviti";
    } catch (err) {
        console.error(err);
    }
}

// Apre il modale e carica la lista degli inviti
async function apriInviti() {
    const list = document.getElementById("invitiList");
    list.innerHTML = "<p>Caricamento...</p>";
    openModal("invitiModal");

    let inviti;
    try {
        const res = await fetch(url + "/inviti.php");
        inviti = await res.json();
    } catch (err) {
        console.error(err);
        list.innerHTML = "<p>Errore di rete</p>";
        return;
    }

    if (!Array.isArray(inviti) || inviti.length === 0) {
        list.innerHTML = "<p>Nessun invito in attesa</p>";
        return;
    }

    list.innerHTML = "";
    inviti.forEach(inv => {
        const div = document.createElement("div");
        div.className = "event-item";

        const info = document.createElement("div");
        info.className = "event-info";

        const desc = document.createElement("span");
        desc.textContent = inv.descrizione;
        info.appendChild(desc);

        const orario = document.createElement("small");
        orario.className = "event-orario";
        const dt = parseLocalDate(inv.dataInizio);
        orario.textContent = "🕐 " + (dt ? formatYMD(dt) + " " + formatHM(dt) : inv.dataInizio);
        info.appendChild(orario);

        if (inv.partecipanti) {
            const part = document.createElement("small");
            part.className = "event-partecipanti";
            part.textContent = "👥 " + inv.partecipanti;
            info.appendChild(part);
        }

        const actions = document.createElement("div");
        actions.className = "delete-dialog-actions";

        const okBtn = document.createElement("button");
        okBtn.className = "btn btn-warning";
        okBtn.textContent = "Accetta";
        okBtn.onclick = () => rispondiInvito(inv.id, "accetta");

        const noBtn = document.createElement("button");
        noBtn.className = "btn btn-danger";
        noBtn.textContent = "Rifiuta";
        noBtn.onclick = () => rispondiInvito(inv.id, "rifiuta");

        actions.appendChild(okBtn);
        actions.appendChild(noBtn);

        div.appendChild(info);
        div.appendChild(actions);
        list.appendChild(div);
    });
}

// Accetta o rifiuta un invito
async function rispondiInvito(idAppuntamento, azione) {
    try {
        const res = await fetch(url + "/inviti.php", {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ idAppuntamento, azione })
        });
        const data = await res.json();

        if (data.code === 1) {
            await apriInviti();          // ricarica la lista nel modale
            await loadData();            // aggiorna calendario e badge
        } else {
            alert(data.desc || "Operazione non riuscita");
        }
    } catch (err) {
        console.error(err);
        alert("Errore di rete");
    }
}
