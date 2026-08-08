const CFG={id:"1clhhPSSb9z-tgGbpSNjk_fwWZjr02moi2qJneyWkzzQ",sheet:"INPUT DATA"};
let H=[],R=[],map=null;
const $=x=>document.getElementById(x), n=x=>String(x??"").trim().toLowerCase();
function cols(){
 let exact=(...names)=>{for(const x of names){let i=H.findIndex(h=>n(h)===n(x));if(i>=0)return i}return -1};
 let partial=(...names)=>{for(const x of names){let i=H.findIndex(h=>n(h).includes(n(x)));if(i>=0)return i}return -1};
 return{
  kab:exact("Kab/Kota","Kabupaten/Kota","Kab Kota"),
  kec:exact("Kecamatan"), desa:exact("Desa/Kel","Desa/Kelurahan"),
  kode:exact("Kode Desa/Kel","Kode Desa/Kelurahan"), tahun:exact("Tahun"),
  lat:exact("Latitude"), lon:exact("Longitude"), ancaman:exact("Ancaman"),
  sumber:exact("Sumber Dana"),
  status:partial("PEMBENTUKAN / PENGUATAN","PEMBENTUKAN/PENGUATAN","PEMBENTUKAN","PENGUATAN")
 };
}
function fmt(x){return Number(x||0).toLocaleString("id-ID")}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function load(){
 $("connection").textContent="● Menghubungkan data...";
 const u=`https://docs.google.com/spreadsheets/d/${CFG.id}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CFG.sheet)}`;
 try{
  const r=await fetch(u);if(!r.ok)throw Error();
  const t=await r.text(),j=JSON.parse(t.slice(t.indexOf("{"),t.lastIndexOf("}")+1));
  H=j.table.cols.map(c=>c.label||c.id||"");
  R=j.table.rows.map(x=>x.c.map(c=>c?(c.f??c.v??""):""));
  $("connection").className="connection ok";$("connection").textContent="● Data Google Sheets terhubung";render();
 }catch(e){
  $("connection").className="connection bad";$("connection").textContent="● Gagal membaca data";
  toast("Pastikan Google Sheets dapat dilihat oleh siapa saja yang memiliki link.")
 }
}
function uniq(i){return i<0?0:new Set(R.map(x=>n(x[i])).filter(Boolean)).size}
function coord(a,b){a=parseFloat(a);b=parseFloat(b);return Number.isFinite(a)&&Number.isFinite(b)&&a>=-11&&a<=7&&b>=94&&b<=142}
function render(){
 const c=cols(),total=R.length,kab=uniq(c.kab),desa=uniq(c.desa),year=uniq(c.tahun);
 $("sTotal").textContent=fmt(total);$("sKab").textContent=fmt(kab);$("sDesa").textContent=fmt(desa);$("sYear").textContent=fmt(year);
 $("dTotal").textContent=fmt(total);$("dKab").textContent=fmt(kab);$("dDesa").textContent=fmt(desa);$("dYear").textContent=fmt(year);
 chart(c.kab);filters(c);table(c);drawMap(c);
}
function chart(i){
 let box=$("chart");box.innerHTML="";if(i<0)return;
 let d={};R.forEach(r=>{let x=String(r[i]||"Tidak diketahui").trim();d[x]=(d[x]||0)+1});
 let a=Object.entries(d).sort((x,y)=>y[1]-x[1]).slice(0,10),m=a[0]?.[1]||1;
 a.forEach(([x,v])=>box.insertAdjacentHTML("beforeend",`<div class="barrow"><span>${esc(x.slice(0,26))}</span><div class="bar"><i style="width:${Math.max(7,v/m*100)}%"></i></div><b>${fmt(v)}</b></div>`))
}
function filters(c){
 let k=$("kab"),y=$("year"),s=$("status");
 k.innerHTML='<option value="">Semua Kabupaten/Kota</option>';y.innerHTML='<option value="">Semua Tahun</option>';s.innerHTML='<option value="">Semua Status</option>';
 if(c.kab>=0)[...new Set(R.map(r=>String(r[c.kab]||"").trim()).filter(Boolean))].sort().forEach(x=>k.insertAdjacentHTML("beforeend",`<option>${esc(x)}</option>`));
 if(c.tahun>=0)[...new Set(R.map(r=>String(r[c.tahun]||"").trim()).filter(Boolean))].sort().reverse().forEach(x=>y.insertAdjacentHTML("beforeend",`<option>${esc(x)}</option>`));
 if(c.status>=0)[...new Set(R.map(r=>String(r[c.status]||"").trim()).filter(Boolean))].sort().forEach(x=>s.insertAdjacentHTML("beforeend",`<option>${esc(x)}</option>`));
 k.onchange=y.onchange=s.onchange=table;
}
function findHeader(name){let i=H.findIndex(h=>n(h)===n(name));if(i>=0)return i;return H.findIndex(h=>n(h).includes(n(name)))}
function table(c=cols()){
 let q=n($("search").value),kf=n($("kab").value),yf=n($("year").value),sf=n($("status").value);
 let a=R.map((r,i)=>({r,i})).filter(o=>{let r=o.r;return(!q||r.join(" ").toLowerCase().includes(q))&&(!kf||n(r[c.kab])===kf)&&(!yf||n(r[c.tahun])===yf)&&(!sf||n(r[c.status])===sf)});
 let v=[c.kab,c.kec,c.desa,c.tahun,c.ancaman,c.sumber,c.status].filter(i=>i>=0);
 $("table").querySelector("thead").innerHTML="<tr>"+v.map(i=>`<th>${esc(H[i])}</th>`).join("")+"</tr>";
 $("table").querySelector("tbody").innerHTML=a.slice(0,250).map(o=>"<tr class='clickrow' data-row='"+o.i+"'>"+v.map(i=>`<td>${esc(o.r[i])}</td>`).join("")+"</tr>").join("");
 $("table").querySelectorAll("tbody tr").forEach(tr=>tr.onclick=()=>showDetail(+tr.dataset.row));
 $("info").textContent=`Menampilkan ${fmt(Math.min(250,a.length))} dari ${fmt(a.length)} data`;
}
function showDetail(rowIndex){
 const c=cols(),r=R[rowIndex];if(!r)return;
 $("detailTitle").textContent=`${r[c.desa]||"DESTANA"} — ${r[c.kab]||""}`;
 const preferred=[c.kab,c.kec,c.desa,c.kode,findHeader("Kode Kab/Kota"),findHeader("Kode Kecamatan"),c.lat,c.lon,findHeader("Bulan"),c.tahun,c.ancaman,c.sumber,findHeader("Keterangan"),c.status,findHeader("Ketua Forum PRB"),findHeader("Nomor HP"),findHeader("DOKUMEN"),findHeader("Kelas"),findHeader("SKOR"),findHeader("PKD"),findHeader("Kajian Risiko Bencana + Peta"),findHeader("RPB"),findHeader("FRB"),findHeader("PFRB"),findHeader("Pembentukan Tim Relawan Desa"),findHeader("Sistem Peringatan Dini"),findHeader("Rencana Evakuasi + Peta"),findHeader("Rencana Kontingensi"),findHeader("Simulasi/Gladi Lapangan"),findHeader("Rencana Pemulihan")];
 const ids=[...new Set(preferred.filter(i=>i>=0))];
 $("detailGrid").innerHTML=ids.map(i=>`<div class="detailitem"><label>${esc(H[i])}</label><div>${esc(r[i]||"—")}</div></div>`).join("");
 $("detailModal").classList.add("show");
}
function drawMap(c){
 if(map)map.remove();map=L.map("map",{scrollWheelZoom:false}).setView([-7.15,110.4],8);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map);
 if(c.lat<0||c.lon<0)return;let pts=[];
 R.forEach(r=>{if(coord(r[c.lat],r[c.lon])){let p=[+r[c.lat],+r[c.lon]],m=L.marker(p).addTo(map);m.bindPopup(`<b>${esc(r[c.desa]||"DESTANA")}</b><br>${esc(r[c.kab]||"")}`);pts.push(p)}});
 if(pts.length)map.fitBounds(pts,{padding:[20,20],maxZoom:11});
}
$("closeModal").onclick=()=>$("detailModal").classList.remove("show");
$("detailModal").onclick=e=>{if(e.target.id==="detailModal")$("detailModal").classList.remove("show")};
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("detailModal").classList.remove("show")});
function go(p){
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(p).classList.add("active");
 document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));
 let t={dashboard:"Dashboard Pencegahan & Kesiapsiagaan",destana:"Desa Tangguh Bencana",ews:"Early Warning System",spab:"Satuan Pendidikan Aman Bencana",lidi:"Unit LIDI Jawa Tengah",dokumen:"Dokumen Kebencanaan",peta:"Peta Kebencanaan",edukasi:"Edukasi Kebencanaan"};
 $("title").textContent=t[p];$("sidebar").classList.remove("open");if(p==="dashboard"&&map)setTimeout(()=>map.invalidateSize(),100);
}
function toast(x){let t=$("toast");t.textContent=x;t.style.display="block";setTimeout(()=>t.style.display="none",4500)}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.page));
document.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>go(b.dataset.jump));
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");$("search").oninput=()=>table();$("refresh").onclick=load;load();
