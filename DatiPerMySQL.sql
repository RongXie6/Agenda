-- ============================================================
--  AgendaX – Dati di esempio
--  Da eseguire DOPO SchemaPerMySQL.sql
--
--  Password di tutti gli utenti di esempio: Password1!
--  Hash generato con password_hash("Password1!", PASSWORD_BCRYPT)
-- ============================================================

USE Agenda;

-- ── Persone ──────────────────────────────────────────────────
INSERT INTO persone (mail, password, username, nome, cognome, telefono) VALUES
('mario.rossi@email.it',   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'mario_r',   'Mario',   'Rossi',    '+39 333 1111111'),
('giulia.bianchi@email.it','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'giulia_b',  'Giulia',  'Bianchi',  '+39 333 2222222'),
('luca.verdi@email.it',    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'luca_v',    'Luca',    'Verdi',    '+39 333 3333333'),
('anna.ferrari@email.it',  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'anna_f',    'Anna',    'Ferrari',  '+39 333 4444444'),
('test@test.it',           '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'test_user', NULL,      NULL,       NULL);

-- ── Promemorie ───────────────────────────────────────────────
-- Mario: vari tipi di ricorrenza
INSERT INTO promemorie (descrizione, dataInizio, ora, durataMin, ricorrenza, idPersona) VALUES
('Riunione settimanale del team',  '2026-05-01', '10:00', 60,   'settimanale', 1),
('Pagamento affitto',              '2026-05-01', NULL,    NULL, 'mensile',     1),
('Compleanno mamma',               '2026-03-15', NULL,    NULL, 'annuale',     1),
('Palestra',                       '2026-05-04', '07:30', 90,   'settimanale', 1),
('Controllo medico',               '2026-06-10', '11:00', 30,   'nessuna',     1);

-- Giulia
INSERT INTO promemorie (descrizione, dataInizio, ora, durataMin, ricorrenza, idPersona) VALUES
('Lezione di yoga',                '2026-05-06', '18:00', 60,   'settimanale', 2),
('Scadenza bolletta luce',         '2026-05-20', NULL,    NULL, 'mensile',     2),
('Anniversario',                   '2026-07-22', NULL,    NULL, 'annuale',     2);

-- Luca
INSERT INTO promemorie (descrizione, dataInizio, ora, durataMin, ricorrenza, idPersona) VALUES
('Stand-up meeting',               '2026-05-04', '09:00', 15,   'settimanale', 3),
('Revisione auto',                 '2026-09-01', NULL,    NULL, 'nessuna',     3);

-- ── Eccezioni promemorie ─────────────────────────────────────
-- La riunione del 05/05 è spostata al 07/05 (con orario cambiato)
INSERT INTO promemoriaEccezioni (idPromemoria, data, nuovaData, nuovaOra, nuovaDurataMin, descrizione, cancellato) VALUES
(1, '2026-05-05', '2026-05-07', '14:00', 60,   NULL,                         false),
-- La riunione del 12/05 è cancellata (festività)
(1, '2026-05-12', NULL,         NULL,    NULL,  NULL,                         true),
-- La palestra del 18/05 ha una descrizione diversa
(4, '2026-05-18', NULL,         '08:00', 60,   'Palestra + corsa extra',     false);

-- ── Appuntamenti ─────────────────────────────────────────────
INSERT INTO appuntamenti (descrizione, dataInizio, durataMin) VALUES
('Presentazione progetto',   '2026-06-02 09:00:00', 120),
('Pranzo di lavoro',         '2026-06-05 13:00:00', 90),
('Colloquio candidato',      '2026-06-10 15:00:00', 45),
('Workshop design sprint',   '2026-06-15 09:00:00', 480);

-- ── Partecipanti appuntamenti ────────────────────────────────
-- Presentazione progetto: Mario, Giulia, Luca
INSERT INTO AppuntamentoPersona (idPersona, idAppuntamento) VALUES
(1, 1), (2, 1), (3, 1);

-- Pranzo di lavoro: Mario, Anna
INSERT INTO AppuntamentoPersona (idPersona, idAppuntamento) VALUES
(1, 2), (4, 2);

-- Colloquio candidato: Giulia, Luca
INSERT INTO AppuntamentoPersona (idPersona, idAppuntamento) VALUES
(2, 3), (3, 3);

-- Workshop design sprint: tutti e quattro
INSERT INTO AppuntamentoPersona (idPersona, idAppuntamento) VALUES
(1, 4), (2, 4), (3, 4), (4, 4);
