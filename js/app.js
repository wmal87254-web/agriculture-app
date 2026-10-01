const TODAY=new Date().toISOString().slice(0,10);
const STATUSES=["Booked","Checked In","Waiting","Weighing","Quality Check","Unloading","Payment Pending","Completed","Cancelled","Missed","Rejected","Delayed"];
const CROPS=["Wheat","Rice","Cotton","Maize","Sugarcane"];
const SLOTS=[["08:00","10:00"],["10:00","12:00"],["12:00","14:00"],["14:00","16:00"]];
const users=[
{user_id:1,name:"Ali Farmer",phone:"03001111111",password:"123456",role:"farmer",location:"Sahiwal"},
{user_id:2,name:"Bilal Farmer",phone:"03001111112",password:"123456",role:"farmer",location:"Okara"},
{user_id:3,name:"Staff Ahmed",phone:"03003333333",password:"123456",role:"staff",location:"Lahore"},
{user_id:4,name:"Inspector Sana",phone:"03004444444",password:"123456",role:"inspector",location:"Lahore"},
{user_id:5,name:"Admin Zara",phone:"03005555555",password:"123456",role:"admin",location:"Lahore"}];
const centers=[{center_id:1,center_name:"Lahore Grain Center",location:"Lahore",daily_capacity:80},{center_id:2,center_name:"Multan Procurement Center",location:"Multan",daily_capacity:60}];
let bookings=[],tokenN=0,me=null,page="",flash={},sel={center_id:1,date:TODAY,slot:null,crop:"Wheat",qty:""};
function mk(f,name,crop,qty,slot,status,x){tokenN++;bookings.push(Object.assign({booking_id:tokenN,farmer_id:f,farmer_name:name,center_id:1,slot_date:TODAY,slot_index:slot,crop_type:crop,estimated_quantity:qty,token_number:"TKN-"+String(tokenN).padStart(3,"0"),status},x||{}))}
mk(2,"Bilal Farmer","Rice",6,0,"Completed",{net_weight:5800,quality_grade:"A",moisture:12.5,price_per_kg:95,total_amount:551000,payment_status:"Paid"});
mk(1,"Ali Farmer","Maize",4,0,"Rejected",{net_weight:3900,quality_grade:"C",moisture:19.2});
mk(2,"Bilal Farmer","Wheat",8,1,"Quality Check",{gross_weight:12400,empty_weight:4300,net_weight:8100});
mk(1,"Ali Farmer","Cotton",3,1,"Waiting");mk(2,"Bilal Farmer","Wheat",5,2,"Checked In");mk(1,"Ali Farmer","Wheat",7,3,"Booked");
const $=s=>document.querySelector(s),v=id=>{const e=document.getElementById(id);return e?e.value:""};
const bc=s=>s.toLowerCase().replace(/ /g,"-"),badge=s=>`<span class="badge ${bc(s)}">${s}</span>`;
const nav={farmer:[["book","Slot Book Karein"],["bookings","Meri Bookings"]],staff:[["queue","Aaj ki Queue"]],inspector:[["quality","Quality Check"]],admin:[["dash","Dashboard"]]};
function go(p){page=p;flash={};render()}
function login(){const u=users.find(x=>x.phone===v("ph")&&x.password===v("pw"));if(!u){flash.err="Phone ya password ghalat hai.";return render()}me=u;go(nav[u.role][0][0])}
function logout(){me=null;page="";render()}
function slotsFor(c,d){return SLOTS.map((t,i)=>{const used=bookings.filter(b=>b.center_id==c&&b.slot_date===d&&b.slot_index===i&&!["Cancelled","Missed"].includes(b.status)).reduce((s,b)=>s+b.estimated_quantity,0);const cap=20;return{i,start_time:t[0],end_time:t[1],capacity_tons:cap,booked_tons:used,remaining_tons:cap-used}})}
function book(){const q=parseFloat(sel.qty),s=slotsFor(sel.center_id,sel.date)[sel.slot];flash={};
if(sel.slot===null)flash.err="Pehle slot chuno.";else if(!(q>0))flash.err="Quantity (tons) likho.";else if(q>s.remaining_tons)flash.err="Is slot mein sirf "+s.remaining_tons+" tons baaqi hain.";
else if(bookings.some(b=>b.farmer_id===me.user_id&&b.slot_date===sel.date&&b.slot_index===sel.slot&&b.center_id==sel.center_id&&b.status!=="Cancelled"))flash.err="Is slot mein aap ki booking pehle se hai.";
if(flash.err)return render();
mk(me.user_id,me.name,sel.crop,q,sel.slot,"Booked",{center_id:+sel.center_id,slot_date:sel.date});flash.token=bookings[bookings.length-1];sel.slot=null;sel.qty="";render()}
function setSt(id,s){bookings.find(b=>b.booking_id===id).status=s;render()}
function weigh(id){const g=+v("g"+id),e=+v("e"+id);if(!(g>e&&e>=0))return alert("Gross weight, empty weight se zyada hona chahiye.");Object.assign(bookings.find(b=>b.booking_id===id),{gross_weight:g,empty_weight:e,net_weight:g-e,status:"Quality Check"});render()}
function check(id,ok){const m=+v("m"+id);if(!(m>0))return alert("Moisture (%) likho.");Object.assign(bookings.find(b=>b.booking_id===id),{quality_grade:v("gr"+id),moisture:m,status:ok?"Unloading":"Rejected"});render()}
function receipt(id){const p=+v("p"+id);if(!(p>0))return alert("Rate per kg likho.");const b=bookings.find(x=>x.booking_id===id);Object.assign(b,{price_per_kg:p,total_amount:b.net_weight*p,payment_status:"Pending",status:"Payment Pending"});render()}
function pay(id){const b=bookings.find(x=>x.booking_id===id);b.payment_status="Paid";b.status="Completed";render()}
const money=n=>"Rs "+Number(n).toLocaleString();
const cname=id=>centers.find(c=>c.center_id==id).center_name,tm=b=>SLOTS[b.slot_index].join("-");
function vLogin(){return`<div class="container" style="max-width:420px"><div class="card"><h2 style="color:var(--color-primary);margin-top:0">AgriQueue</h2><p class="hint">Agricultural Procurement &amp; Digital Queue System</p>
<label class="label">Phone</label><input class="input" id="ph" value="03001111111"><label class="label">Password</label><input class="input" id="pw" type="password" value="123456">
<div class="msg-error">${flash.err||""}</div><button class="btn btn-primary" style="width:100%" onclick="login()">Login</button></div>
<div class="card demo"><b>Demo logins</b> <span class="hint">(password 123456)</span><br>${[["03001111111","Farmer"],["03003333333","Staff"],["03004444444","Inspector"],["03005555555","Admin"]].map(d=>`<button class="btn btn-sm btn-accent" onclick="document.getElementById('ph').value='${d[0]}'">${d[1]}</button>`).join("")}</div></div>`}
function vBook(){const sl=slotsFor(sel.center_id,sel.date);const rec=sl.filter(s=>s.remaining_tons>0).sort((a,b)=>b.remaining_tons-a.remaining_tons)[0];
const t=flash.token;return`<div class="container">${t?`<div class="token-card" style="margin-bottom:16px"><div>Aap ka digital token</div><h1>${t.token_number}</h1><div>${cname(t.center_id)} &middot; ${t.slot_date} &middot; ${tm(t)}</div><div>${t.crop_type}, ${t.estimated_quantity} tons</div></div>`:""}
<div class="card"><h3 style="margin-top:0">Slot Book Karein</h3><div class="grid grid-2"><div><label class="label">Center</label><select class="input" onchange="sel.center_id=+this.value;sel.slot=null;render()">${centers.map(c=>`<option value="${c.center_id}" ${c.center_id==sel.center_id?"selected":""}>${c.center_name}</option>`).join("")}</select></div>
<div><label class="label">Tareekh</label><input class="input" type="date" min="${TODAY}" value="${sel.date}" onchange="sel.date=this.value||TODAY;sel.slot=null;render()"></div>
<div><label class="label">Fasal</label><select class="input" onchange="sel.crop=this.value">${CROPS.map(c=>`<option ${c==sel.crop?"selected":""}>${c}</option>`).join("")}</select></div>
<div><label class="label">Andaza (tons)</label><input class="input" type="number" min="1" value="${sel.qty}" oninput="sel.qty=this.value"></div></div>
<label class="label">Slot chuno</label><div class="grid grid-4">${sl.map(s=>{const full=s.remaining_tons<=0;return`<div class="slot ${sel.slot===s.i?"sel":""} ${full?"off":""}" onclick="${full?"":`sel.slot=${s.i};render()`}"><b>${s.start_time}-${s.end_time}</b><div class="hint">${s.remaining_tons} tons baaqi</div>${full?badge("Full"):badge("Available")} ${rec&&rec.i===s.i?badge("Recommended"):""}</div>`}).join("")}</div>
<div class="msg-error">${flash.err||""}</div><button class="btn btn-primary" onclick="book()">Book Karein</button></div></div>`}
function vMine(){const l=bookings.filter(b=>b.farmer_id===me.user_id).reverse();return`<div class="container"><div class="card scroll"><h3 style="margin-top:0">Meri Bookings</h3><table class="table"><tr><th>Token</th><th>Center</th><th>Tareekh / Waqt</th><th>Fasal</th><th>Status</th><th>Final amount</th><th></th></tr>${l.map(b=>`<tr><td>${b.token_number}</td><td>${cname(b.center_id)}</td><td>${b.slot_date} ${tm(b)}</td><td>${b.crop_type} (${b.estimated_quantity}t)</td><td>${badge(b.status)}</td><td>${b.total_amount?money(b.total_amount):"-"}</td><td>${b.status==="Booked"?`<button class="btn btn-sm btn-danger" onclick="setSt(${b.booking_id},'Cancelled')">Cancel</button>`:""}</td></tr>`).join("")||"<tr><td colspan=7>Abhi koi booking nahi. Slot Book Karein se shuru karo.</td></tr>"}</table></div></div>`}
function act(b){const i=b.booking_id,B=(l,s,c)=>`<button class="btn btn-sm ${c||"btn-primary"}" onclick="setSt(${i},'${s}')">${l}</button> `;
switch(b.status){case"Booked":return B("Check In","Checked In")+B("Missed","Missed","btn-danger");case"Checked In":return B("Queue mein daalo","Waiting")+B("Missed","Missed","btn-danger");
case"Waiting":return B("Weighing ke liye bulao","Weighing")+B("Delayed","Delayed","btn-accent");case"Delayed":return B("Queue mein daalo","Waiting");
case"Weighing":return`<input class="input" style="width:90px" id="g${i}" type="number" placeholder="gross kg"> <input class="input" style="width:90px" id="e${i}" type="number" placeholder="empty kg"> <button class="btn btn-sm btn-primary" onclick="weigh(${i})">Save</button>`;
case"Quality Check":return`<span class="hint">Net ${b.net_weight} kg, inspector ka intezar</span>`;
case"Unloading":return`<input class="input" style="width:90px" id="p${i}" type="number" placeholder="Rs/kg"> <button class="btn btn-sm btn-accent" onclick="receipt(${i})">Receipt banao</button>`;
case"Payment Pending":return`<span class="hint">${money(b.total_amount)}</span> <button class="btn btn-sm btn-primary" onclick="pay(${i})">Payment ho gayi</button>`;default:return""}}
function vQueue(){const l=bookings.filter(b=>b.slot_date===TODAY);return`<div class="container"><div class="card scroll"><h3 style="margin-top:0">Aaj ki Queue (${TODAY})</h3><table class="table"><tr><th>Token</th><th>Farmer</th><th>Fasal</th><th>Waqt</th><th>Status</th><th>Kaam</th></tr>${l.map(b=>`<tr><td>${b.token_number}</td><td>${b.farmer_name}</td><td>${b.crop_type} (${b.estimated_quantity}t)</td><td>${tm(b)}</td><td>${badge(b.status)}</td><td>${act(b)}</td></tr>`).join("")||"<tr><td colspan=6>Aaj koi booking nahi.</td></tr>"}</table></div></div>`}
function vQual(){const l=bookings.filter(b=>b.status==="Quality Check");return`<div class="container"><h3>Quality Check (${l.length} baaqi)</h3>${l.map(b=>`<div class="card"><b>${b.token_number}</b> ${b.farmer_name}, ${b.crop_type}, net ${b.net_weight} kg<div class="grid grid-4"><div><label class="label">Grade</label><select class="input" id="gr${b.booking_id}"><option>A</option><option>B</option><option>C</option></select></div><div><label class="label">Moisture %</label><input class="input" id="m${b.booking_id}" type="number" step="0.1"></div></div><div class="row" style="margin-top:10px"><button class="btn btn-primary" onclick="check(${b.booking_id},true)">Accept</button><button class="btn btn-danger" onclick="check(${b.booking_id},false)">Reject</button></div></div>`).join("")||`<div class="card">Koi maal quality check ka intezar nahi kar raha. Staff weighing save karega to yahan nazar aayega.</div>`}</div>`}
function vDash(){const t=bookings.filter(b=>b.slot_date===TODAY),by=f=>t.filter(f).length,cap=centers.reduce((s,c)=>s+c.daily_capacity,0),used=t.filter(b=>!["Cancelled","Missed"].includes(b.status)).reduce((s,b)=>s+b.estimated_quantity,0);
const crop=CROPS.map(c=>[c,bookings.filter(b=>b.crop_type===c&&b.net_weight&&b.status!=="Rejected").reduce((s,b)=>s+b.net_weight,0)]),mx=Math.max(1,...crop.map(c=>c[1]));
const gr=["A","B","C"].map(g=>[g,bookings.filter(b=>b.quality_grade===g).length]);
const S=(n,l)=>`<div class="card"><div class="stat">${n}</div><div class="stat-l">${l}</div></div>`;
return`<div class="container"><div class="grid grid-4">${S(users.filter(u=>u.role==="farmer").length,"Farmers")}${S(t.length,"Aaj ki bookings")}${S(by(b=>b.status==="Waiting"),"Queue mein waiting")}${S(Math.round(used/cap*100)+"%","Capacity use ("+used+"/"+cap+" tons)")}${S(by(b=>b.status==="Completed"),"Completed")}${S(by(b=>b.status==="Rejected"),"Rejected")}</div>
<div class="grid grid-2"><div class="card"><b>Crop received (kg)</b>${crop.map(c=>`<div style="margin-top:8px">${c[0]}: ${c[1]}<div class="bar" style="width:${c[1]/mx*100}%"></div></div>`).join("")}</div>
<div class="card"><b>Grades</b>${gr.map(g=>`<div style="margin-top:8px">Grade ${g[0]}: ${g[1]}<div class="bar" style="width:${g[1]*40}px"></div></div>`).join("")}</div></div></div>`}
function render(){const V={book:vBook,bookings:vMine,queue:vQueue,quality:vQual,dash:vDash};
$("#app").innerHTML=me?`<div class="nav"><b>AgriQueue</b>${nav[me.role].map(n=>`<a class="${page===n[0]?"on":""}" onclick="go('${n[0]}')">${n[1]}</a>`).join("")}<span class="hint" style="color:#fff">${me.name} (${me.role})</span><a onclick="logout()">Logout</a></div>${V[page]()}`:`<div class="nav"><b>AgriQueue</b></div>`+vLogin()}
render();
