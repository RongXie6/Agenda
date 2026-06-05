# AgendaX 

**Gestione di un'agenda condivisa di promemoria e appuntamenti**

---

## 1. Introduzione

AgendaX è un'applicazione web per la gestione di un'agenda condivisa da più
persone. L'applicazione permette di registrare due tipi di voci:

- **Promemoria**: riferiti a una sola persona, eventualmente *ricorrenti*
  (settimanali, mensili, annuali).
- **Appuntamenti**: non ricorrenti, possono coinvolgere più persone registrate.
  Al momento della creazione il sistema verifica che tutti i partecipanti
  siano liberi.

Questo documento descrive le fasi che hanno portato alla realizzazione del
progetto e raccoglie tutte le ipotesi formulate in fase di analisi, in modo
che un utente esterno possa riprodurre l'intero percorso.

---

## 2. Tecnologie utilizzate

| Componente | Tecnologia |
|------------|------------|
| Database   | MySQL (via XAMPP) |
| Back-end   | PHP (API REST con PDO) |
| Front-end  | HTML, CSS, JavaScript (vanilla, nessun framework) |
| Server     | Apache (XAMPP) |

Il progetto utilizza un unico stack (PHP + JavaScript): non sono richiesti
processi o servizi esterni aggiuntivi, è sufficiente XAMPP.

---

## 3. Fasi di realizzazione

### Fase A — Analisi del problema
Lettura della traccia e individuazione delle entità principali (persone,
promemoria, appuntamenti) e delle operazioni richieste (registrazione,
modifica, cancellazione, visualizzazione per periodo). In questa fase sono
state formulate le ipotesi descritte nella sezione 6.

### Fase B — Schema concettuale (ER)
Progettazione del diagramma Entità-Relazione (file `SchemaConcettuale.md` e
`Schema ER.pdf`):
- Entità: **Persona**, **Promemoria**, **Appuntamento**, **PromemoriaEccezione**
- Associazioni: POSSIEDE (1:N), PARTECIPA (N:N), HA_ECCEZIONE (1:N)

### Fase C — Schema logico (relazionale)
Traduzione dell'ER nel modello relazionale (file `Schema logica.pdf`):
- L'associazione N:N tra Persona e Appuntamento è stata risolta con la
  tabella ponte **AppuntamentoPersona**.
- Le associazioni 1:N sono state tradotte con chiavi esterne.

### Fase D — Creazione del database
Creazione del database `Agenda` su MySQL tramite i due file:
- **`SchemaPerMySQL.sql`** — crea la struttura (tabelle, vincoli, chiavi esterne)
- **`DatiPerMySQL.sql`** — popola il database con dati di esempio

### Fase E — Back-end (API REST in PHP)
Sviluppo dei web service REST nella cartella `api/`. Ogni risorsa ha il suo
endpoint che risponde ai metodi HTTP (GET, POST, PUT, DELETE).

### Fase F — Front-end (client web)
Realizzazione dell'interfaccia utente nella cartella `public/`: calendario
mensile, modali per inserimento/modifica, ricerca, notifiche.

### Fase G — Test e rifinitura
Test delle API, correzione dei bug sulla logica di ricorrenza, gestione dei
casi limite (fine mese, anni bisestili), suddivisione del codice JS in moduli.

---

## 4. Struttura del progetto

```
agendaX/
├── index.php                 # reindirizza a public/login.html
├── SchemaPerMySQL.sql        # struttura del database
├── DatiPerMySQL.sql          # dati di esempio
├── SchemaConcettuale.md      # schema ER e logico
├── Documentazione.md         # questo documento
│
├── api/                      # back-end REST
│   ├── common/dbUtil.php     # connessione PDO al database
│   ├── account.php           # login, logout, registrazione, profilo
│   ├── persone.php           # elenco persone (per gli appuntamenti)
│   ├── profilo.php           # visualizzazione/modifica profilo
│   ├── promemoria.php        # CRUD promemoria
│   ├── promemoriaEccezioni.php # eccezioni alle ricorrenze
│   ├── appuntamento.php      # CRUD appuntamenti + verifica disponibilità
│   ├── inviti.php            # inviti agli appuntamenti (accetta/rifiuta)
│   └── animali.php           # immagini per la verifica in fase di login
│
└── public/                   # front-end
    ├── login.html / registrazione.html / profilo.html / index.html
    ├── css/                  # un foglio di stile per pagina
    └── js/
        ├── globals.js        # variabili globali condivise
        ├── utils.js          # funzioni di utilità (date, ricorrenza)
        ├── modal.js          # sistema delle finestre modali
        ├── notifiche.js      # notifiche del browser
        ├── data.js           # caricamento dati e sessione
        ├── promemoria.js     # logica promemoria
        ├── appuntamento.js   # logica appuntamenti
        ├── inviti.js         # gestione inviti (accetta/rifiuta)
        ├── calendar.js       # rendering del calendario
        ├── ricerca.js        # ricerca eventi
        └── index.js          # punto di avvio (window.onload)
```

---

## 5. API REST

Tutte le risposte sono in formato JSON. Le operazioni che richiedono
autenticazione verificano la presenza dell'utente in sessione (`$_SESSION`).

### account.php
| Metodo | Funzione |
|--------|----------|
| GET    | Stato della sessione (utente loggato?) |
| POST   | Login (email + password) |
| PUT    | Registrazione nuovo utente |
| PATCH  | Aggiornamento parziale del profilo |
| DELETE | Logout |

### promemoria.php
| Metodo | Funzione |
|--------|----------|
| GET    | Lista promemoria dell'utente (o singolo con `?id=`) |
| POST   | Crea un promemoria |
| PUT    | Modifica un promemoria |
| DELETE | Elimina un promemoria (e le sue eccezioni) |

### promemoriaEccezioni.php
| Metodo | Funzione |
|--------|----------|
| GET    | Eccezioni di un promemoria |
| POST   | Crea/aggiorna un'eccezione (modifica o cancella una singola occorrenza) |
| DELETE | Elimina un'eccezione |

### appuntamento.php
| Metodo | Funzione |
|--------|----------|
| GET    | Lista appuntamenti dell'utente (con campo `mioStato`); con `?utenti=` verifica disponibilità |
| POST   | Crea un appuntamento e invia gli inviti ai partecipanti |
| PUT    | Modifica un appuntamento |
| DELETE | Elimina un appuntamento |

### inviti.php
| Metodo | Funzione |
|--------|----------|
| GET    | Lista degli inviti in attesa di risposta per l'utente |
| PUT    | Accetta o rifiuta un invito (`azione = accetta \| rifiuta`) |

### persone.php
| Metodo | Funzione |
|--------|----------|
| GET    | Elenco delle persone registrate (per selezionare i partecipanti) |

### animali.php
| Metodo | Funzione |
|--------|----------|
| GET    | Restituisce 9 immagini casuali (con `type` e `image`) usate per la verifica in fase di login |

---

## 6. Scelte progettuali

La traccia non è esaustiva; sono state quindi adottate le seguenti scelte:

1. **Promemoria personali**: un promemoria appartiene a una sola persona ed è
   visibile/modificabile solo da essa.

2. **Ricorrenza**: i promemoria possono essere `nessuna`, `settimanale`,
   `mensile` o `annuale`. È stato aggiunto un campo opzionale **`dataFine`**
   per limitare la durata di una ricorrenza (NULL = senza fine).

3. **Eccezioni alle ricorrenze**: per modificare o cancellare una *singola*
   occorrenza di un promemoria ricorrente senza alterare l'intera serie è
   stata introdotta la tabella **PromemoriaEccezioni**. Ogni riga identifica
   l'occorrenza originale tramite il campo `data` e può:
   - spostarla (`nuovaData`, `nuovaOra`, `nuovaDurataMin`)
   - sovrascriverne la descrizione
   - cancellarla (`cancellato = 1`)

4. **Casi limite di ricorrenza**: per le ricorrenze mensili/annuali, se un mese
   non possiede il giorno di partenza (es. il 31 a febbraio, oppure il 29
   febbraio negli anni non bisestili), l'occorrenza viene mostrata sull'ultimo
   giorno disponibile del mese. Questa è la stessa convenzione usata dai
   principali calendari (Google Calendar, iOS).

5. **Appuntamenti con inviti**: non sono ricorrenti e possono coinvolgere più
   persone. Chi crea l'appuntamento ne è l'**organizzatore**; gli altri
   partecipanti ricevono un **invito** che devono accettare o rifiutare. Lo
   stato di ciascun partecipante è memorizzato nella tabella ponte
   `AppuntamentoPersona` nel campo `stato`:
   - `organizzatore` — chi ha creato l'appuntamento (accetta implicitamente)
   - `invitato` — invito in attesa di risposta
   - `accettato` — l'utente ha confermato la partecipazione
   - `rifiutato` — l'utente ha declinato (l'appuntamento sparisce dal suo calendario)

6. **Verifica di disponibilità**: si considera "occupato" solo chi ha
   `stato = accettato` o `organizzatore`. Le conseguenze:
   - Alla **creazione** dell'appuntamento si verifica solo che
     l'**organizzatore** sia libero (gli invitati decideranno in seguito).
   - Al momento in cui un invitato **accetta**, si verifica che non abbia un
     altro appuntamento sovrapposto: in caso di conflitto l'accettazione viene
     rifiutata.
   - Due appuntamenti si sovrappongono quando
     `inizioA < fineB AND fineA > inizioB`, dove la fine è calcolata come
     `dataInizio + durataMin`. Il controllo è effettuato **lato server**.

7. **Unicità**: i campi `email` e `username` sono univoci. Nome e cognome
   **non** sono univoci (più persone possono chiamarsi allo stesso modo).

8. **Sicurezza**:
   - Le password sono memorizzate con hash **bcrypt** (`password_hash`), mai in
     chiaro.
   - Tutte le query usano **prepared statement** (PDO) contro la SQL injection.
   - Ogni operazione verifica che la risorsa appartenga all'utente loggato.

9. **Periodo di visualizzazione**: il calendario mostra gli eventi mese per
   mese; la ricerca permette di filtrare gli eventi per parola chiave,
   ordinati per data.

---

## 7. Notifiche degli eventi imminenti

L'applicazione avvisa l'utente quando un evento sta per iniziare, utilizzando
le **notifiche native del browser** (Web Notifications API). Tutta la logica è
nel file `notifiche.js` e non richiede alcun servizio esterno.

**Funzionamento:**

1. All'avvio (`window.onload`) l'applicazione richiede all'utente il permesso
   di mostrare notifiche (`Notification.requestPermission()`).
2. Subito dopo il caricamento dei dati e poi **ogni 60 secondi**
   (`setInterval`), la funzione `controllaEventi()` analizza promemoria e
   appuntamenti del giorno.
3. Per ogni evento viene mostrata una notifica di sistema quando:
   - **Promemoria/appuntamento con orario**: mancano al massimo
     **15 minuti** (`ANTICIPO_MIN`) all'inizio.
   - **Promemoria senza orario**: alla prima verifica della giornata
     (notifica "tutto il giorno").
4. Per evitare notifiche duplicate, ogni evento già notificato viene registrato
   in un insieme (`notificheInviate`): nella stessa sessione non viene
   notificato due volte.

La logica tiene conto anche delle **ricorrenze** (usa la stessa funzione
`sameCalendarDay`) e delle **eccezioni** (occorrenze spostate o cancellate non
generano notifiche errate).

---

## 8. Verifica con immagini in fase di login

Per rendere l'accesso meno automatizzabile è stata aggiunta una semplice
verifica a immagini (in stile *CAPTCHA*) che l'utente deve superare **prima**
di poter effettuare il login. La logica si trova in `login.js`, mentre le
immagini sono fornite dall'endpoint `animali.php` (sezione 5).

**Funzionamento:**

1. All'apertura della pagina (`window.onload`) la funzione `caricaVerifica()`
   chiama `animali.php`, che legge l'elenco degli animali da `db.json`, lo
   mescola (`shuffle`) e restituisce **9 immagini** casuali. Ogni immagine ha
   un tipo (`type`, es. "gatto", "cane") e un nome file (`image`).
2. Le 9 immagini vengono disposte in una griglia. Tra i tipi presenti ne viene
   estratto **uno a caso** (`tipoCorrente`) e all'utente viene chiesto:
   *"Seleziona tutte le immagini di tipo: …"*.
3. L'utente seleziona/deseleziona le immagini con un clic (viene sovrapposta
   l'icona `selected.png`).
4. Premendo **"Verifica immagini"** la funzione `confronta()` controlla che:
   - nessuna immagine selezionata sia di tipo diverso da quello richiesto, **e**
   - siano state selezionate **tutte** le immagini di quel tipo presenti nella
     griglia.

   Solo se entrambe le condizioni sono soddisfatte la verifica è superata e il
   pulsante **"Accedi"** viene abilitato; in caso contrario la selezione viene
   azzerata e l'utente riprova.
5. Il login (`login()`) resta bloccato finché la verifica non è superata.
   Inoltre, se l'accesso fallisce (email o password errate), la verifica viene
   **resettata** e vengono caricate nuove immagini, così deve essere ripetuta.
6. **Fallback**: se la chiamata a `animali.php` non va a buon fine, la verifica
   viene saltata ("Verifica non disponibile — procedi comunque") per non
   impedire l'accesso a causa di un problema tecnico.

---
