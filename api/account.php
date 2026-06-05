<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once("common/dbUtil.php");

$method = $_SERVER['REQUEST_METHOD'];

function accountInput(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

try {
    $pdo = getConnection();

    switch ($method) {

        case 'GET':
            if (isset($_SESSION['user'])) {
                http_response_code(200);
                echo json_encode([
                    'code'     => 1,
                    'username' => $_SESSION['user']->username ?? '',
                    'user'     => $_SESSION['user'],
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            http_response_code(200);
            echo json_encode(['code' => 0, 'desc' => 'Utente non loggato'], JSON_UNESCAPED_UNICODE);
            exit;

        case 'POST':
            $data     = accountInput();
            $mail     = trim($data['mail']     ?? '');
            $password = trim($data['password'] ?? '');

            if ($mail === '' || $password === '') {
                http_response_code(200);
                echo json_encode(['code' => 0, 'desc' => 'Email e password obbligatorie'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $stm = $pdo->prepare(
                'SELECT id, username, nome, cognome, mail, password
                 FROM persone
                 WHERE mail = :mail
                 LIMIT 1'
            );
            $stm->execute(['mail' => $mail]);
            $user = $stm->fetch(PDO::FETCH_OBJ);

            if ($user && password_verify($password, $user->password)) {
                $sessionUser = clone $user;
                unset($sessionUser->password);

                $_SESSION['user'] = $sessionUser;

                http_response_code(200);
                echo json_encode([
                    'code' => 1,
                    'desc' => 'Accesso effettuato',
                    'user' => $sessionUser,
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            http_response_code(200);
            echo json_encode(['code' => 0, 'desc' => 'Email o password non corretti'], JSON_UNESCAPED_UNICODE);
            exit;

        case 'PUT':
            $data = accountInput();

            $mail     = trim($data['mail']     ?? '');
            $password = $data['password'] ?? '';
            $username = trim($data['username'] ?? $data['nickname'] ?? $data['userName'] ?? '');
            $nome     = trim($data['nome']     ?? '');
            $cognome  = trim($data['cognome']  ?? '');
            $telefono = trim((string)($data['telefono'] ?? ''));

            if ($mail === '' || $password === '' || $username === '') {
                http_response_code(200);
                echo json_encode([
                    'code' => 0,
                    'desc' => 'Email, password e username sono obbligatori',
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if (!filter_var($mail, FILTER_VALIDATE_EMAIL)) {
                http_response_code(200);
                echo json_encode(['code' => 0, 'desc' => 'Formato email non valido'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if (strlen($password) < 8) {
                http_response_code(200);
                echo json_encode([
                    'code' => 0,
                    'desc' => 'La password deve essere di almeno 8 caratteri',
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if (strlen($username) < 3) {
                http_response_code(200);
                echo json_encode([
                    'code' => 0,
                    'desc' => 'Lo username deve essere di almeno 3 caratteri',
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $checkMail = $pdo->prepare('SELECT id FROM persone WHERE mail = ? LIMIT 1');
            $checkMail->execute([$mail]);
            if ($checkMail->fetch()) {
                http_response_code(200);
                echo json_encode(['code' => 0, 'desc' => 'Email già registrata'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $checkUser = $pdo->prepare('SELECT id FROM persone WHERE username = ? LIMIT 1');
            $checkUser->execute([$username]);
            if ($checkUser->fetch()) {
                http_response_code(200);
                echo json_encode(['code' => 0, 'desc' => 'Username già in uso, scegline un altro'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

            $stm = $pdo->prepare(
                'INSERT INTO persone (mail, password, username, nome, cognome, telefono)
                 VALUES (:mail, :password, :username, :nome, :cognome, :telefono)'
            );

            $stm->execute([
                'mail'     => $mail,
                'password' => $hashedPassword,
                'username' => $username,
                'nome'     => $nome,
                'cognome'  => $cognome,
                'telefono' => $telefono,
            ]);

            http_response_code(200);
            echo json_encode(['code' => 1, 'desc' => 'Account creato con successo'], JSON_UNESCAPED_UNICODE);
            exit;

        case 'PATCH':
            if (!isset($_SESSION['user'])) {
                http_response_code(401);
                echo json_encode(['code' => 0, 'desc' => 'Non autenticato'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $data   = accountInput();
            $userId = $_SESSION['user']->id;

            $fields = [];
            $params = ['id' => $userId];

            if (isset($data['nome'])) {
                $fields[] = 'nome = :nome';
                $params['nome'] = trim($data['nome']);
            }
            if (isset($data['cognome'])) {
                $fields[] = 'cognome = :cognome';
                $params['cognome'] = trim($data['cognome']);
            }
            if (isset($data['telefono'])) {
                $fields[] = 'telefono = :telefono';
                $params['telefono'] = trim((string)$data['telefono']);
            }

            if (!empty($data['newPassword'])) {
                if (strlen($data['newPassword']) < 8) {
                    http_response_code(200);
                    echo json_encode(['code' => 0, 'desc' => 'La nuova password deve essere di almeno 8 caratteri'], JSON_UNESCAPED_UNICODE);
                    exit;
                }

                $fields[] = 'password = :password';
                $params['password'] = password_hash($data['newPassword'], PASSWORD_BCRYPT);
            }

            if (empty($fields)) {
                http_response_code(200);
                echo json_encode(['code' => 0, 'desc' => 'Nessun campo da aggiornare'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $sql = 'UPDATE persone SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $stm = $pdo->prepare($sql);
            $stm->execute($params);

            http_response_code(200);
            echo json_encode(['code' => 1, 'desc' => 'Profilo aggiornato'], JSON_UNESCAPED_UNICODE);
            exit;

        case 'DELETE':
            $_SESSION = [];
            session_destroy();

            http_response_code(200);
            echo json_encode(['code' => 1, 'desc' => 'Logout effettuato'], JSON_UNESCAPED_UNICODE);
            exit;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Metodo non consentito'], JSON_UNESCAPED_UNICODE);
            exit;
    }

} catch (Throwable $th) {
    error_log('[account.php] ' . $th->getMessage());

    http_response_code(500);
    echo json_encode(['error' => 'Errore interno del server'], JSON_UNESCAPED_UNICODE);
    exit;
}
?>