<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once("common/dbUtil.php");
$method = $_SERVER['REQUEST_METHOD'];

function promemoriaInput(){
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
            $id = isset($_GET['id']) ? intval($_GET['id']) : null;

            if ($id !== null) {
                $stm = $pdo->prepare(
                    'SELECT * FROM promemorie WHERE idPersona = ? AND id = ?'
                );
                $stm->execute([$user_id, $id]);
                $promemorie = $stm->fetch(PDO::FETCH_OBJ);
                if(!$promemorie){
                    http_response_code(404);
                    echo json_encode(['code'=>0,'desc'=>'Promemoria non trovato'], JSON_UNESCAPED_UNICODE);
                    break;
                }
            } else {
                $stm = $pdo->prepare(
                    'SELECT * FROM promemorie WHERE idPersona = ? ORDER BY dataInizio ASC'
                );
                $stm->execute([$user_id]);
                $promemorie = $stm->fetchAll(PDO::FETCH_OBJ);
            }

            http_response_code(200);
            echo json_encode($promemorie, JSON_UNESCAPED_UNICODE);
            break;

        // ── POST ───────────────────────────────────────────────────────────
        case 'POST':
            $input = promemoriaInput();
            $descrizione = isset($input['descrizione']) ? trim($input['descrizione']) : '';
            $dataInizio  = isset($input['dataInizio'])  ? trim($input['dataInizio'])  : '';
            $ora         = (isset($input['ora']) && $input['ora'] !== '') ? trim($input['ora']) : null;
            $durataMin   = (isset($input['durataMin']) && $input['durataMin'] !== '') ? intval($input['durataMin']) : null;
            $ricorrenza  = isset($input['ricorrenza'])  ? trim($input['ricorrenza'])  : 'nessuna';
            $dataFine    = (isset($input['dataFine']) && $input['dataFine'] !== '') ? trim($input['dataFine']) : null;

            if($descrizione === '' || $dataInizio === ''){
                http_response_code(400);
                echo json_encode(['code'=>0,'desc'=>'descrizione e dataInizio sono obbligatori'], JSON_UNESCAPED_UNICODE);
                break;
            }

            // La data di fine ha senso solo per le ricorrenti e non puo' precedere l'inizio
            if($ricorrenza === 'nessuna'){
                $dataFine = null;
            } elseif($dataFine !== null && $dataFine < $dataInizio){
                http_response_code(400);
                echo json_encode(['code'=>0,'desc'=>'La data di fine non puo\' precedere la data di inizio'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $stm = $pdo->prepare(
                'INSERT INTO promemorie(descrizione, dataInizio, dataFine, ora, durataMin, ricorrenza, idPersona)
                 VALUES(:descrizione,:dataInizio,:dataFine,:ora,:durataMin,:ricorrenza,:idPersona)'
            );
            $stm->execute([
                'descrizione' => $descrizione,
                'dataInizio'  => $dataInizio,
                'dataFine'    => $dataFine,
                'ora'         => $ora,
                'durataMin'   => $durataMin,
                'ricorrenza'  => $ricorrenza,
                'idPersona'   => $user_id
            ]);

            http_response_code(201);
            echo json_encode([
                'code' => 1,
                'desc' => 'Promemoria aggiunto',
                'id'   => $pdo->lastInsertId()
            ], JSON_UNESCAPED_UNICODE);
            break;

        // ── PUT ────────────────────────────────────────────────────────────
        case 'PUT':
            $input = promemoriaInput();
            $id = isset($input['id']) ? intval($input['id']) : 0;

            if($id <= 0){
                http_response_code(400);
                echo json_encode(['code'=>0,'desc'=>'id obbligatorio'], JSON_UNESCAPED_UNICODE);
                break;
            }

            // Verifica che il promemoria appartenga all'utente loggato
            $own = $pdo->prepare('SELECT id FROM promemorie WHERE id = ? AND idPersona = ?');
            $own->execute([$id, $user_id]);
            if(!$own->fetch()){
                http_response_code(403);
                echo json_encode(['code'=>0,'desc'=>'non autorizzato o promemoria non trovato'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $descrizione = isset($input['descrizione']) ? trim($input['descrizione']) : '';
            $dataInizio  = isset($input['dataInizio'])  ? trim($input['dataInizio'])  : '';
            $ora         = (isset($input['ora']) && $input['ora'] !== '') ? trim($input['ora']) : null;
            $durataMin   = (isset($input['durataMin']) && $input['durataMin'] !== '') ? intval($input['durataMin']) : null;
            $ricorrenza  = isset($input['ricorrenza'])  ? trim($input['ricorrenza'])  : 'nessuna';
            $dataFine    = (isset($input['dataFine']) && $input['dataFine'] !== '') ? trim($input['dataFine']) : null;

            if($ricorrenza === 'nessuna'){
                $dataFine = null;
            } elseif($dataFine !== null && $dataInizio !== '' && $dataFine < $dataInizio){
                http_response_code(400);
                echo json_encode(['code'=>0,'desc'=>'La data di fine non puo\' precedere la data di inizio'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $stm = $pdo->prepare(
                'UPDATE promemorie
                 SET descrizione=:descrizione, dataInizio=:dataInizio, dataFine=:dataFine,
                     ora=:ora, durataMin=:durataMin, ricorrenza=:ricorrenza
                 WHERE id=:id AND idPersona=:idPersona'
            );
            $stm->execute([
                'descrizione' => $descrizione,
                'dataInizio'  => $dataInizio,
                'dataFine'    => $dataFine,
                'ora'         => $ora,
                'durataMin'   => $durataMin,
                'ricorrenza'  => $ricorrenza,
                'id'          => $id,
                'idPersona'   => $user_id
            ]);

            http_response_code(200);
            echo json_encode(['code'=>1,'desc'=>'Promemoria modificato'], JSON_UNESCAPED_UNICODE);
            break;

        // ── DELETE ─────────────────────────────────────────────────────────
        case 'DELETE':
            $input = promemoriaInput();
            $promId = 0;
            if(isset($_GET['id'])){
                $promId = intval($_GET['id']);
            } elseif(isset($input['id'])){
                $promId = intval($input['id']);
            }

            if($promId <= 0){
                http_response_code(400);
                echo json_encode(['code'=>0,'desc'=>'id obbligatorio'], JSON_UNESCAPED_UNICODE);
                break;
            }

            // Verifica appartenenza
            $own = $pdo->prepare('SELECT id FROM promemorie WHERE id = ? AND idPersona = ?');
            $own->execute([$promId, $user_id]);
            if(!$own->fetch()){
                http_response_code(403);
                echo json_encode(['code'=>0,'desc'=>'non autorizzato o promemoria non trovato'], JSON_UNESCAPED_UNICODE);
                break;
            }

            $pdo->beginTransaction();
            // Prima elimina le eccezioni collegate
            $delEcc = $pdo->prepare('DELETE FROM promemoriaEccezioni WHERE idPromemoria = ?');
            $delEcc->execute([$promId]);
            // Poi elimina il promemoria
            $delProm = $pdo->prepare('DELETE FROM promemorie WHERE id = ? AND idPersona = ?');
            $delProm->execute([$promId, $user_id]);
            $deleted = $delProm->rowCount();
            $pdo->commit();

            http_response_code(200);
            if($deleted > 0){
                echo json_encode(['code'=>1,'desc'=>'Promemoria cancellato'], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['code'=>0,'desc'=>'Promemoria non trovato'], JSON_UNESCAPED_UNICODE);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['error'=>'metodo non consentito'], JSON_UNESCAPED_UNICODE);
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
