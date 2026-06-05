const VERIFICA_API = "http://127.0.0.1/agendaX/api/animali.php";
const VERIFICA_IMG = "http://127.0.0.1/agendaX/public/img/animali/";

let animals = [];
let verifica = [];
let tipoCorrente = "";
let verificato = false;

// ── Verifica animali ─────────────────────────────────────────
async function caricaVerifica() {
    const grid    = document.getElementById("verifica-grid");
    const titolo  = document.getElementById("verifica-titolo");
    const msg     = document.getElementById("verifica-msg");
    const loginBtn = document.getElementById("loginBtn");

    grid.innerHTML = "";
    animals = [];
    verifica = [];
    verificato = false;
    loginBtn.disabled = true;
    msg.textContent = "";

    try {
        const res  = await fetch(VERIFICA_API);
        const data = await res.json();

        data.forEach(element => {
            animals.push(element);

            const div = document.createElement("div");
            div.className = "verifica-cell";
            div.dataset.type  = element.type;
            div.dataset.image = element.image;

            const img = document.createElement("img");
            img.src = VERIFICA_IMG + element.image;
            img.draggable = false;

            div.onclick = seleziona;
            div.appendChild(img);
            grid.appendChild(div);
        });

        const idx = Math.floor(Math.random() * data.length);
        tipoCorrente = data[idx].type;
        titolo.textContent = `Seleziona tutte le immagini di tipo: ${tipoCorrente}`;
    } catch (err) {
        titolo.textContent = "Verifica non disponibile — procedi comunque.";
        verificato = true;
        document.getElementById("loginBtn").disabled = false;
        console.error(err);
    }
}

function seleziona() {
    const img = this.firstElementChild;
    if (this.classList.contains("selezionato")) {
        this.classList.remove("selezionato");
        img.classList.remove("selected");
        const overlay = this.querySelector(".foreground");
        if (overlay) overlay.remove();
        verifica = verifica.filter(e => e !== this);
    } else {
        this.classList.add("selezionato");
        img.classList.add("selected");
        verifica.push(this);

        const fg = document.createElement("img");
        fg.src = VERIFICA_IMG + "selected.png";
        fg.className = "foreground";
        this.appendChild(fg);
    }
}

function confronta() {
    const msg    = document.getElementById("verifica-msg");
    const totale = animals.filter(a => a.type === tipoCorrente).length;

    for (const el of verifica) {
        if (el.dataset.type !== tipoCorrente) {
            msg.textContent = "❌ Selezione errata. Riprova.";
            msg.className   = "verifica-msg error";
            ripristina();
            return;
        }
    }

    if (verifica.length >= totale) {
        msg.textContent = "✅ Verifica superata!";
        msg.className   = "verifica-msg success";
        verificato      = true;
        document.getElementById("loginBtn").disabled = false;
        document.getElementById("verificaBtn").disabled = true;
    } else {
        msg.textContent = "❌ Non hai selezionato tutte le immagini. Riprova.";
        msg.className   = "verifica-msg error";
        ripristina();
    }
}

function ripristina() {
    verifica.forEach(div => {
        div.classList.remove("selezionato");
        const img = div.querySelector("img");
        if (img) img.classList.remove("selected");
        const overlay = div.querySelector(".foreground");
        if (overlay) overlay.remove();
    });
    verifica = [];
}

// ── Login ─────────────────────────────────────────────────────
async function login() {
    if (!verificato) {
        const msg = document.getElementById("message");
        msg.textContent = "Completa prima la verifica delle immagini.";
        msg.className   = "error";
        return;
    }

    const mail     = document.getElementById('mail').value.trim();
    const password = document.getElementById('password').value;
    const message  = document.getElementById('message');

    try {
        const res  = await fetch('../api/account.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ mail, password })
        });
        const data = await res.json();

        message.textContent = data.desc || 'Risposta ricevuta';

        if (data.code === 1) {
            window.location.href = 'index.html';
        } else {
            message.className = "error";
            // Login fallito: resetta la verifica e ricarica nuove immagini
            verificato = false;
            document.getElementById("verificaBtn").disabled = false;
            caricaVerifica();
        }
    } catch (err) {
        message.textContent = 'Errore di rete';
        message.className   = "error";
    }
}

window.onload = caricaVerifica;
