<?php
// Ek dafa chalao: demo users (password 123456) aur kuch aaj ki bookings banata hai
require 'db.php';
$hash = password_hash('123456', PASSWORD_BCRYPT);
foreach ([['Ali Farmer', '03001111111', 'farmer', 'Sahiwal'], ['Bilal Farmer', '03001111112', 'farmer', 'Okara'],
  ['Staff Ahmed', '03003333333', 'staff', 'Karachi'], ['Inspector Sana', '03004444444', 'inspector', 'Karachi'], ['Admin Zara', '03005555555', 'admin', 'Karachi']] as $x)
  q('INSERT INTO users (name,phone,password,role,location) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),password=VALUES(password),role=VALUES(role)', [$x[0], $x[1], $hash, $x[2], $x[3]]);
$c = (int)q('SELECT center_id FROM centers ORDER BY center_id LIMIT 1')->fetchColumn();
ensure_slots($c, today());
if (!q('SELECT COUNT(*) FROM bookings')->fetchColumn()) {
  $s = q('SELECT slot_id FROM time_slots WHERE center_id=? AND slot_date=? ORDER BY start_time', [$c, today()])->fetchAll(PDO::FETCH_COLUMN);
  $f = q("SELECT user_id FROM users WHERE phone IN ('03001111111','03001111112') ORDER BY phone")->fetchAll(PDO::FETCH_COLUMN);
  foreach ([[0, 0, 'Wheat', 8, 'Checked In'], [1, 0, 'Rice', 5, 'Waiting'], [0, 1, 'Cotton', 6, 'Booked'], [1, 2, 'Maize', 4, 'Booked']] as $x) {
    q('INSERT INTO bookings (farmer_id,center_id,slot_id,crop_type,estimated_quantity,status) VALUES (?,?,?,?,?,?)', [$f[$x[0]], $c, $s[$x[1]], $x[2], $x[3], $x[4]]);
    $id = $pdo->lastInsertId();
    q('UPDATE bookings SET token_number=? WHERE booking_id=?', ['TKN-' . str_pad($id, 3, '0', STR_PAD_LEFT), $id]);
    q('UPDATE time_slots SET booked_tons=booked_tons+? WHERE slot_id=?', [$x[3], $s[$x[1]]]);
  }
}
echo 'Seed mukammal. Ab <a href="index.html">index.html</a> kholo.';
