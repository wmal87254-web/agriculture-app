<?php
// MySQL se connection (XAMPP ka default: user root, password khali)
$pdo = new PDO('mysql:host=127.0.0.1;dbname=agri_queue;charset=utf8mb4', 'root', '', [
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
const SLOT_TIMES = [['08:00', '10:00'], ['10:00', '12:00'], ['12:00', '14:00'], ['14:00', '16:00']];
function q($sql, $p = []) { global $pdo; $s = $pdo->prepare($sql); $s->execute($p); return $s; }
function today() { return gmdate('Y-m-d'); } // JavaScript ki TODAY jaisi (UTC) tareekh
function ensure_slots($c, $d) {
  $cap = (int)(q('SELECT daily_capacity FROM centers WHERE center_id=?', [$c])->fetchColumn() / 4);
  foreach (SLOT_TIMES as $t)
    q('INSERT IGNORE INTO time_slots (center_id,slot_date,start_time,end_time,capacity_tons) VALUES (?,?,?,?,?)', [$c, $d, $t[0], $t[1], $cap]);
}
