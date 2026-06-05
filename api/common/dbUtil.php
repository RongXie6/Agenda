<?php
$host = 'localhost';
$dbname = 'agendaXie';
$user = 'root';
$pass = '';

function getConnection(){
    global $host, $dbname, $user, $pass;
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_OBJ);
        return $pdo;
    } catch (Throwable $th) {
        http_response_code(500);
        echo json_encode(['error' => 'db error: ' . $th->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
?>
