<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once("common/dbUtil.php");
$method = $_SERVER['REQUEST_METHOD'];

try {
    if(!isset($_SESSION['user'])){
        http_response_code(401);
        echo json_encode(['code'=>0,'desc'=>'utente non loggato'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $pdo = getConnection();

    switch ($method) {
        case 'GET':
            // Restituisce solo i campi pubblici, mai password
            $stm = $pdo->prepare('SELECT id, username, nome, cognome, mail FROM persone ORDER BY cognome ASC, nome ASC');
            $stm->execute();
            $data = $stm->fetchAll(PDO::FETCH_OBJ);
            http_response_code(200);
            echo json_encode($data, JSON_UNESCAPED_UNICODE);
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
