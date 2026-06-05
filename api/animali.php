<?php
header('Content-Type: application/json; charset=utf-8');

$db = file_get_contents(__DIR__ . '/db.json');
if ($db === false) {
    http_response_code(500);
    echo json_encode(['error' => 'db.json non trovato']);
    exit;
}

$animali = json_decode($db, true)['animal'] ?? [];
shuffle($animali);
echo json_encode(array_slice($animali, 0, 9));
?>
