async function fetchProfile() {
    try {
        const res = await fetch('../api/profilo.php');
        const data = await res.json();
        if (data.code !== 1) {
            window.location.href = 'login.html';
            return;
        }
        document.getElementById('nome').value     = data.utente.nome     || '';
        document.getElementById('cognome').value  = data.utente.cognome  || '';
        document.getElementById('username').value = data.utente.username || '';
        document.getElementById('mail').value     = data.utente.mail     || '';
        document.getElementById('telefono').value = data.utente.telefono || '';
    } catch (err) {
        console.error(err);
        window.location.href = 'login.html';
    }
}

function mostraMessaggio(testo, tipo) {
    const el = document.getElementById('message');
    if (!el) return;
    el.textContent  = testo;
    el.className    = tipo; // 'success' o 'error'
    el.style.display = 'block';
}

async function salvaProfilo() {
    const nome     = document.getElementById('nome').value.trim();
    const cognome  = document.getElementById('cognome').value.trim();
    const username = document.getElementById('username').value.trim();
    const mail     = document.getElementById('mail').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const password = document.getElementById('password').value;  // NON trim: gli spazi nella pwd sono validi
    const conferma = document.getElementById('confermaPassword')
                     ? document.getElementById('confermaPassword').value
                     : password; // compatibilità se il campo non esiste

    // ── Validazione lato client ──────────────────────────────
    if (!mail || !username) {
        mostraMessaggio('Email e username sono obbligatori.', 'error');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
        mostraMessaggio('Inserisci un indirizzo email valido.', 'error');
        return;
    }

    if (username.length < 3) {
        mostraMessaggio('Lo username deve avere almeno 3 caratteri.', 'error');
        return;
    }

    if (password !== '') {
        if (password.length < 8) {
            mostraMessaggio('La password deve avere almeno 8 caratteri.', 'error');
            return;
        }
        if (password !== conferma) {
            mostraMessaggio('Le password non coincidono.', 'error');
            return;
        }
    }

    // ── Invio al server ──────────────────────────────────────
    const payload = { nome, cognome, username, mail, telefono };
    if (password !== '') payload.password = password;   // invia solo se compilata

    try {
        const res  = await fetch('../api/profilo.php', {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.code === 1) {
            mostraMessaggio(data.desc || 'Profilo aggiornato', 'success');
            // Pulisce il campo password dopo il salvataggio riuscito
            document.getElementById('password').value = '';
            if (document.getElementById('confermaPassword')) {
                document.getElementById('confermaPassword').value = '';
            }
        } else {
            mostraMessaggio(data.desc || 'Errore durante il salvataggio.', 'error');
        }
    } catch (err) {
        console.error(err);
        mostraMessaggio('Errore di rete. Riprova più tardi.', 'error');
    }
}

function annulla() {
    window.location.href = 'index.html';
}

window.addEventListener('DOMContentLoaded', fetchProfile);
