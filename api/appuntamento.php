<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once("common/dbUtil.php");
$method = $_SERVER['REQUEST_METHOD'];

function appuntamentoInput(){
    $raw = file_get_contents('php://input');
    if($raw === false || trim($raw) === ''){
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

try {
    if(!isset($_SESSION['user'])){
        http_response_code(401);
        echo json_encode(['code'=>0,'desc'=>'utente non loggato'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $pdo = getConnection();
    $user_id = $_SESSION['user']->id;

    switch ($method) {

        // ── GET ────────────────────────────────────────────────────────────
        case 'GET':
            $id           = isset($_GET['id'])     ? intval($_GET['id']) : null;
            $utentiParam  = isset($_GET['utenti'])  ? trim($_GET['utenti']) : null;

            if($id !== null){
                // Singolo appuntamento (verifica che l'utente ne faccia parte)
                $stm = $pdo->prepare(
                    'SELECT a.id, a.descrizione, a.dataInizio, a.durataMin
                     FROM appuntamenti AS a
                     INNER JOIN AppuntamentoPersona AS ap ON ap.idAppuntamento = a.id
                     WHERE a.id = ? AND ap.idPersona = ?'
                );
                $stm->execute([$id, $user_id]);
                $data = $stm->fetch(PDO::FETCH_OBJ);
                if(!$data){
                    http_response_code(404);
                    echo json_encode(['code'=>0,'desc'=>'Appuntamento non trovato'], JSON_UNESCAPED_UNICODE);
                    break;
                }
                // Partecipanti
                $stmP = $pdo->prepare(
                    'SELECT p.id, p.username, p.nome, p.cognome
                     FROM AppuntamentoPersona ap
                     INNER JOIN persone p ON p.id = ap.idPersona
                     WHERE ap.idAppuntamento = ?'
                );
                $stmP->execute([$id]);
                $data->utenti = $stmP->fetchAll(PDO::FETCH_OBJ);

                http_response_code(200);
                echo json_encode($data, JSON_UNESCAPED_UNICODE);
            } elseif($utentiParam !== null){
                // Disponibilità: appuntamenti di una lista di utenti (separati da virgola)
                $utentiIds = array_values(array_filter(array_map('intval', explode(',', $utentiParam))));
                if(empty($utentiIds)){
                    http_response_code(400);
                    echo json_encode(['code'=>0,'desc'=>'utenti non validi'], JSON_UNESCAPED_UNICODE);
                    break;
                }
                $placeholders = implode(',', array_fill(0, count($utentiIds), '?'));
                $stm = $pdo->prepare(
                    "SELECT a.id, a.descrizione, a.dataInizio, a.durataMin, ap.idPersona
                     FROM AppuntamentoPersona AS ap
                     INNER JOIN appuntamenti AS a ON ap.idAppuntamento = a.id
                     WHERE ap.idPersona IN ($placeholders)
                     ORDER BY a.dataInizio ASC"
                );
                $stm->execute($utentiIds);
                $appuntamenti = $stm->fetchAll(PDO::FETCH_OBJ);
                http_response_code(200);
                echo json_encode($appuntamenti, JSON_UNESCAPED_UNICODE);
            } else {
                // Lista appuntamenti dell'utente corrente con partecipanti.
                // mioStato = stato dell'utente corrente per ogni appuntamento.
                // Esclude gli appuntamenti che l'utente ha rifiutato.
                // I partecipanti elencati sono solo quelli non rifiutati.
                $stm = $pdo->prepare(
                    "SELECT a.id, a.descrizione, a.dataInizio, a.durataMin, ap.idPersona,
                            ap.stato AS mioStato,
                            GROUP_CONCAT(
                                CASE WHEN TRIM(CONCAT(COALESCE(p2.nome,''),' ',COALESCE(p2.cognome,''))) <> ''
                                     THEN TRIM(CONCAT(COALESCE(p2.nome,''),' ',COALESCE(p2.cognome,'')))
                                     ELSE p2.username END
                                ORDER BY p2.cognome, p2.nome SEPARATOR ', '
                            ) AS partecipanti
                     FROM AppuntamentoPersona AS ap
                     INNER JOIN appuntamenti AS a ON ap.idAppuntamento = a.id
                     INNER JOIN AppuntamentoPersona ap2 ON ap2.idAppuntamento = a.id
                          AND ap2.stato <> 'rifiutato'
                     INNER JOIN persone p2 ON p2.id = ap2.idPersona
                     WHERE ap.idPersona = ? AND ap.stato <> 'rifiutato'
                     GROUP BY a.id, a.descrizione, a.dataInizio, a.durataMin, ap.idPersona, ap.stato
                     ORDER BY a.dataInizio ASC"
                );
                $stm->execute([$user_id]);
                $appuntamenti = $stm->fetchAll(PDO::FETCH_OBJ);
                http_response_code(200);
                echo json_encode($appuntamenti, JSON_UNESCAPED_UNICODE);
            }
            break;

        // ── POST ───────────────────────────────────────────────────────────
        case 'POST':
            $input = appuntamentoInput();
            $descrizione = isset($input['descrizione']) ? trim($input['descrizione']) : '';
            $dataInizio  = isset($input['dataInizio'])  ? trim($input['dataInizio'])  : '';
            $durataMin   = (isset($input['durataMin']) && $input['durataMin'] !== '') ? intval($input['durataMin']) : null;
            $utenti      = (isset($input['utenti']) && is_array($input['utenti'])) ? $input['utenti'] : [];

            if($descrizione === '' || $dataInizio === ''){
                http_response_code(400);
                echo json_encode(['code'=>0,'desc'=>'descrizione e dataInizio sono obbligatori'], JSON_UNESCAPED_UNICODE);
                break;
            }

            // L'utente corrente è sempre incluso
            if(!in_array($user_id, array_map('intval', $utenti))){
                $utenti[] = $user_id;
            }

            // ── Controllo disponibilità server-side ──────────────────────────
            // Si verifica SOLO la disponibilità dell'organizzatore (utente corrente).
            // Gli invitati decideranno se accettare; la verifica di conflitto per
            // loro avviene al momento dell'accettazione (inviti.php).
            $durataCheck = $durataMin ?? 0;
            $stmCheck = $pdo->prepare(
                "SELECT a.id
                 FROM appuntamenti a
                 INNER JOIN AppuntamentoPersona ap ON ap.idAppuntamento = a.id
                 WHERE ap.idPersona = ?
                 AND ap.stato IN ('organizzatore','accettato')
                 AND a.dataInizio < DATE_ADD(?, INTERVAL ? MINUTE)
                 AND DATE_ADD(a.dataInizio, INTERVAL COALESCE(a.durataMin, 0) MINUTE) > ?"
            );
            $stmCheck->execute([$user_id, $dataInizio, $durataCheck, $dataInizio]);
            if($stmCheck->fetch()){
                http_response_code(409);
                echo json_encode([
                    'code' => 0,
                    'desc' => 'Non sei libero in questo orario: hai già un altro appuntamento'
                ], JSON_UNESCAPED_UNICODE);
                break;
            }

            $pdo->beginTransaction();
            $stm = $pdo->prepare(
                'INSERT INTO appuntamenti(descrizione, dataInizio, durataMin)
                 VALUES(:descrizione,:dataInizio,:durataMin)'
            );
            $stm->execute([
                'descrizione' => $descrizione,
                'dataInizio'  => $dataInizio,
                'durataMin'   => $durataMin
            ]);
            $idApp = $pdo->lastInsertId();

            // L'organizzatore (utente corrente) è 'organizzatore' e accetta
            // implicitamente; gli altri restano 'invitato' in attesa di risposta.
            $stm2 = $pdo->prepare('INSERT INTO AppuntamentoPersona(idPersona, idAppuntamento, stato) VALUES(?, ?, ?)');
            foreach(array_unique(array_map('intval', $utenti)) as $u){
                $stato = ($u === $user_id) ? 'organizzatore' : 'invitato';
                $stm2->execute([$u, $idApp, $stato]);
            }
            $pdo->commit();

            http_response_code(201);
            echo json_encode(['code'=>1,'desc'=>'Appuntamento aggiunto','id'=>$idApp], JSON_UNESCAPED_UNICODE);
            break;

        // ── PUT ────────────────────────────────────────────────────────────
        case 'PUT':
            $input = appuntamentoInput();
            $id = isset($input['id']) ? intval($input['id']) : 0;

            if($id <= 0){
                http_response_code(400);
                echo json_encode(['code'=>0,'desc'=>'id obbligatorio'], JSON_UNESCAPED_UNICODE);
                break;
            }

            // Verifica che l'utente faccia parte dell'appuntamento
            $check = $pdo->prepare(
                'SELECT * FROM AppuntamentoPersona WHERE idAppuntamento = ? AND idPersona = ?'
            );
            $check->execute([$id, $user_id]);
            if($check->rowCount() === 0){
                http_response_code(403);
                echo json_encode(['code'=>0,'desc'=>'non autorizzato'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $descrizione = isset($input['descrizione']) ? trim($input['descrizione']) : '';
            $dataInizio  = isset($input['dataInizio'])  ? trim($input['dataInizio'])  : '';
            $durataMin   = (isset($input['durataMin']) && $input['durataMin'] !== '') ? intval($input['durataMin']) : null;
            $utenti      = (isset($input['utenti']) && is_array($input['utenti'])) ? $input['utenti'] : null;

            // ── Controllo disponibilità server-side (solo organizzatore) ─────
            $durataCheck = $durataMin ?? 0;
            $stmCheck = $pdo->prepare(
                "SELECT a.id
                 FROM appuntamenti a
                 INNER JOIN AppuntamentoPersona ap ON ap.idAppuntamento = a.id
                 WHERE ap.idPersona = ?
                 AND ap.stato IN ('organizzatore','accettato')
                 AND a.dataInizio < DATE_ADD(?, INTERVAL ? MINUTE)
                 AND DATE_ADD(a.dataInizio, INTERVAL COALESCE(a.durataMin, 0) MINUTE) > ?
                 AND a.id != ?"
            );
            $stmCheck->execute([$user_id, $dataInizio, $durataCheck, $dataInizio, $id]);
            if($stmCheck->fetch()){
                http_response_code(409);
                echo json_encode([
                    'code' => 0,
                    'desc' => 'Non sei libero in questo orario: hai già un altro appuntamento'
                ], JSON_UNESCAPED_UNICODE);
                break;
            }

            $pdo->beginTransaction();

            $stm = $pdo->prepare(
                'UPDATE appuntamenti
                 SET descrizione=:descrizione, dataInizio=:dataInizio, durataMin=:durataMin
                 WHERE id=:id'
            );
            $stm->execute([
                'descrizione' => $descrizione,
                'dataInizio'  => $dataInizio,
                'durataMin'   => $durataMin,
                'id'          => $id
            ]);

            // Aggiorna partecipanti solo se forniti, preservando gli stati esistenti.
            if($utenti !== null){
                $nuovi = array_values(array_unique(array_map('intval', $utenti)));
                if(!in_array($user_id, $nuovi)) $nuovi[] = $user_id;

                // Stati attuali (per non perdere accettato/rifiutato di chi resta)
                $stmOld = $pdo->prepare('SELECT idPersona, stato FROM AppuntamentoPersona WHERE idAppuntamento = ?');
                $stmOld->execute([$id]);
                $statiVecchi = [];
                foreach($stmOld->fetchAll(PDO::FETCH_ASSOC) as $r){
                    $statiVecchi[(int)$r['idPersona']] = $r['stato'];
                }

                $delU = $pdo->prepare('DELETE FROM AppuntamentoPersona WHERE idAppuntamento = ?');
                $delU->execute([$id]);
                $insU = $pdo->prepare('INSERT INTO AppuntamentoPersona(idPersona, idAppuntamento, stato) VALUES(?, ?, ?)');
                foreach($nuovi as $u){
                    if($u === $user_id){
                        $stato = 'organizzatore';
                    } elseif(isset($statiVecchi[$u])){
                        $stato = $statiVecchi[$u];          // mantiene accettato/rifiutato/invitato
                    } else {
                        $stato = 'invitato';                // nuovo invitato
                    }
                    $insU->execute([$u, $id, $stato]);
                }
            }

            $pdo->commit();

            http_response_code(200);
            echo json_encode(['code'=>1,'desc'=>'Appuntamento modificato'], JSON_UNESCAPED_UNICODE);
            break;

        // ── DELETE ─────────────────────────────────────────────────────────
        case 'DELETE':
            $input = appuntamentoInput();
            $appId = 0;
            if(isset($_GET['id'])){
                $appId = intval($_GET['id']);
            } elseif(isset($input['id'])){
                $appId = intval($input['id']);
            }

            if($appId <= 0){
                http_response_code(400);
                echo json_encode(['code'=>0,'desc'=>'id obbligatorio'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $check = $pdo->prepare(
                'SELECT * FROM AppuntamentoPersona WHERE idAppuntamento = ? AND idPersona = ?'
            );
            $check->execute([$appId, $user_id]);
            if($check->rowCount() === 0){
                http_response_code(403);
                echo json_encode(['code'=>0,'desc'=>'non autorizzato a cancellare'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $pdo->beginTransaction();
            $delAssoc = $pdo->prepare('DELETE FROM AppuntamentoPersona WHERE idAppuntamento = ?');
            $delAssoc->execute([$appId]);
            $delApp = $pdo->prepare('DELETE FROM appuntamenti WHERE id = ?');
            $delApp->execute([$appId]);
            $deleted = $delApp->rowCount();
            $pdo->commit();

            http_response_code(200);
            if($deleted > 0){
                echo json_encode(['code'=>1,'desc'=>'Appuntamento cancellato'], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['code'=>0,'desc'=>'Appuntamento non trovato'], JSON_UNESCAPED_UNICODE);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['code'=>0,'desc'=>'metodo non consentito'], JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Throwable $th) {
    if(isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()){
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error'=>'db error: ' . $th->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
