const CFG={id:"1clhhPSSb9z-tgGbpSNjk_fwWZjr02moi2qJneyWkzzQ",sheet:"INPUT DATA",totalDesaJateng:8563,prototypeUpdated:"08 Agustus 2026"};
const DESA_PER_KAB={
"CILACAP":284,"BANYUMAS":331,"PURBALINGGA":239,"BANJARNEGARA":278,"KEBUMEN":460,"PURWOREJO":494,
"WONOSOBO":265,"MAGELANG":372,"BOYOLALI":267,"KLATEN":401,"SUKOHARJO":167,"WONOGIRI":294,
"KARANGANYAR":177,"SRAGEN":208,"GROBOGAN":280,"BLORA":295,"REMBANG":294,"PATI":406,"KUDUS":132,
"JEPARA":195,"DEMAK":249,"SEMARANG":235,"TEMANGGUNG":289,"KENDAL":286,"BATANG":248,
"PEKALONGAN":285,"PEMALANG":223,"TEGAL":287,"BREBES":297,
"KOTA MAGELANG":17,"KOTA SURAKARTA":54,"KOTA SALATIGA":23,"KOTA SEMARANG":177,"KOTA PEKALONGAN":27,"KOTA TEGAL":27
};
function kabKey(v){
 return n(v).replace(/^kabupaten\s+/,"").replace(/^kab\.\s*/,"").replace(/^kota\s+/,"kota ").trim().toUpperCase();
}
let H=[],R=[],map=null,kabChart=null,fundChart=null,yearChart=null,globalKab="";
const $=x=>document.getElementById(x), n=x=>String(x??"").trim().toLowerCase();
function cols(){
 let exact=(...names)=>{for(const x of names){let i=H.findIndex(h=>n(h)===n(x));if(i>=0)return i}return -1};
 let partial=(...names)=>{for(const x of names){let i=H.findIndex(h=>n(h).includes(n(x)));if(i>=0)return i}return -1};
 return{kab:exact("Kab/Kota","Kabupaten/Kota","Kab Kota"),kec:exact("Kecamatan"),desa:exact("Desa/Kel","Desa/Kelurahan"),kode:exact("Kode Desa/Kel","Kode Desa/Kelurahan"),tahun:exact("Tahun"),lat:exact("Latitude"),lon:exact("Longitude"),ancaman:exact("Ancaman"),sumber:exact("Sumber Dana"),status:partial("PEMBENTUKAN / PENGUATAN","PEMBENTUKAN/PENGUATAN","PEMBENTUKAN","PENGUATAN")};
}
function fmt(x){return Number(x||0).toLocaleString("id-ID")}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function statusIs(v,target){return n(v)===n(target)}
function countBy(i,filter=()=>true){const d={};if(i<0)return d;R.forEach(r=>{if(!filter(r))return;const x=String(r[i]||"Tidak diketahui").trim()||"Tidak diketahui";d[x]=(d[x]||0)+1});return d}
async function load(){
 $("connection").textContent="● Menghubungkan data...";
 const u=`https://docs.google.com/spreadsheets/d/${CFG.id}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CFG.sheet)}`;
 try{const r=await fetch(u);if(!r.ok)throw Error();const t=await r.text(),j=JSON.parse(t.slice(t.indexOf("{"),t.lastIndexOf("}")+1));H=j.table.cols.map(c=>c.label||c.id||"");R=j.table.rows.map(x=>x.c.map(c=>c?(c.f??c.v??""):""));$("connection").className="connection ok";$("connection").textContent="● Data Google Sheets terhubung";render();}
 catch(e){$("connection").className="connection bad";$("connection").textContent="● Gagal membaca data";toast("Pastikan Google Sheets dapat dilihat oleh siapa saja yang memiliki link.")}
}
function render(){const c=cols();filters(c);globalFilter(c);table(c);renderCards(c);renderCharts(c);$("lastUpdated").textContent=CFG.prototypeUpdated;renderDestanaMap(c);}
function globalFilter(c){
 const g=$("globalKab"); if(!g||c.kab<0)return;
 const current=globalKab;
 g.innerHTML='<option value="">Jawa Tengah — Semua Kabupaten/Kota</option>';
 [...new Set(R.map(r=>String(r[c.kab]||"").trim()).filter(Boolean))]
   .sort((a,b)=>a.localeCompare(b,"id"))
   .forEach(x=>g.insertAdjacentHTML("beforeend",`<option value="${esc(x)}">${esc(x)}</option>`));
 g.value=current;
 g.onchange=()=>{globalKab=g.value;renderCards(c);};
}
function renderCards(c){
 const selected=globalKab;
 const rows=selected&&c.kab>=0?R.filter(r=>n(r[c.kab])===n(selected)):R;
 const formed=c.status>=0?rows.filter(r=>statusIs(r[c.status],"PEMBENTUKAN")).length:0;
 if(!selected){
   $("dJatengLabel").textContent="JUMLAH DESA DI JAWA TENGAH";
   $("dJateng").textContent=fmt(CFG.totalDesaJateng);
   $("dJatengSub").textContent="desa/kelurahan";
   $("dTerbentukSub").textContent="status pembentukan";
   $("dCapaianSub").textContent="dari 8.563 desa/kelurahan";
   $("dCapaian").textContent=(formed/CFG.totalDesaJateng*100).toFixed(2).replace(".",",")+"%";
 }else{
   const totalKab=DESA_PER_KAB[kabKey(selected)];
   $("dJatengLabel").textContent="JUMLAH DESA/KELURAHAN";
   $("dJateng").textContent=totalKab?fmt(totalKab):"—";
   $("dJatengSub").textContent=selected;
   $("dTerbentukSub").textContent="DESTANA pembentukan di "+selected;
   $("dCapaianSub").textContent=totalKab?"dari "+fmt(totalKab)+" desa/kelurahan":"jumlah desa kabupaten belum tersedia";
   $("dCapaian").textContent=totalKab?(formed/totalKab*100).toFixed(2).replace(".",",")+"%":"—";
 }
 $("dTerbentuk").textContent=fmt(formed);
}function filters(c){
 let k=$("kab"),y=$("year"),s=$("status");if(!k)return;
 k.innerHTML='<option value="">Semua Kabupaten/Kota</option>';y.innerHTML='<option value="">Semua Tahun</option>';s.innerHTML='<option value="">Semua Status</option>';
 if(c.kab>=0)[...new Set(R.map(r=>String(r[c.kab]||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"id")).forEach(x=>k.insertAdjacentHTML("beforeend",`<option value="${esc(x)}">${esc(x)}</option>`));
 if(c.tahun>=0)[...new Set(R.map(r=>String(r[c.tahun]||"").trim()).filter(Boolean))].sort((a,b)=>Number(b)-Number(a)).forEach(x=>y.insertAdjacentHTML("beforeend",`<option value="${esc(x)}">${esc(x)}</option>`));
 if(c.status>=0)[...new Set(R.map(r=>String(r[c.status]||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"id")).forEach(x=>s.insertAdjacentHTML("beforeend",`<option value="${esc(x)}">${esc(x)}</option>`));
 k.onchange=()=>table(c);y.onchange=()=>table(c);s.onchange=()=>table(c);
}
function table(c=cols()){
 let q=n($("search").value),kf=n($("kab").value),yf=n($("year").value),sf=n($("status").value);
 let a=R.map((r,i)=>({r,i})).filter(o=>{let r=o.r;return(!q||r.join(" ").toLowerCase().includes(q))&&(!kf||n(r[c.kab])===kf)&&(!yf||n(r[c.tahun])===yf)&&(!sf||n(r[c.status])===sf)});
 let v=[c.kab,c.kec,c.desa,c.tahun,c.ancaman,c.sumber,c.status].filter(i=>i>=0);
 $("table").querySelector("thead").innerHTML="<tr>"+v.map(i=>`<th>${esc(H[i])}</th>`).join("")+"</tr>";
 $("table").querySelector("tbody").innerHTML=a.slice(0,250).map(o=>"<tr class='clickrow' data-row='"+o.i+"'>"+v.map(i=>`<td>${esc(o.r[i])}</td>`).join("")+"</tr>").join("");
 $("table").querySelectorAll("tbody tr").forEach(tr=>tr.onclick=()=>showDetail(+tr.dataset.row));
 $("info").textContent=`Menampilkan ${fmt(Math.min(250,a.length))} dari ${fmt(a.length)} data`;
}
function renderCharts(c){
 const kabData=Object.entries(countBy(c.kab)).sort((a,b)=>b[1]-a[1]);
 if(kabChart)kabChart.destroy();kabChart=new Chart($("kabChart"),{type:"bar",data:{labels:kabData.map(x=>x[0]),datasets:[{label:"Jumlah DESTANA",data:kabData.map(x=>x[1])}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{precision:0}},y:{ticks:{font:{size:9}}}}}});
 const fund=Object.entries(countBy(c.sumber)).sort((a,b)=>b[1]-a[1]);
 if(fundChart)fundChart.destroy();fundChart=new Chart($("fundChart"),{type:"doughnut",data:{labels:fund.map(x=>x[0]),datasets:[{data:fund.map(x=>x[1])}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{font:{size:9},boxWidth:12}}}}});
 const years=Object.entries(countBy(c.tahun,r=>c.status>=0&&statusIs(r[c.status],"PEMBENTUKAN"))).filter(x=>/^\d{4}$/.test(x[0])).sort((a,b)=>Number(a[0])-Number(b[0]));
 if(yearChart)yearChart.destroy();yearChart=new Chart($("yearChart"),{type:"bar",data:{labels:years.map(x=>x[0]),datasets:[{label:"DESTANA Pembentukan",data:years.map(x=>x[1])}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
}
function validCoord(a,b){a=parseFloat(a);b=parseFloat(b);return Number.isFinite(a)&&Number.isFinite(b)&&a>=-11&&a<=7&&b>=94&&b<=142}
function renderDestanaMap(c){
 if(!$("destanaMap")||typeof L==="undefined")return;
 if(map){map.remove();map=null}
 map=L.map("destanaMap",{scrollWheelZoom:false}).setView([-7.15,110.4],8);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap contributors"}).addTo(map);
 const pts=[];if(c.lat>=0&&c.lon>=0)R.forEach(r=>{if(validCoord(r[c.lat],r[c.lon])){const p=[+r[c.lat],+r[c.lon]],m=L.marker(p).addTo(map);m.bindPopup(`<b>${esc(r[c.desa]||"DESTANA")}</b><br>${esc(r[c.kab]||"")}<br>${esc(r[c.kec]||"")}`);pts.push(p)}});
 $("coordInfo").textContent=fmt(pts.length)+" lokasi berkoordinat";if(pts.length)map.fitBounds(pts,{padding:[20,20],maxZoom:11});setTimeout(()=>map.invalidateSize(),150);
}
function findHeader(name){let i=H.findIndex(h=>n(h)===n(name));if(i>=0)return i;return H.findIndex(h=>n(h).includes(n(name)))}
function showDetail(rowIndex){const c=cols(),r=R[rowIndex];if(!r)return;$("detailTitle").textContent=`${r[c.desa]||"DESTANA"} — ${r[c.kab]||""}`;const preferred=[c.kab,c.kec,c.desa,c.kode,findHeader("Kode Kab/Kota"),findHeader("Kode Kecamatan"),c.lat,c.lon,findHeader("Bulan"),c.tahun,c.ancaman,c.sumber,findHeader("Keterangan"),c.status,findHeader("Ketua Forum PRB"),findHeader("Nomor HP"),findHeader("DOKUMEN"),findHeader("Kelas"),findHeader("SKOR"),findHeader("PKD"),findHeader("Kajian Risiko Bencana + Peta"),findHeader("RPB"),findHeader("FRB"),findHeader("PFRB"),findHeader("Pembentukan Tim Relawan Desa"),findHeader("Sistem Peringatan Dini"),findHeader("Rencana Evakuasi + Peta"),findHeader("Rencana Kontingensi"),findHeader("Simulasi/Gladi Lapangan"),findHeader("Rencana Pemulihan")];const ids=[...new Set(preferred.filter(i=>i>=0))];$("detailGrid").innerHTML=ids.map(i=>`<div class="detailitem"><label>${esc(H[i])}</label><div>${esc(r[i]||"—")}</div></div>`).join("");$("detailModal").classList.add("show")}
function go(p){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(p).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));let t={dashboard:"Dashboard Pencegahan & Kesiapsiagaan",destana:"Desa Tangguh Bencana",ews:"Early Warning System",spab:"Satuan Pendidikan Aman Bencana",lidi:"Unit LIDI Jawa Tengah",dokumen:"Dokumen Kebencanaan",peta:"Peta Kebencanaan",edukasi:"Edukasi Kebencanaan"};$("title").textContent=t[p];$("sidebar").classList.remove("open");if(p==="destana"&&map)setTimeout(()=>map.invalidateSize(),150)}
function toast(x){let t=$("toast");t.textContent=x;t.style.display="block";setTimeout(()=>t.style.display="none",4500)}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.page));document.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>go(b.dataset.jump));
$("closeModal").onclick=()=>$("detailModal").classList.remove("show");$("detailModal").onclick=e=>{if(e.target.id==="detailModal")$("detailModal").classList.remove("show")};document.addEventListener("keydown",e=>{if(e.key==="Escape")$("detailModal").classList.remove("show")});
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");$("search").oninput=()=>table(cols());$("refresh").onclick=load;load();
