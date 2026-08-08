const CFG={id:"1clhhPSSb9z-tgGbpSNjk_fwWZjr02moi2qJneyWkzzQ",sheet:"INPUT DATA"};
let H=[],R=[],map=null;
const $=x=>document.getElementById(x), n=x=>String(x??"").trim().toLowerCase();
function find(...terms){let i=H.findIndex(h=>terms.every(t=>n(h).includes(n(t))));if(i>=0)return i;return H.findIndex(h=>terms.some(t=>n(h).includes(n(t))));}
function cols(){return{kab:find("kab"),kec:find("kec"),desa:find("desa"),tahun:find("tahun"),lat:find("latitude"),lon:find("longitude")}}
function fmt(x){return Number(x||0).toLocaleString("id-ID")}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function load(){
  $("connection").textContent="● Menghubungkan data...";
  const u=`https://docs.google.com/spreadsheets/d/${CFG.id}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CFG.sheet)}`;
  try{
    const r=await fetch(u); if(!r.ok)throw Error();
    const t=await r.text(),j=JSON.parse(t.slice(t.indexOf("{"),t.lastIndexOf("}")+1));
    H=j.table.cols.map(c=>c.label||c.id||""); R=j.table.rows.map(x=>x.c.map(c=>c?(c.f??c.v??""):""));
    $("connection").className="connection ok";$("connection").textContent="● Data Google Sheets terhubung"; render();
  }catch(e){$("connection").className="connection bad";$("connection").textContent="● Gagal membaca data";toast("Pastikan Google Sheets dapat dilihat oleh siapa saja yang memiliki link.")}
}
function render(){
 const c=cols(),total=R.length,kab=uniq(c.kab),desa=uniq(c.desa),year=uniq(c.tahun);
 $("sTotal").textContent=fmt(total);$("sKab").textContent=fmt(kab);$("sDesa").textContent=fmt(desa);$("sYear").textContent=fmt(year);
 $("dTotal").textContent=fmt(total);$("dKab").textContent=fmt(kab);$("dDesa").textContent=fmt(desa);$("dYear").textContent=fmt(year);
 chart(c.kab); filters(c); table(c); drawMap(c);
}
function uniq(i){return i<0?0:new Set(R.map(x=>n(x[i])).filter(Boolean)).size}
function coord(a,b){a=parseFloat(a);b=parseFloat(b);return Number.isFinite(a)&&Number.isFinite(b)&&a>=-11&&a<=7&&b>=94&&b<=142}
function chart(i){let box=$("chart");box.innerHTML="";if(i<0)return;let d={};R.forEach(r=>{let x=String(r[i]||"Tidak diketahui").trim();d[x]=(d[x]||0)+1});let a=Object.entries(d).sort((x,y)=>y[1]-x[1]).slice(0,10),m=a[0]?.[1]||1;a.forEach(([x,v])=>box.insertAdjacentHTML("beforeend",`<div class="barrow"><span>${esc(x.slice(0,26))}</span><div class="bar"><i style="width:${Math.max(7,v/m*100)}%"></i></div><b>${fmt(v)}</b></div>`))}
function filters(c){let k=$("kab"),y=$("year");k.innerHTML='<option value="">Semua Kabupaten/Kota</option>';y.innerHTML='<option value="">Semua Tahun</option>';if(c.kab>=0)[...new Set(R.map(r=>String(r[c.kab]||"").trim()).filter(Boolean))].sort().forEach(x=>k.insertAdjacentHTML("beforeend",`<option>${esc(x)}</option>`));if(c.tahun>=0)[...new Set(R.map(r=>String(r[c.tahun]||"").trim()).filter(Boolean))].sort().reverse().forEach(x=>y.insertAdjacentHTML("beforeend",`<option>${esc(x)}</option>`));k.onchange=y.onchange=table}
function table(c=cols()){let q=n($("search").value),kf=n($("kab").value),yf=n($("year").value),a=R.filter(r=>(!q||r.join(" ").toLowerCase().includes(q))&&(!kf||n(r[c.kab])===kf)&&(!yf||n(r[c.tahun])===yf)),v=[c.kab,c.kec,c.desa,c.tahun].filter(i=>i>=0);$("table").querySelector("thead").innerHTML="<tr>"+v.map(i=>`<th>${esc(H[i])}</th>`).join("")+"</tr>";$("table").querySelector("tbody").innerHTML=a.slice(0,250).map(r=>"<tr>"+v.map(i=>`<td>${esc(r[i])}</td>`).join("")+"</tr>").join("");$("info").textContent=`Menampilkan ${fmt(Math.min(250,a.length))} dari ${fmt(a.length)} data`}
function drawMap(c){if(map)map.remove();map=L.map("map",{scrollWheelZoom:false}).setView([-7.15,110.4],8);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map);if(c.lat<0||c.lon<0)return;let pts=[];R.forEach(r=>{if(coord(r[c.lat],r[c.lon])){let p=[+r[c.lat],+r[c.lon]],m=L.marker(p).addTo(map);m.bindPopup(`<b>${esc(r[c.desa]||"DESTANA")}</b><br>${esc(r[c.kab]||"")}`);pts.push(p)}});if(pts.length)map.fitBounds(pts,{padding:[20,20],maxZoom:11})}
function go(p){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(p).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));let t={dashboard:"Dashboard Pencegahan & Kesiapsiagaan",destana:"Desa Tangguh Bencana",ews:"Early Warning System",spab:"Satuan Pendidikan Aman Bencana",lidi:"Unit LIDI Jawa Tengah",dokumen:"Dokumen Kebencanaan",peta:"Peta Kebencanaan",edukasi:"Edukasi Kebencanaan"};$("title").textContent=t[p];$("sidebar").classList.remove("open");if(p==="dashboard"&&map)setTimeout(()=>map.invalidateSize(),100)}
function toast(x){let t=$("toast");t.textContent=x;t.style.display="block";setTimeout(()=>t.style.display="none",4500)}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.page));document.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>go(b.dataset.jump));$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");$("search").oninput=()=>table();$("refresh").onclick=load;load();
