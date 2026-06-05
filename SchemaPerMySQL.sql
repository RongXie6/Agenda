-- ============================================================
--  AgendaX – Schema del database
--  Database: Agenda
-- ============================================================

CREATE DATABASE IF NOT EXISTS Agenda
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE Agenda;

-- ── Persone ──────────────────────────────────────────────────
CREATE TABLE persone (
    id        INT          AUTO_INCREMENT PRIMARY KEY,
    mail      VARCHAR(255) NOT NULL UNIQUE,
    password  VARCHAR(255) NOT NULL,
    username  VARCHAR(100) NOT NULL UNIQUE,
    nome      VARCHAR(100),
    cognome   VARCHAR(100),
    telefono  VARCHAR(30)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Promemorie ───────────────────────────────────────────────
--   Un promemoria appartiene a una sola persona.
--   ricorrenza: nessuna | settimanale | mensile | annuale
CREATE TABLE promemorie (
    id          INT         AUTO_INCREMENT PRIMARY KEY,
    descrizione TEXT        NOT NULL,
    dataInizio  DATE        NOT NULL,
    dataFine    DATE,                                  -- fine ricorrenza (NULL = senza fine)
    ora         TIME,
    durataMin   INT,
    ricorrenza  VARCHAR(20) NOT NULL DEFAULT 'nessuna',
    idPersona   INT         NOT NULL,
    FOREIGN KEY (idPersona) REFERENCES persone(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Eccezioni per le promemorie ricorrenti ───────────────────
--   Ogni riga sovrascrive o cancella una singola occorrenza.
--   data        = data originale dell'occorrenza (chiave)
--   nuovaData   = se l'occorrenza è spostata a un'altra data
--   nuovaOra    = orario sovrascritto
--   nuovaDurataMin = durata sovrascritta
--   descrizione = testo sovrascritto
--   cancellato  = 1 se l'occorrenza è eliminata
CREATE TABLE promemoriaEccezioni (
    id             INT     AUTO_INCREMENT PRIMARY KEY,
    idPromemoria   INT     NOT NULL,
    data           DATE    NOT NULL,
    nuovaData      DATE,
    nuovaOra       TIME,
    nuovaDurataMin INT,
    descrizione    TEXT,
    cancellato     BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY (idPromemoria) REFERENCES promemorie(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Appuntamenti ─────────────────────────────────────────────
--   Un appuntamento può coinvolgere più persone.
--   Non è ricorrente.
CREATE TABLE appuntamenti (
    id          INT      AUTO_INCREMENT PRIMARY KEY,
    descrizione TEXT     NOT NULL,
    dataInizio  DATETIME NOT NULL,
    durataMin   INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── AppuntamentoPersona (N:M) ────────────────────────────────
--   stato: organizzatore (chi crea) | invitato (in attesa di risposta)
--          | accettato | rifiutato
CREATE TABLE AppuntamentoPersona (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    idPersona       INT NOT NULL,
    idAppuntamento  INT NOT NULL,
    stato           ENUM('organizzatore','invitato','accettato','rifiutato')
                    NOT NULL DEFAULT 'invitato',
    FOREIGN KEY (idPersona)      REFERENCES persone(id)       ON DELETE CASCADE,
    FOREIGN KEY (idAppuntamento) REFERENCES appuntamenti(id)  ON DELETE CASCADE,
    UNIQUE KEY uq_ap (idPersona, idAppuntamento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
