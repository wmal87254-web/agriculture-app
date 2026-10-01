// app.js ke data wale functions yahan dobara likhe hain, ab woh PHP (api.php) se MySQL tak jaate hain.
async function api(action, data) {
  try {
    const r = await fetch('api.php?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) });
    return await r.json();
  } catch (e) {
    return { error: 'Server se baat nahi ho pa rahi. Page http://localhost/... se kholo aur XAMPP mein Apache aur MySQL chalao.' };
  }
}
const bad = r => { if (r.error) { alert(r.error); return true; } return false; };
let slotCache = [], slotKey = '';
function slotsFor(c, d) {
  const k = c + '|' + d;
  if (k !== slotKey) { slotKey = k; slotCache = []; api('slots', { center_id: +c, date: d }).then(r => { slotCache = r.slots || []; render(); }); }
  return slotCache;
}
async function load() {
  const r = await api('bookings'); if (bad(r)) return;
  bookings.length = 0; bookings.push(...r.bookings); users.length = 0; users.push(...r.farmers); render();
}
async function login() {
  const r = await api('login', { phone: v('ph'), password: v('pw') });
  if (r.error) { flash.err = r.error; return render(); }
  me = r.user; await load(); go(nav[me.role][0][0]);
}
async function logout() { await api('logout'); me = null; page = ''; render(); }
async function book() {
  flash = {}; const q = parseFloat(sel.qty);
  if (sel.slot === null) flash.err = 'Pehle slot chuno.'; else if (!(q > 0)) flash.err = 'Quantity (tons) likho.';
  if (flash.err) return render();
  const r = await api('book', { center_id: +sel.center_id, date: sel.date, slot_index: sel.slot, crop_type: sel.crop, estimated_quantity: q });
  slotKey = '';
  if (r.error) { flash.err = r.error; return render(); }
  flash.token = { token_number: r.token_number, center_id: +sel.center_id, slot_date: sel.date, slot_index: sel.slot, crop_type: sel.crop, estimated_quantity: q };
  sel.slot = null; sel.qty = ''; await load();
}
async function setSt(id, s) { const r = await api('status', { booking_id: id, status: s }); bad(r); await load(); }
async function weigh(id) {
  const g = +v('g' + id), e = +v('e' + id);
  if (!(g > e && e >= 0)) return alert('Gross weight, empty weight se zyada hona chahiye.');
  bad(await api('weigh', { booking_id: id, gross_weight: g, empty_weight: e })); await load();
}
async function check(id, ok) {
  const m = +v('m' + id); if (!(m > 0)) return alert('Moisture (%) likho.');
  bad(await api('quality', { booking_id: id, grade: v('gr' + id), moisture: m, result: ok ? 'Accepted' : 'Rejected' })); await load();
}
async function receipt(id) {
  const p = +v('p' + id); if (!(p > 0)) return alert('Rate per kg likho.');
  bad(await api('receipt', { booking_id: id, price_per_kg: p })); await load();
}
async function pay(id) { bad(await api('pay', { booking_id: id })); await load(); }
(async () => {
  const r = await api('init'); if (r.error) { flash.err = r.error; return render(); }
  centers.length = 0; centers.push(...r.centers); sel.center_id = centers[0].center_id;
  if (r.user) { me = r.user; await load(); go(nav[me.role][0][0]); } else render();
})();
