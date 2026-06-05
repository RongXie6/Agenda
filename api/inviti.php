<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once("common/dbUtil.php");
$method = $_SERVER['REQUEST_METHOD'];

function invitiInput(){
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

    $pdo     = getConnection();
    $user_id = $_SESSION['user']->id;

    switch ($method) {

        // ── GET: inviti in attesa di risposta per l'utente corrente ─────────
        case 'GET':
            $stm = $pdo->prepare(
                "SELECT a.id, a.descrizione, a.dataInizio, a.durataMin,
                        GROUP_CONCAT(
                            CASE WHEN TRIM(CONCAT(COALESCE(p2.nome,''),' ',COALESCE(p2.cognome,''))) <> ''
                                 THEN TRIM(CONCAT(COALESCE(p2.nome,''),' ',COALESCE(p2.cognome,'')))
                                 ELSE p2.username END
                            ORDER BY p2.cognome, p2.nome SEPARATOR ', '
                        ) AS partecipanti
                 FROM AppuntamentoPersona ap
                 INNER JOIN appuntamenti a ON a.id = ap.idAppuntamento
                 INNER JOIN AppuntamentoPersona ap2 ON ap2.idAppuntamento = a.id
                      AND ap2.stato <> 'rifiutato'
                 INNER JOIN persone p2 ON p2.id = ap2.idPersona
                 WHERE ap.idPersona = ? AND ap.stato = 'invitato'
                 GROUP BY a.id, a.descrizione, a.dataInizio, a.durataMin
                 ORDER BY a.dataInizio ASC"
            );
            $stm->execute([$user_id]);
            $inviti = $stm->fetchAll(PDO::FETCH_OBJ);
            http_response_code(200);
            echo json_encode($inviti, JSON_UNESCAPED_UNICODE);
            break;

        // ── PUT: accetta o rifiuta un invito ────────────────────────────────
        case 'PUT':
            $input  = invitiInput();
            $idApp  = isset($input['idAppuntamento']) ? intval($input['idAppuntamento']) : 0;
            $azione = isset($input['azione']) ? trim($input['azione']) : '';

            if($idApp <= 0 || !in_array($azione, ['accetta','rifiuta'], true)){
                http_response_code(400);
                echo json_encode(['code'=>0,'desc'=>'Parametri non validi (idAppuntamento, azione=accetta|rifiuta)'], JSON_UNESCAPED_UNICODE);
                break;
            }

            // Verifica che esista un invito 'invitato' per questo utente
            $chk = $pdo->prepare(
                "SELECT idPersona FROM AppuntamentoPersona
                 WHERE idAppuntamento = ? AND idPersona = ? AND stato = 'invitato'"
            );
            $chk->execute([$idApp, $user_id]);
            if(!$chk->fetch()){
                http_response_code(404);
                echo json_encode(['code'=>0,'desc'=>'Invito non trovato o già gestito'], JSON_UNESCAPED_UNICODE);
                break;
            }

            if($azione === 'rifiuta'){
                $upd = $pdo->prepare(
                    "UPDATE AppuntamentoPersona SET stato='rifiutato'
                     WHERE idAppuntamento = ? AND idPersona = ?"
                );
                $upd->execute([$idApp, $user_id]);
                http_response_code(200);
                echo json_encode(['code'=>1,'desc'=>'Invito rifiutato'], JSON_UNESCAPED_UNICODE);
                break;
            }

            // azione === 'accetta': prima verifica che l'utente sia libero
            $app = $pdo->prepare('SELECT dataInizio, durataMin FROM appuntamenti WHERE id = ?');
            $app->execute([$idApp]);
            $dati = $app->fetch(PDO::FETCH_OBJ);
            if(!$dati){
                http_response_code(404);
                echo json_encode(['code'=>0,'desc'=>'Appuntamento non trovato'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $durata = intval($dati->durataMin ?? 0);
            $conf = $pdo->prepare(
                "SELECT a.id
                 FROM appuntamenti a
                 INNER JOIN AppuntamentoPersona ap ON ap.idAppuntamento = a.id
                 WHERE ap.idPersona = ?
                 AND ap.stato IN ('organizzatore','accettato')
                 AND a.id != ?
                 AND a.dataInizio < DATE_ADD(?, INTERVAL ? MINUTE)
                 AND DATE_ADD(a.dataInizio, INTERVAL COALESCE(a.durataMin,0) MINUTE) > ?"
            );
            $conf->execute([$user_id, $idApp, $dati->dataInizio, $durata, $dati->dataInizio]);
            if($conf->fetch()){
                http_response_code(409);
                echo json_encode(['code'=>0,'desc'=>'Non sei libero in questo orario: hai già un altro appuntamento'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $upd = $pdo->prepare(
                "UPDATE AppuntamentoPersona SET stato='accettato'
                 WHERE idAppuntamento = ? AND idPersona = ?"
            );
            $upd->execute([$idApp, $user_id]);
            http_response_code(200);
            echo json_encode(['code'=>1,'desc'=>'Invito accettato'], JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(405);
            echo json_encode(['code'=>0,'desc'=>'metodo non consentito'], JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Throwable $th) {
    http_response_code(500);
    echo json_encode(['error'=>'db error: ' . $th->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
