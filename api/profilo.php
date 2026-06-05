<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once("common/dbUtil.php");
$method = $_SERVER['REQUEST_METHOD'];

function profiloInput(){
    $raw = file_get_contents('php://input');
    if($raw === false || trim($raw) === ''){
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

try {
    if(!isset($_SESSION['user'])){
        echo json_encode(['code'=>0], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $pdo = getConnection();
    $user_id = $_SESSION['user']->id;

    switch ($method) {
        case 'GET':
            $stm = $pdo->prepare('SELECT nome, cognome, username, mail, telefono FROM persone WHERE id = ?');
            $stm->execute([$user_id]);
            $utente = $stm->fetch(PDO::FETCH_OBJ);
            http_response_code(200);
            echo json_encode(['code'=>1, 'utente'=>$utente], JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $data     = profiloInput();
            $nome     = trim($data['nome']     ?? '');
            $cognome  = trim($data['cognome']  ?? '');
            $mail     = trim($data['mail']     ?? '');
            $username = trim($data['username'] ?? '');
            $telefono = trim((string)($data['telefono'] ?? ''));
            $password =      $data['password'] ?? '';   // NON trimmare la password

            // ── Validazioni ──────────────────────────────────────
            if ($mail === '' || $username === '') {
                http_response_code(400);
                echo json_encode(['code'=>0, 'desc'=>'Email e username sono obbligatori'], JSON_UNESCAPED_UNICODE);
                break;
            }

            if (!filter_var($mail, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['code'=>0, 'desc'=>'Formato email non valido'], JSON_UNESCAPED_UNICODE);
                break;
            }

            if (strlen($username) < 3) {
                http_response_code(400);
                echo json_encode(['code'=>0, 'desc'=>'Lo username deve essere di almeno 3 caratteri'], JSON_UNESCAPED_UNICODE);
                break;
            }

            // ── Controlla email duplicata (escludendo l'utente corrente) ──
            $chkMail = $pdo->prepare('SELECT id FROM persone WHERE mail = ? AND id != ? LIMIT 1');
            $chkMail->execute([$mail, $user_id]);
            if ($chkMail->fetch()) {
                http_response_code(400);
                echo json_encode(['code'=>0, 'desc'=>'Email già in uso da un altro account'], JSON_UNESCAPED_UNICODE);
                break;
            }

            // ── Controlla username duplicato (escludendo l'utente corrente) ──
            $chkUser = $pdo->prepare('SELECT id FROM persone WHERE username = ? AND id != ? LIMIT 1');
            $chkUser->execute([$username, $user_id]);
            if ($chkUser->fetch()) {
                http_response_code(400);
                echo json_encode(['code'=>0, 'desc'=>'Username già in uso, scegline un altro'], JSON_UNESCAPED_UNICODE);
                break;
            }

            if ($password === '') {
                // Nessun cambio password
                $stm = $pdo->prepare(
                    'UPDATE persone SET nome=?, cognome=?, mail=?, username=?, telefono=? WHERE id=?'
                );
                $stm->execute([$nome, $cognome, $mail, $username, $telefono, $user_id]);
            } else {
                // Cambio password: validazione + hash bcrypt
                if (strlen($password) < 8) {
                    http_response_code(400);
                    echo json_encode(['code'=>0, 'desc'=>'La password deve essere di almeno 8 caratteri'], JSON_UNESCAPED_UNICODE);
                    break;
                }
                $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
                $stm = $pdo->prepare(
                    'UPDATE persone SET nome=?, cognome=?, mail=?, username=?, telefono=?, password=? WHERE id=?'
                );
                $stm->execute([$nome, $cognome, $mail, $username, $telefono, $hashedPassword, $user_id]);
            }

            // ── Aggiorna sessione (MAI salvare password o hash) ──
            $_SESSION['user']->nome     = $nome;
            $_SESSION['user']->cognome  = $cognome;
            $_SESSION['user']->mail     = $mail;
            $_SESSION['user']->username = $username;

            http_response_code(200);
            echo json_encode(['code'=>1, 'desc'=>'Profilo aggiornato'], JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error'=>'metodo non consentito'], JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Throwable $th) {
    http_response_code(500);
    echo json_encode(['error'=>'db error: ' . $th->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
