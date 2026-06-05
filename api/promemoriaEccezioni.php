<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once("common/dbUtil.php");

$method = $_SERVER['REQUEST_METHOD'];

try {
    if (!isset($_SESSION['user'])) {
        http_response_code(401);
        echo json_encode(['code' => 0, 'desc' => 'Utente non loggato'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $conn    = getConnection();
    $user_id = $_SESSION['user']->id;

    switch ($method) {
        case 'POST':
            insertPromemoriaEccezione($conn, $user_id);
            break;
        case 'GET':
            getPromemoriaEccezione($conn, $user_id);
            break;
        case 'DELETE':
            deletePromemoriaEccezione($conn, $user_id);
            break;
        default:
            http_response_code(405);
            echo json_encode(['code' => 0, 'desc' => 'Metodo non consentito'], JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['code' => 0, 'desc' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

// ── POST: inserisce o aggiorna un'eccezione ────────────────────────────────
function insertPromemoriaEccezione($conn, $user_id)
{
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $idPromemoria  = isset($input['id'])          ? intval($input['id'])                      : 0;
    $dataOriginale = isset($input['data'])         ? trim($input['data'])                      : '';
    $nuovaData     = (isset($input['nuovaData'])   && $input['nuovaData']   !== '') ? trim($input['nuovaData'])          : null;
    $nuovoInizio   = (isset($input['ora'])         && $input['ora']         !== '') ? trim($input['ora'])                : null;
    $nuovaDurataMin= (isset($input['durata'])      && $input['durata']      !== '') ? intval($input['durata'])           : null;
    // Descrizione per la singola occorrenza (opzionale)
    $descrizione   = (isset($input['descrizione']) && $input['descrizione'] !== '') ? trim($input['descrizione'])        : null;
    // cancellato: accetta boolean true/false oppure stringa "1"/"0"
    $cancellato    = !empty($input['cancellato']) ? 1 : 0;

    // ── Validazioni ───────────────────────────────────────────────────────
    if ($idPromemoria <= 0) {
        http_response_code(400);
        echo json_encode(['code' => 0, 'desc' => 'idPromemoria obbligatorio'], JSON_UNESCAPED_UNICODE);
        return;
    }
    if ($dataOriginale === '') {
        http_response_code(400);
        echo json_encode(['code' => 0, 'desc' => 'data (dataOriginale) obbligatoria'], JSON_UNESCAPED_UNICODE);
        return;
    }
    // Per una modifica serve almeno uno dei campi modificabili oppure la cancellazione
    if (!$cancellato && $nuovoInizio === null && $nuovaDurataMin === null && $nuovaData === null && $descrizione === null) {
        http_response_code(400);
        echo json_encode(['code' => 0, 'desc' => 'Per una modifica serve almeno uno dei campi: nuovaData, ora, durata, descrizione'], JSON_UNESCAPED_UNICODE);
        return;
    }

    // Verifica che il promemoria appartenga all'utente loggato
    $own = $conn->prepare('SELECT id FROM promemorie WHERE id = ? AND idPersona = ?');
    $own->execute([$idPromemoria, $user_id]);
    if (!$own->fetch()) {
        http_response_code(403);
        echo json_encode(['code' => 0, 'desc' => 'Non autorizzato'], JSON_UNESCAPED_UNICODE);
        return;
    }

    // ── Upsert: se esiste già un'eccezione per quella data la aggiorna ────
    $exist = $conn->prepare(
        'SELECT id FROM promemoriaEccezioni WHERE idPromemoria = ? AND data = ?'
    );
    $exist->execute([$idPromemoria, $dataOriginale]);
    $existing = $exist->fetch();

    if ($existing) {
        $stmt = $conn->prepare(
            'UPDATE promemoriaEccezioni
             SET nuovaOra = ?, nuovaDurataMin = ?, nuovaData = ?, descrizione = ?, cancellato = ?
             WHERE idPromemoria = ? AND data = ?'
        );
        $stmt->execute([$nuovoInizio, $nuovaDurataMin, $nuovaData, $descrizione, $cancellato, $idPromemoria, $dataOriginale]);
    } else {
        $stmt = $conn->prepare(
            'INSERT INTO promemoriaEccezioni (idPromemoria, data, nuovaOra, nuovaDurataMin, nuovaData, descrizione, cancellato)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$idPromemoria, $dataOriginale, $nuovoInizio, $nuovaDurataMin, $nuovaData, $descrizione, $cancellato]);
    }

    http_response_code(200);
    echo json_encode(['code' => 1, 'desc' => 'Eccezione salvata'], JSON_UNESCAPED_UNICODE);
}

// ── GET: recupera eccezioni filtrate per utente ───────────────────────────
function getPromemoriaEccezione($conn, $user_id)
{
    $idPromemoria = isset($_GET['idPromemoria']) ? intval($_GET['idPromemoria']) : null;

    if ($idPromemoria !== null) {
        // Verifica appartenenza
        $own = $conn->prepare('SELECT id FROM promemorie WHERE id = ? AND idPersona = ?');
        $own->execute([$idPromemoria, $user_id]);
        if (!$own->fetch()) {
            http_response_code(403);
            echo json_encode(['code' => 0, 'desc' => 'Non autorizzato'], JSON_UNESCAPED_UNICODE);
            return;
        }
        $stmt = $conn->prepare(
            'SELECT * FROM promemoriaEccezioni WHERE idPromemoria = ? ORDER BY data ASC'
        );
        $stmt->execute([$idPromemoria]);
    } else {
        // Tutte le eccezioni dei promemoria dell'utente
        $stmt = $conn->prepare(
            'SELECT pe.*
             FROM promemoriaEccezioni pe
             INNER JOIN promemorie p ON p.id = pe.idPromemoria
             WHERE p.idPersona = ?
             ORDER BY pe.data ASC'
        );
        $stmt->execute([$user_id]);
    }

    $data = $stmt->fetchAll(PDO::FETCH_OBJ);
    http_response_code(200);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
}

// ── DELETE: elimina una singola eccezione ─────────────────────────────────
function deletePromemoriaEccezione($conn, $user_id)
{
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) $input = [];

    $id = isset($_GET['id'])   ? intval($_GET['id'])   :
         (isset($input['id']) ? intval($input['id'])   : 0);

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['code' => 0, 'desc' => 'id obbligatorio'], JSON_UNESCAPED_UNICODE);
        return;
    }

    // Verifica che l'eccezione appartenga a un promemoria dell'utente
    $check = $conn->prepare(
        'SELECT pe.id FROM promemoriaEccezioni pe
         INNER JOIN promemorie p ON p.id = pe.idPromemoria
         WHERE pe.id = ? AND p.idPersona = ?'
    );
    $check->execute([$id, $user_id]);
    if (!$check->fetch()) {
        http_response_code(403);
        echo json_encode(['code' => 0, 'desc' => 'Non autorizzato o eccezione non trovata'], JSON_UNESCAPED_UNICODE);
        return;
    }

    $stmt = $conn->prepare('DELETE FROM promemoriaEccezioni WHERE id = ?');
    $stmt->execute([$id]);

    http_response_code(200);
    echo json_encode(['code' => 1, 'desc' => 'Eccezione eliminata'], JSON_UNESCAPED_UNICODE);
}
?>