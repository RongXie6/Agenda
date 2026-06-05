/* ============================================================
   registrazione.js  –  Validazione lato client + invio form
   ============================================================ */

// ── Forza visiva della password ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const pwdInput = document.getElementById('password');
    if (pwdInput) {
        pwdInput.addEventListener('input', aggiornaStrength);
    }
});

function aggiornaStrength() {
    const val   = document.getElementById('password').value;
    const fill  = document.getElementById('strength-fill');
    const label = document.getElementById('strength-label');
    const score = calcolaStrength(val);

    const livelli = [
        { pct: '0%',   color: '#eee',    testo: '' },
        { pct: '25%',  color: '#e74c3c', testo: 'Molto debole' },
        { pct: '50%',  color: '#e67e22', testo: 'Debole' },
        { pct: '75%',  color: '#f1c40f', testo: 'Discreta' },
        { pct: '100%', color: '#27ae60', testo: 'Forte' },
    ];

    const liv = livelli[score];
    fill.style.width      = liv.pct;
    fill.style.background = liv.color;
    label.textContent     = liv.testo;
    label.style.color     = liv.color;
}

function calcolaStrength(pwd) {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8)               score++;
    if (/[A-Z]/.test(pwd))             score++;
    if (/[0-9]/.test(pwd))             score++;
    if (/[^A-Za-z0-9]/.test(pwd))      score++;
    return score;
}

// ── Utility validazione ──────────────────────────────────────
function mostraErrore(id, testo) {
    const el = document.getElementById('err-' + id);
    const input = document.getElementById(id === 'conferma' ? 'confermaPassword'
                                        : id === 'username'  ? 'userName'
                                        : id);
    if (el) { el.textContent = testo; el.classList.add('visible'); }
    if (input) input.classList.add('error');
}

function pulisciErrore(id) {
    const el = document.getElementById('err-' + id);
    const input = document.getElementById(id === 'conferma' ? 'confermaPassword'
                                        : id === 'username'  ? 'userName'
                                        : id);
    if (el) { el.textContent = ''; el.classList.remove('visible'); }
    if (input) { input.classList.remove('error'); input.classList.add('ok'); }
}

function pulisciTutto() {
    ['username', 'mail', 'password', 'conferma', 'nome', 'cognome'].forEach(id => {
        const el = document.getElementById('err-' + id);
        const inputId = id === 'conferma' ? 'confermaPassword'
                      : id === 'username'  ? 'userName'
                      : id;
        const input = document.getElementById(inputId);
        if (el)    { el.textContent = ''; el.classList.remove('visible'); }
        if (input) { input.classList.remove('error', 'ok'); }
    });
}

function validaForm(username, password, conferma, mail) {
    let valido = true;

    // Username
    if (username === '') {
        mostraErrore('username', 'Lo username è obbligatorio.');
        valido = false;
    } else if (username.length < 3) {
        mostraErrore('username', 'Almeno 3 caratteri.');
        valido = false;
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
        mostraErrore('username', 'Solo lettere, numeri, _ . -');
        valido = false;
    } else {
        pulisciErrore('username');
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (mail === '') {
        mostraErrore('mail', "L'email è obbligatoria.");
        valido = false;
    } else if (!emailRegex.test(mail)) {
        mostraErrore('mail', 'Inserisci un indirizzo email valido.');
        valido = false;
    } else {
        pulisciErrore('mail');
    }

    // Password
    if (password === '') {
        mostraErrore('password', 'La password è obbligatoria.');
        valido = false;
    } else if (password.length < 8) {
        mostraErrore('password', 'Almeno 8 caratteri.');
        valido = false;
    } else {
        pulisciErrore('password');
    }

    // Conferma password
    if (conferma === '') {
        mostraErrore('conferma', 'Conferma la password.');
        valido = false;
    } else if (password !== conferma) {
        mostraErrore('conferma', 'Le password non coincidono.');
        valido = false;
    } else {
        pulisciErrore('conferma');
    }

    return valido;
}

// ── Funzione principale ──────────────────────────────────────
async function registra() {
    const username = document.getElementById('userName').value.trim();
    const password = document.getElementById('password').value;          // NON trim: spazi nella pwd sono validi
    const conferma = document.getElementById('confermaPassword').value;
    const mail     = document.getElementById('mail').value.trim();
    const nome     = document.getElementById('nome').value.trim();
    const cognome  = document.getElementById('cognome').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const msgEl    = document.getElementById('message');
    const btn      = document.getElementById('invia');

    // Reset stato
    pulisciTutto();
    msgEl.className  = '';
    msgEl.textContent = '';
    msgEl.style.display = 'none';

    // Validazione
    if (!validaForm(username, password, conferma, mail)) return;

    // Disabilita pulsante durante la richiesta
    btn.disabled     = true;
    btn.textContent  = 'Registrazione in corso…';

    try {
        const res = await fetch('../api/account.php', {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password, mail, nome, cognome, telefono })
        });

        if (!res.ok) {
            throw new Error('Errore server: ' + res.status);
        }

        const data = await res.json();

        msgEl.textContent = data.desc || 'Richiesta completata';
        msgEl.className   = data.code === 1 ? 'success' : 'error';
        msgEl.style.display = 'block';

        if (data.code === 1) {
            // Registrazione ok → redirect dopo 1 s
            setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        } else {
            btn.disabled    = false;
            btn.textContent = 'Crea account';
        }

    } catch (err) {
        msgEl.textContent   = 'Errore di rete. Riprova più tardi.';
        msgEl.className     = 'error';
        msgEl.style.display = 'block';
        btn.disabled        = false;
        btn.textContent     = 'Crea account';
    }
}
