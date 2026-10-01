<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
function out($a) { echo json_encode($a); exit; }
function fail($m) { out(['error' => $m]); }
try { require 'db.php'; } catch (Throwable $e) { fail('Database se connect nahi hua. XAMPP mein MySQL Start karo.'); }
$d = json_decode(file_get_contents('php://input'), true) ?: [];
$a = $_GET['action'] ?? '';
$u = $_SESSION['user'] ?? null;
function need($roles = null) {
  global $u;
  if (!$u) fail('Pehle login karo.');
  if ($roles && !in_array($u['role'], (array)$roles)) fail('Is kaam ki ijazat nahi.');
}
function bk($id) { return q('SELECT * FROM bookings WHERE booking_id=?', [(int)$id])->fetch(); }
function setst($id, $s) { q('UPDATE bookings SET status=? WHERE booking_id=?', [$s, $id]); }
try {
  switch ($a) {
    case 'init':
      out(['user' => $u, 'centers' => array_map(function ($c) { return ['center_id' => (int)$c['center_id'], 'center_name' => $c['center_name'], 'location' => $c['location'], 'daily_capacity' => (int)$c['daily_capacity']]; }, q('SELECT * FROM centers ORDER BY center_id')->fetchAll())]);
    case 'login':
      $r = q('SELECT * FROM users WHERE phone=?', [trim($d['phone'] ?? '')])->fetch();
      if (!$r || !password_verify($d['password'] ?? '', $r['password'])) fail('Phone ya password ghalat hai.');
      $_SESSION['user'] = ['user_id' => (int)$r['user_id'], 'name' => $r['name'], 'role' => $r['role']];
      out(['user' => $_SESSION['user']]);
    case 'logout':
      session_destroy(); out(['ok' => 1]);
    case 'slots':
      need();
      $c = (int)($d['center_id'] ?? 1); $dt = $d['date'] ?? '';
      if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dt) || $dt < today()) $dt = today();
      ensure_slots($c, $dt);
      $list = [];
      foreach (q('SELECT * FROM time_slots WHERE center_id=? AND slot_date=? ORDER BY start_time', [$c, $dt])->fetchAll() as $s) {
        $i = array_search(substr($s['start_time'], 0, 5), array_column(SLOT_TIMES, 0));
        $list[] = ['i' => (int)$i, 'start_time' => substr($s['start_time'], 0, 5), 'end_time' => substr($s['end_time'], 0, 5), 'capacity_tons' => (int)$s['capacity_tons'],
          'booked_tons' => (float)$s['booked_tons'], 'remaining_tons' => (float)$s['capacity_tons'] - (float)$s['booked_tons']];
      }
      out(['slots' => $list]);
    case 'bookings':
      need();
      $w = $u['role'] === 'farmer' ? 'WHERE b.farmer_id=' . (int)$u['user_id'] : '';
      $rows = q("SELECT b.booking_id,b.farmer_id,us.name farmer_name,b.center_id,ts.slot_date,ts.start_time,b.crop_type,b.estimated_quantity,b.token_number,b.status,
        w.net_weight,qc.grade quality_grade,qc.moisture,p.price_per_kg,p.total_amount,p.payment_status
        FROM bookings b JOIN users us ON us.user_id=b.farmer_id JOIN time_slots ts ON ts.slot_id=b.slot_id
        LEFT JOIN weighing_records w ON w.booking_id=b.booking_id LEFT JOIN quality_checks qc ON qc.booking_id=b.booking_id
        LEFT JOIN procurement_records p ON p.booking_id=b.booking_id $w ORDER BY b.booking_id")->fetchAll();
      foreach ($rows as &$r) {
        $i = array_search(substr($r['start_time'], 0, 5), array_column(SLOT_TIMES, 0)); $r['slot_index'] = $i === false ? 0 : $i;
        foreach (['booking_id', 'farmer_id', 'center_id', 'net_weight'] as $k) if ($r[$k] !== null) $r[$k] = (int)$r[$k];
        foreach (['estimated_quantity', 'moisture', 'price_per_kg', 'total_amount'] as $k) if ($r[$k] !== null) $r[$k] = (float)$r[$k];
      }
      $f = array_map(function ($x) { return ['user_id' => (int)$x, 'role' => 'farmer']; }, q("SELECT user_id FROM users WHERE role='farmer'")->fetchAll(PDO::FETCH_COLUMN));
      out(['bookings' => $rows, 'farmers' => $f]);
    case 'book':
      need('farmer');
      $c = (int)($d['center_id'] ?? 0); $dt = $d['date'] ?? ''; $t = SLOT_TIMES[(int)($d['slot_index'] ?? -1)] ?? null;
      $crop = $d['crop_type'] ?? ''; $qty = (float)($d['estimated_quantity'] ?? 0);
      if (!$t || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dt) || $dt < today() || !in_array($crop, ['Wheat', 'Rice', 'Cotton', 'Maize', 'Sugarcane']) || $qty <= 0) fail('Slot, tareekh, fasal aur quantity theek se chuno.');
      ensure_slots($c, $dt);
      $s = q('SELECT * FROM time_slots WHERE center_id=? AND slot_date=? AND start_time=?', [$c, $dt, $t[0] . ':00'])->fetch();
      if (!$s) fail('Slot nahi mila.');
      if ($qty > $s['capacity_tons'] - $s['booked_tons']) fail('Is slot mein sirf ' . ($s['capacity_tons'] - $s['booked_tons']) . ' tons baaqi hain.');
      if (q("SELECT COUNT(*) FROM bookings WHERE farmer_id=? AND slot_id=? AND status<>'Cancelled'", [$u['user_id'], $s['slot_id']])->fetchColumn()) fail('Is slot mein aap ki booking pehle se hai.');
      $pdo->beginTransaction();
      q('INSERT INTO bookings (farmer_id,center_id,slot_id,crop_type,estimated_quantity) VALUES (?,?,?,?,?)', [$u['user_id'], $c, $s['slot_id'], $crop, $qty]);
      $id = $pdo->lastInsertId(); $tok = 'TKN-' . str_pad($id, 3, '0', STR_PAD_LEFT);
      q('UPDATE bookings SET token_number=? WHERE booking_id=?', [$tok, $id]);
      q('UPDATE time_slots SET booked_tons=booked_tons+? WHERE slot_id=?', [$qty, $s['slot_id']]);
      $pdo->commit();
      out(['token_number' => $tok]);
    case 'status':
      need(); $b = bk($d['booking_id'] ?? 0); $to = $d['status'] ?? '';
      $flow = ['Booked' => ['Checked In', 'Missed', 'Cancelled'], 'Checked In' => ['Waiting', 'Missed'], 'Waiting' => ['Weighing', 'Delayed'], 'Delayed' => ['Waiting']];
      if (!$b || !in_array($to, $flow[$b['status']] ?? [])) fail('Yeh status badalna mumkin nahi.');
      if ($to === 'Cancelled') {
        need('farmer'); if ((int)$b['farmer_id'] !== $u['user_id']) fail('Yeh aap ki booking nahi.');
        q('UPDATE time_slots SET booked_tons=booked_tons-? WHERE slot_id=?', [$b['estimated_quantity'], $b['slot_id']]);
      } else need('staff');
      setst($b['booking_id'], $to); out(['ok' => 1]);
    case 'weigh':
      need('staff'); $b = bk($d['booking_id'] ?? 0); $g = (int)($d['gross_weight'] ?? 0); $e = (int)($d['empty_weight'] ?? 0);
      if (!$b || $b['status'] !== 'Weighing') fail('Yeh booking weighing par nahi hai.');
      if ($g <= $e || $e < 0) fail('Gross weight, empty weight se zyada hona chahiye.');
      q('INSERT INTO weighing_records (booking_id,gross_weight,empty_weight,net_weight) VALUES (?,?,?,?)', [$b['booking_id'], $g, $e, $g - $e]);
      setst($b['booking_id'], 'Quality Check'); out(['ok' => 1]);
    case 'quality':
      need('inspector'); $b = bk($d['booking_id'] ?? 0); $gr = $d['grade'] ?? ''; $m = (float)($d['moisture'] ?? 0); $ok = ($d['result'] ?? '') === 'Accepted';
      if (!$b || $b['status'] !== 'Quality Check') fail('Yeh booking quality check par nahi hai.');
      if (!in_array($gr, ['A', 'B', 'C']) || $m <= 0) fail('Grade aur moisture theek se likho.');
      q('INSERT INTO quality_checks (booking_id,grade,moisture,result) VALUES (?,?,?,?)', [$b['booking_id'], $gr, $m, $ok ? 'Accepted' : 'Rejected']);
      setst($b['booking_id'], $ok ? 'Unloading' : 'Rejected'); out(['ok' => 1]);
    case 'receipt':
      need('staff'); $b = bk($d['booking_id'] ?? 0); $p = (float)($d['price_per_kg'] ?? 0);
      if (!$b || $b['status'] !== 'Unloading' || $p <= 0) fail('Receipt ke liye rate per kg likho.');
      $w = (int)q('SELECT net_weight FROM weighing_records WHERE booking_id=? ORDER BY weigh_id DESC', [$b['booking_id']])->fetchColumn();
      $g = q('SELECT grade FROM quality_checks WHERE booking_id=? ORDER BY quality_id DESC', [$b['booking_id']])->fetchColumn();
      q('INSERT INTO procurement_records (booking_id,actual_weight,quality_grade,price_per_kg,total_amount) VALUES (?,?,?,?,?)', [$b['booking_id'], $w, $g, $p, $w * $p]);
      setst($b['booking_id'], 'Payment Pending'); out(['ok' => 1]);
    case 'pay':
      need('staff'); $b = bk($d['booking_id'] ?? 0);
      if (!$b || $b['status'] !== 'Payment Pending') fail('Payment abhi mumkin nahi.');
      q("UPDATE procurement_records SET payment_status='Paid', completed_at=NOW() WHERE booking_id=?", [$b['booking_id']]);
      setst($b['booking_id'], 'Completed'); out(['ok' => 1]);
    default: fail('Unknown action.');
  }
} catch (Throwable $e) { fail('Server error: ' . $e->getMessage()); }
