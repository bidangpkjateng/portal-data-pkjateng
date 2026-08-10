const CFG={id:"1clhhPSSb9z-tgGbpSNjk_fwWZjr02moi2qJneyWkzzQ",sheet:"INPUT DATA",totalDesaJateng:8563,prototypeUpdated:"10 Agustus 2026"};
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
const EXPECTED_HEADERS=["Kab/Kota","Kecamatan","Desa/Kel","Kode Kab/Kota","Kode Kecamatan","Kode Desa/Kel","Latitude","Longitude","Bulan","Tahun","Ancaman","Sumber Dana","Keterangan","PEMBENTUKAN/PENGUATAN","Ketua Forum PRB","Nomor HP","DOKUMEN","Kelas","SKOR","PKD","Kajian Risiko Bencana + Peta","RPB","FRB","PFRB","Pembentukan Tim Relawan Desa","Sistem Peringatan Dini","Rencana Evakuasi + Peta","Rencana Kontingensi","Simulasi/Gladi Lapangan","Rencana Pemulihan"];
let H=[],R=[],map=null,kabChart=null,fundChart=null,yearChart=null,globalKab="";
const $=x=>document.getElementById(x), n=x=>String(x??"").trim().toLowerCase();
function cols(){
 const exact=(...names)=>{for(const x of names){const i=H.findIndex(h=>n(h)===n(x));if(i>=0)return i}return -1};
 const partial=(...names)=>{for(const x of names){const i=H.findIndex(h=>n(h).includes(n(x)));if(i>=0)return i}return -1};
 const byExpected=(i,found)=>found>=0?found:(i<H.length?i:-1);
 return{
  kab:byExpected(0,exact("Kab/Kota","Kabupaten/Kota","Kab Kota","Kabupaten")),
  kec:byExpected(1,exact("Kecamatan")),
  desa:byExpected(2,exact("Desa/Kel","Desa/Kelurahan","Desa/Kel.")),
  kode:byExpected(5,exact("Kode Desa/Kel","Kode Desa/Kelurahan")),
  tahun:byExpected(9,exact("Tahun")),
  lat:byExpected(6,exact("Latitude")),
  lon:byExpected(7,exact("Longitude")),
  ancaman:byExpected(10,exact("Ancaman")),
  sumber:byExpected(11,exact("Sumber Dana","Sumber Pendanaan","Sumber Pendanaan Desa")),
  status:byExpected(13,partial("PEMBENTUKAN / PENGUATAN","PEMBENTUKAN/PENGUATAN","PEMBENTUKAN","PENGUATAN"))
 };
}
function fmt(x){return Number(x||0).toLocaleString("id-ID")}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function statusIs(v,target){return n(v)===n(target)}
function validValue(v){
 const x=String(v??"").trim();
 if(!x)return false;
 const bad=["tidak diketahui","-","—","n/a","na","null","undefined","tidak ada","kosong"];
 return !bad.includes(n(x));
}
function countBy(i,filter=()=>true){
 const d={};if(i<0)return d;
 R.forEach(r=>{
   if(!filter(r))return;
   const x=String(r[i]??"").trim();
   if(!validValue(x))return;
   d[x]=(d[x]||0)+1;
 });
 return d;
}
function load(){
  $("connection").textContent="● Menghubungkan data...";

  const callback="googleSheetCallback";
  const url=`https://docs.google.com/spreadsheets/d/${CFG.id}/gviz/tq?tqx=responseHandler:${callback}&headers=1&sheet=${encodeURIComponent(CFG.sheet)}`;

  let finished=false;
  let timer=null;

  function cleanup(){
    if(timer) clearTimeout(timer);
    const s=document.getElementById("google-sheet-script");
    if(s) s.remove();
    try{ delete window[callback]; }catch(_){}
  }

  function fail(message){
    if(finished) return;
    finished=true;
    $("connection").className="connection bad";
    $("connection").textContent="● Gagal membaca data";
    console.error("Google Sheets:", message);
    toast(message || "Tidak dapat menghubungkan ke Google Sheets.");
    cleanup();
  }

  function processData(data){
    if(finished) return;

    try{
      if(!data || !data.table){
        throw new Error("Respons Google Sheets tidak memiliki tabel data.");
      }

      const cols=data.table.cols || [];
      const rows=data.table.rows || [];

      H=cols.map((c,i)=>{
        const label=String(c.label || "").trim();
        return label || EXPECTED_HEADERS[i] || ("Kolom "+(i+1));
      });

      R=rows.map(row=>{
        return H.map((_,i)=>{
          const cell=row.c && row.c[i];
          if(!cell) return "";
          if(cell.f !== undefined && cell.f !== null) return String(cell.f);
          if(cell.v !== undefined && cell.v !== null) return String(cell.v);
          return "";
        });
      });

      if(!R.length){
        throw new Error("Google Sheets terhubung tetapi tidak ada data yang terbaca.");
      }

      finished=true;
      $("connection").className="connection ok";
      $("connection").textContent="● Data Google Sheets terhubung";

      console.log("Google Sheets OK");
      console.log("Jumlah kolom:", H.length);
      console.log("Jumlah baris:", R.length);
      console.log("Header:", H);

      cleanup();
      render();

    }catch(e){
      fail(e.message);
    }
  }

  // Google Visualization callback.
  window[callback]=processData;

  const script=document.createElement("script");
  script.id="google-sheet-script";
  script.src=url;
  script.async=true;

  script.onerror=function(){
    fail("Gagal memuat data dari Google Sheets.");
  };

  document.body.appendChild(script);

  // Stop waiting forever if Google does not call the callback.
  timer=setTimeout(function(){
    fail("Google Sheets tidak memberikan respons dalam 15 detik. Pastikan spreadsheet dapat diakses publik.");
  },15000);
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
 const currentYear=new Date().getFullYear();
 const currentYearFormed=c.status>=0&&c.tahun>=0
   ?rows.filter(r=>statusIs(r[c.status],"PEMBENTUKAN")&&String(r[c.tahun]??"").trim()===String(currentYear)).length:0;

 if(!selected){
   $("dJatengLabel").textContent="JUMLAH DESA";
   $("dJateng").textContent=fmt(CFG.totalDesaJateng);
   $("dJatengSub").textContent="Jawa Tengah";
   $("dTerbentukSub").textContent="status pembentukan";
   $("dCapaianSub").textContent="dari 8.563 desa";
   $("dCapaian").textContent=(formed/CFG.totalDesaJateng*100).toFixed(2).replace(".",",")+"%";
 }else{
   const totalKab=DESA_PER_KAB[kabKey(selected)];
   $("dJatengLabel").textContent="JUMLAH DESA/KELURAHAN";
   $("dJateng").textContent=totalKab?fmt(totalKab):"—";
   $("dJatengSub").textContent=selected;
   $("dTerbentukSub").textContent="DESTANA pembentukan di "+selected;
   $("dCapaianSub").textContent=totalKab?"dari "+fmt(totalKab)+" desa":"jumlah desa belum tersedia";
   $("dCapaian").textContent=totalKab?(formed/totalKab*100).toFixed(2).replace(".",",")+"%":"—";
 }
 $("dTerbentuk").textContent=fmt(formed);
 $("dTahunBerjalan").textContent=fmt(currentYearFormed);
 $("dTahunBerjalanSub").textContent="DESTANA pembentukan tahun "+currentYear;
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
 const v=[c.kab,c.kec,c.desa,c.tahun,c.ancaman,c.sumber,c.status];
 const labels=["Kabupaten/Kota","Kecamatan","Desa/Kel","Tahun","Ancaman","Sumber Dana","Pembentukan / Penguatan"];
 $("table").querySelector("thead").innerHTML="<tr>"+labels.map(x=>`<th>${esc(x)}</th>`).join("")+"</tr>";
 $("table").querySelector("tbody").innerHTML=a.slice(0,25).map(o=>"<tr class='clickrow' data-row='"+o.i+"'>"+v.map(i=>`<td>${esc(i>=0?o.r[i]:"")}</td>`).join("")+"</tr>").join("");
 $("table").querySelectorAll("tbody tr").forEach(tr=>tr.onclick=()=>showDetail(+tr.dataset.row));
 $("info").textContent=`Menampilkan ${fmt(Math.min(25,a.length))} dari ${fmt(a.length)} data`;
}
function renderCharts(c){
 const kabData=Object.entries(countBy(c.kab,r=>c.status>=0&&statusIs(r[c.status],"PEMBENTUKAN"))).sort((a,b)=>b[1]-a[1]);
 if(kabChart)kabChart.destroy();
 kabChart=new Chart($("kabChart"),{type:"bar",data:{labels:kabData.map(x=>x[0]),datasets:[{label:"Jumlah DESTANA",data:kabData.map(x=>x[1])}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{precision:0}},y:{ticks:{font:{size:9}}}}}});
 const fund=Object.entries(countBy(c.sumber)).sort((a,b)=>b[1]-a[1]);
 if(fundChart)fundChart.destroy();
 const fundTotal=fund.reduce((a,x)=>a+x[1],0);
 fundChart=new Chart($("fundChart"),{type:"doughnut",data:{labels:fund.map(x=>{const pct=fundTotal?(x[1]/fundTotal*100):0;return `${x[0]} — ${fmt(x[1])} (${pct.toFixed(1).replace(".",",")}%)`;}),datasets:[{data:fund.map(x=>x[1])}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{font:{size:9},boxWidth:12,padding:8}}}}});
 const yearly={}; const fundNames=[];
 R.forEach(r=>{if(c.status<0||c.tahun<0||!statusIs(r[c.status],"PEMBENTUKAN"))return;const y=String(r[c.tahun]??"").trim();if(!/^\d{4}$/.test(y))return;const f=String(r[c.sumber]??"").trim();if(!validValue(f))return;if(!yearly[y])yearly[y]={};yearly[y][f]=(yearly[y][f]||0)+1;if(!fundNames.includes(f))fundNames.push(f);});
 const years=Object.keys(yearly).sort((a,b)=>Number(a)-Number(b));
 const palette=["#2F80ED","#F2994A","#27AE60","#EB5757","#9B51E0","#F2C94C","#56CCF2","#6FCF97","#BB6BD9","#828282"];
 const totalLabelsPlugin={id:"yearTotals",afterDatasetsDraw(chart){const {ctx,scales}=chart;ctx.save();ctx.font="600 12px Arial";ctx.textAlign="center";ctx.textBaseline="bottom";years.forEach((year,idx)=>{const total=(yearly[year]?Object.values(yearly[year]).reduce((a,b)=>a+b,0):0);if(!total)return;const x=scales.x.getPixelForValue(idx);const y=scales.y.getPixelForValue(total)-6;ctx.fillText(total.toLocaleString("id-ID"),x,y);});ctx.restore();}};
 if(yearChart)yearChart.destroy();
 yearChart=new Chart($("yearChart"),{type:"bar",data:{labels:years,datasets:fundNames.map((f,i)=>({label:f,data:years.map(y=>yearly[y]?.[f]||0),backgroundColor:palette[i%palette.length],borderWidth:0}))},plugins:[totalLabelsPlugin],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{display:true,position:"bottom",labels:{font:{size:9},boxWidth:12}}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true,ticks:{precision:0}}}}});
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
function showKabChartAll(){
 const m=$("kabChartModal"); if(!m)return; m.classList.add("show");
 setTimeout(()=>{const c=cols();const data=Object.entries(countBy(c.kab,r=>c.status>=0&&statusIs(r[c.status],"PEMBENTUKAN"))).sort((a,b)=>b[1]-a[1]);if(window.kabAllChart)window.kabAllChart.destroy();window.kabAllChart=new Chart($("kabChartAll"),{type:"bar",data:{labels:data.map(x=>x[0]),datasets:[{label:"DESTANA Pembentukan",data:data.map(x=>x[1])}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{precision:0}},y:{ticks:{font:{size:10}}}}}});},50);
}
function closeKabChartAll(){const m=$("kabChartModal");if(m)m.classList.remove("show");}
function go(p){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(p).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));let t={dashboard:"Dashboard Pencegahan & Kesiapsiagaan",destana:"Desa Tangguh Bencana",ews:"Early Warning System",spab:"Satuan Pendidikan Aman Bencana",lidi:"Unit LIDI Jawa Tengah",dokumen:"Dokumen Kebencanaan",peta:"Peta Kebencanaan",edukasi:"Edukasi Kebencanaan"};$("title").textContent=t[p];$("sidebar").classList.remove("open");if(p==="destana"&&map)setTimeout(()=>map.invalidateSize(),150)}
function toast(x){let t=$("toast");t.textContent=x;t.style.display="block";setTimeout(()=>t.style.display="none",4500)}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.page));document.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>go(b.dataset.jump));document.querySelectorAll("[data-chart-all]").forEach(b=>b.onclick=showKabChartAll);$("closeKabChart").onclick=closeKabChartAll;$("kabChartModal").addEventListener("click",e=>{if(e.target.id==="kabChartModal")closeKabChartAll();});
$("closeModal").onclick=()=>$("detailModal").classList.remove("show");$("detailModal").onclick=e=>{if(e.target.id==="detailModal")$("detailModal").classList.remove("show")};document.addEventListener("keydown",e=>{if(e.key==="Escape")$("detailModal").classList.remove("show")});
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");$("search").oninput=()=>table(cols());$("refresh").onclick=load;load();
