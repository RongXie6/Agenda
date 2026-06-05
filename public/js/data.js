async function loadData() {
    try {
        const res  = await fetch(url + "/account.php");
        const data = await res.json();

        if (data.code === 1) {
            const ciao = document.querySelector("#ciao");
            ciao.innerHTML = "";

            const h2 = document.createElement("h2");
            h2.textContent = "Ciao, " + data.username;

            const btnDiv     = document.createElement("div");
            const invitiBtn  = document.createElement("button");
            invitiBtn.id        = "invitiBtn";
            invitiBtn.textContent = "Inviti";
            invitiBtn.onclick   = apriInviti;
            const profiloBtn = document.createElement("button");
            profiloBtn.textContent = "Profilo";
            profiloBtn.onclick     = profilo;
            const logoutBtn  = document.createElement("button");
            logoutBtn.textContent = "Logout";
            logoutBtn.onclick     = logout;
            btnDiv.appendChild(invitiBtn);
            btnDiv.appendChild(profiloBtn);
            btnDiv.appendChild(logoutBtn);

            ciao.appendChild(h2);
            ciao.appendChild(btnDiv);
        } else {
            window.location.replace("login.html");
            return;
        }
    } catch (err) {
        console.error(err);
        return;
    }

    try {
        const excRes = await fetch(url + "/promemoriaEccezioni.php");
        eccezioniData = await excRes.json();

        const promRes = await fetch(url + "/promemoria.php");
        promData = await promRes.json();

        const appRes = await fetch(url + "/appuntamento.php");
        appData = await appRes.json();

        await loadPersone();
        renderCalendarData();
        controllaEventi();
        aggiornaBadgeInviti();
    } catch (err) {
        console.error(err);
    }
}

async function loadPersone() {
    try {
        listUtenti = document.getElementById("list_utenti");
        listUtenti.innerHTML = "";

        const res = await fetch(url + "/persone.php");
        personeData = await res.json();

        for (const p of personeData) {
            const row   = document.createElement("div");
            const input = document.createElement("input");
            const label = document.createElement("label");

            input.type      = "checkbox";
            input.className = "userCheckbox";
            input.value     = p.id;
            input.id        = "cb_u" + p.id;

            const displayName = ((p.nome || "") + " " + (p.cognome || "")).trim() || p.username;
            label.innerText = displayName;
            label.id        = "u" + p.id;
            label.htmlFor   = input.id;

            row.appendChild(input);
            row.appendChild(label);
            listUtenti.appendChild(row);
        }
    } catch (err) {
        console.error(err);
    }
}

async function logout() {
    try {
        const res  = await fetch(url + "/account.php", { method: "DELETE" });
        const data = await res.json();
        if (data.code === 1) window.location.replace("login.html");
    } catch (err) {
        console.error(err);
    }
}
