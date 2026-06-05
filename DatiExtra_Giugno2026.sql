-- ============================================================
--  Agenda - Dati extra (Giugno 2026)
--  Arricchisce il database con promemoria, eccezioni e appuntamenti.
--  Utenti usati: 1 = Mario Rossi, 2 = Luisa Bianchi
--  Eseguire DOPO SchemaPerMySQL.sql / DatiPerMySQL.sql.
-- ============================================================

USE agendaxie;

-- ─────────────────────────────────────────────────────────────
-- PROMEMORIE — Mario Rossi (id 1)
-- ─────────────────────────────────────────────────────────────

-- Ricorrente settimanale CON data di fine
INSERT INTO promemorie (descrizione, dataInizio, dataFine, ora, durataMin, ricorrenza, idPersona)
VALUES ('Riunione settimanale del team', '2026-06-01', '2026-07-31', '09:30:00', 60, 'settimanale', 1);

-- Ricorrente settimanale SENZA fine
INSERT INTO promemorie (descrizione, dataInizio, dataFine, ora, durataMin, ricorrenza, idPersona)
VALUES ('Palestra', '2026-06-02', NULL, '18:00:00', 90, 'settimanale', 1);

-- Ricorrente mensile (giorno 5)
INSERT INTO promemorie (descrizione, dataInizio, dataFine, ora, durataMin, ricorrenza, idPersona)
VALUES ('Pagamento affitto', '2026-06-05', NULL, NULL, NULL, 'mensile', 1);

-- Ricorrente mensile giorno 31 (test fine mese)
INSERT INTO promemorie (descrizione, dataInizio, dataFine, ora, durataMin, ricorrenza, idPersona)
VALUES ('Chiusura contabile mensile', '2026-05-31', NULL, '17:00:00', 120, 'mensile', 1);

-- Ricorrente annuale
INSERT INTO promemorie (descrizione, dataInizio, dataFine, ora, durataMin, ricorrenza, idPersona)
VALUES ('Compleanno mamma', '2026-06-18', NULL, NULL, NULL, 'annuale', 1);

-- Singolo (nessuna ricorrenza)
INSERT INTO promemorie (descrizione, dataInizio, dataFine, ora, durataMin, ricorrenza, idPersona)
VALUES ('Visita dentista', '2026-06-12', NULL, '15:00:00', 45, 'nessuna', 1);

-- Singolo senza ora (tutto il giorno)
INSERT INTO promemorie (descrizione, dataInizio, dataFine, ora, durataMin, ricorrenza, idPersona)
VALUES ('Scadenza bollo auto', '2026-06-30', NULL, NULL, NULL, 'nessuna', 1);

-- ─────────────────────────────────────────────────────────────
-- PROMEMORIE — Luisa Bianchi (id 2)
-- ─────────────────────────────────────────────────────────────

INSERT INTO promemorie (descrizione, dataInizio, dataFine, ora, durataMin, ricorrenza, idPersona)
VALUES ('Lezione di yoga', '2026-06-03', '2026-08-31', '19:00:00', 60, 'settimanale', 2);

INSERT INTO promemorie (descrizione, dataInizio, dataFine, ora, durataMin, ricorrenza, idPersona)
VALUES ('Scadenza bolletta luce', '2026-06-20', NULL, NULL, NULL, 'mensile', 2);

INSERT INTO promemorie (descrizione, dataInizio, dataFine, ora, durataMin, ricorrenza, idPersona)
VALUES ('Anniversario', '2026-06-25', NULL, '20:00:00', NULL, 'annuale', 2);

INSERT INTO promemorie (descrizione, dataInizio, dataFine, ora, durataMin, ricorrenza, idPersona)
VALUES ('Ritirare referti', '2026-06-15', NULL, '10:30:00', 30, 'nessuna', 2);

-- ─────────────────────────────────────────────────────────────
-- ECCEZIONI — sul promemoria "Riunione settimanale del team"
-- (recupera l'id del promemoria appena inserito tramite descrizione+persona)
-- ─────────────────────────────────────────────────────────────
SET @idRiunione = (SELECT id FROM promemorie
                   WHERE idPersona = 1 AND descrizione = 'Riunione settimanale del team'
                   ORDER BY id DESC LIMIT 1);

-- Occorrenza dell'8 giugno SPOSTATA al 9 giugno, orario diverso
INSERT INTO promemoriaEccezioni (idPromemoria, data, nuovaData, nuovaOra, nuovaDurataMin, descrizione, cancellato)
VALUES (@idRiunione, '2026-06-08', '2026-06-09', '11:00:00', 60, NULL, 0);

-- Occorrenza del 15 giugno CANCELLATA (festività)
INSERT INTO promemoriaEccezioni (idPromemoria, data, nuovaData, nuovaOra, nuovaDurataMin, descrizione, cancellato)
VALUES (@idRiunione, '2026-06-15', NULL, NULL, NULL, NULL, 1);

-- Occorrenza del 22 giugno con descrizione modificata
INSERT INTO promemoriaEccezioni (idPromemoria, data, nuovaData, nuovaOra, nuovaDurataMin, descrizione, cancellato)
VALUES (@idRiunione, '2026-06-22', NULL, NULL, NULL, 'Riunione team + ospiti esterni', 0);

-- ─────────────────────────────────────────────────────────────
-- APPUNTAMENTI — multi-persona (id assegnati via AUTO_INCREMENT)
-- Si usano variabili per collegare i partecipanti.
-- ─────────────────────────────────────────────────────────────

-- 1) Presentazione progetto: Mario + Luisa
INSERT INTO appuntamenti (descrizione, dataInizio, durataMin)
VALUES ('Presentazione progetto', '2026-06-04 10:00:00', 120);
SET @a1 = LAST_INSERT_ID();
INSERT INTO AppuntamentoPersona (idPersona, idAppuntamento) VALUES (1, @a1), (2, @a1);

-- 2) Pranzo di lavoro: Mario + Luisa
INSERT INTO appuntamenti (descrizione, dataInizio, durataMin)
VALUES ('Pranzo di lavoro', '2026-06-09 13:00:00', 90);
SET @a2 = LAST_INSERT_ID();
INSERT INTO AppuntamentoPersona (idPersona, idAppuntamento) VALUES (1, @a2), (2, @a2);

-- 3) Colloquio cliente: solo Luisa
INSERT INTO appuntamenti (descrizione, dataInizio, durataMin)
VALUES ('Colloquio cliente', '2026-06-11 16:00:00', 45);
SET @a3 = LAST_INSERT_ID();
INSERT INTO AppuntamentoPersona (idPersona, idAppuntamento) VALUES (2, @a3);

-- 4) Revisione budget: solo Mario
INSERT INTO appuntamenti (descrizione, dataInizio, durataMin)
VALUES ('Revisione budget', '2026-06-16 09:00:00', 60);
SET @a4 = LAST_INSERT_ID();
INSERT INTO AppuntamentoPersona (idPersona, idAppuntamento) VALUES (1, @a4);

-- 5) Workshop design: Mario + Luisa (mezza giornata)
INSERT INTO appuntamenti (descrizione, dataInizio, durataMin)
VALUES ('Workshop design', '2026-06-19 09:00:00', 240);
SET @a5 = LAST_INSERT_ID();
INSERT INTO AppuntamentoPersona (idPersona, idAppuntamento) VALUES (1, @a5), (2, @a5);

-- 6) Cena di team: Mario + Luisa
INSERT INTO appuntamenti (descrizione, dataInizio, durataMin)
VALUES ('Cena di team', '2026-06-26 20:00:00', 150);
SET @a6 = LAST_INSERT_ID();
INSERT INTO AppuntamentoPersona (idPersona, idAppuntamento) VALUES (1, @a6), (2, @a6);

-- 7) Call con fornitore: solo Mario
INSERT INTO appuntamenti (descrizione, dataInizio, durataMin)
VALUES ('Call con fornitore', '2026-06-23 14:30:00', 30);
SET @a7 = LAST_INSERT_ID();
INSERT INTO AppuntamentoPersona (idPersona, idAppuntamento) VALUES (1, @a7);
