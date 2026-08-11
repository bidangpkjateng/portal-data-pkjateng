const CFG={id:"1clhhPSSb9z-tgGbpSNjk_fwWZjr02moi2qJneyWkzzQ",sheet:"INPUT DATA",totalDesaJateng:8563,prototypeUpdated:"10 Agustus 2026"};
const DESA_PER_KAB={
"CILACAP":284,"BANYUMAS":331,"PURBALINGGA":239,"BANJARNEGARA":278,"KEBUMEN":460,"PURWOREJO":494,
"WONOSOBO":265,"MAGELANG":372,"BOYOLALI":267,"KLATEN":401,"SUKOHARJO":167,"WONOGIRI":294,
"KARANGANYAR":177,"SRAGEN":208,"GROBOGAN":280,"BLORA":295,"REMBANG":294,"PATI":406,"KUDUS":132,
"JEPARA":195,"DEMAK":249,"SEMARANG":235,"TEMANGGUNG":289,"KENDAL":286,"BATANG":248,
"PEKALONGAN":223,"PEMALANG":223,"TEGAL":287,"BREBES":297,
"KOTA MAGELANG":17,"KOTA SURAKARTA":54,"KOTA SALATIGA":23,"KOTA SEMARANG":177,"KOTA PEKALONGAN":27,"KOTA TEGAL":27
};

function kabKey(v){
 return n(v).replace(/^kabupaten\s+/,"").replace(/^kab\.\s*/,"").replace(/^kota\s+/,"kota ").trim().toUpperCase();
}

const EXPECTED_HEADERS=["Kab/Kota","Kecamatan","Desa/Kel","Kode Kab/Kota","Kode Kecamatan","Kode Desa/Kel","Latitude","Longitude","Bulan","Tahun","Ancaman","Sumber Dana","Keterangan","PEMBENTUKAN/PENGUATAN","Ketua Forum PRB","Nomor HP","DOKUMEN","Kelas","SKOR","PKD","Kajian Risiko Bencana + Peta","RPB","FRB","PFRB","Pembentukan Tim Relawan Desa","Sistem Peringatan Dini","Rencana Evakuasi + Peta","Rencana Kontingensi","Simulasi/Gladi Lapangan","Rencana Pemulihan"];
let H=[],R=[],map=null,geojsonLayer=null,kabChart=null,fundChart=null,yearChart=null,globalKab="";

let currentPage = 1;
const rowsPerPage = 10;

const $=x=>document.getElementById(x), n=x=>String(x??"").trim().toLowerCase();

window.changePage = function(direction) {
  currentPage += direction;
  table(cols());
};

function statusIs(v, target){
  if(!v) return false;
  const cleanV = n(v).replace(/[^a-z0-9]/g, "");
  const cleanTarget = n(target).replace(/[^a-z0-9]/g, "");
  return cleanV.includes(cleanTarget);
}

function cols(){
  const findIdx = (keywords, defaultIdx) => {
    for(let kw of keywords){
      const idx = H.findIndex(h => n(h).includes(kw) && !n(h).includes("kode"));
      if(idx >= 0) return idx;
    }
    return (H[defaultIdx] !== undefined) ? defaultIdx : -1;
  };

  return {
    kab: findIdx(["kab/kota", "kabupaten", "kab"], 0),
    kec: findIdx(["kecamatan", "kec"], 1),
    desa: findIdx(["desa/kel", "desa", "kelurahan"], 2),
    kode: H.findIndex(h => n(h).includes("kode")),
    lat: findIdx(["latitude", "lat"], 6),
    lon: findIdx(["longitude", "lon", "lng"], 7),
    tahun: findIdx(["tahun"], 9),
    ancaman: findIdx(["ancaman"], 10),
    sumber: findIdx(["sumber dana", "sumber pendanaan", "sumber"], 11),
    status: findIdx(["pembentukan/penguatan", "pembentukan", "penguatan", "status"], 13)
  };
}

function fmt(x){return Number(x||0).toLocaleString("id-ID")}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function validValue(v){
 const x=String(v??"").trim();
 if(!x)return false;
 const bad=["tidak diketahui","-","—","n/a","na","null","undefined","tidak ada","kosong"];
 return !bad.includes(n(x));
}

function countByData(rowsData, colIndex, filterFn=()=>true){
 const d={};if(colIndex<0)return d;
 rowsData.forEach(r=>{
   if(!filterFn(r))return;
   const x=String(r[colIndex]??"").trim();
   if(!validValue(x))return;
   d[x]=(d[x]||0)+1;
 });
 return d;
}

function load(){
  if($("connection")) $("connection").textContent="● Menghubungkan data...";
  const callback="googleSheetCallback_"+Date.now();
  const url=`https://docs.google.com/spreadsheets/d/${CFG.id}/gviz/tq?tqx=responseHandler:${callback}&headers=1&sheet=${encodeURIComponent(CFG.sheet)}`;
  window[callback]=function(data){
    try{
      if(!data || data.status!=="ok") throw new Error("Google Sheets status bukan OK");

      const labels=data.table.cols.map(c=>String(c.label||"").trim());
      const labelsUsable=labels.some(x=>x!=="");
      H=labelsUsable ? labels.map((x,i)=>x||EXPECTED_HEADERS[i]||String.fromCharCode(65+i)) : EXPECTED_HEADERS.slice(0,data.table.cols.length);

      R=data.table.rows.map(row=>H.map((_,i)=>{
        const cell=row.c&&row.c[i];
        return cell ? (cell.f ?? cell.v ?? "") : "";
      }));

      R = R.filter(r => {
        const firstCol = n(r[0]);
        return firstCol !== "kab/kota" && firstCol !== "kabupaten/kota" && firstCol !== "kabupaten";
      });

      if($("connection")){
        $("connection").className="connection ok";
        $("connection").textContent="● Data Google Sheets terhubung";
      }
      
      const c=cols();
      initGlobalFilterDropdown(c);
      render();
    }catch(e){
      console.error("Google Sheets error:",e);
      if($("connection")){
        $("connection").className="connection bad";
        $("connection").textContent="● Gagal membaca data";
      }
      toast("Data Google Sheets gagal diproses.");
    }finally{
      const s=document.getElementById(callback+"_script"); if(s)s.remove();
      try{delete window[callback]}catch(_){}
    }
  };
  const script=document.createElement("script");
  script.id=callback+"_script"; script.src=url;
  script.onerror=function(){
    if($("connection")){
      $("connection").className="connection bad";
      $("connection").textContent="● Gagal membaca data";
    }
    toast("Tidak dapat menghubungkan ke Google Sheets.");
    script.remove(); try{delete window[callback]}catch(_){}
  };
  document.body.appendChild(script);
}

function render(){
  const c=cols();
  filters(c);
  table(c);
  renderCards(c);
  renderCharts(c);
  if($("lastUpdated")) $("lastUpdated").textContent=CFG.prototypeUpdated;
  renderDestanaMap(c);
}

function initGlobalFilterDropdown(c){
 const g=$("globalKab"); if(!g||c.kab<0)return;
 g.innerHTML='<option value="">Jawa Tengah — Semua Kabupaten/Kota</option>';
 [...new Set(R.map(r=>String(r[c.kab]||"").trim()).filter(Boolean))]
   .sort((a,b)=>a.localeCompare(b,"id"))
   .forEach(x=>g.insertAdjacentHTML("beforeend",`<option value="${esc(x)}">${esc(x)}</option>`));
 
 g.onchange=()=>{
   globalKab=g.value;
   renderCards(c);
   renderCharts(c);
   renderDestanaMap(c);
 };
}

function renderCards(c){
 const selected=globalKab;
 const rows=selected&&c.kab>=0?R.filter(r=>n(r[c.kab])===n(selected)):R;
 const formed=c.status>=0?rows.filter(r=>statusIs(r[c.status],"PEMBENTUKAN")).length:rows.length;
 const currentYear=new Date().getFullYear();
 const currentYearFormed=c.status>=0&&c.tahun>=0
   ?rows.filter(r=>statusIs(r[c.status],"PEMBENTUKAN")&&String(r[c.tahun]??"").trim()===String(currentYear)).length:0;

 if(!selected){
   if($("dJatengLabel")) $("dJatengLabel").textContent="JUMLAH DESA";
   if($("dJateng")) $("dJateng").textContent=fmt(CFG.totalDesaJateng);
   if($("dJatengSub")) $("dJatengSub").textContent="Jawa Tengah";
   if($("dTerbentukSub")) $("dTerbentukSub").textContent="status pembentukan";
   if($("dCapaianSub")) $("dCapaianSub").textContent="dari 8.563 desa";
   if($("dCapaian")) $("dCapaian").textContent=(formed/CFG.totalDesaJateng*100).toFixed(2).replace(".",",")+"%";
 }else{
   const totalKab=DESA_PER_KAB[kabKey(selected)];
   if($("dJatengLabel")) $("dJatengLabel").textContent="JUMLAH DESA/KELURAHAN";
   if($("dJateng")) $("dJateng").textContent=totalKab?fmt(totalKab):"—";
   if($("dJatengSub")) $("dJatengSub").textContent=selected;
   if($("dTerbentukSub")) $("dTerbentukSub").textContent="DESTANA pembentukan di "+selected;
   if($("dCapaianSub")) $("dCapaianSub").textContent=totalKab?"dari "+fmt(totalKab)+" desa":"jumlah desa belum tersedia";
   if($("dCapaian")) $("dCapaian").textContent=totalKab?(formed/totalKab*100).toFixed(2).replace(".",",")+"%":"—";
 }
 if($("dTerbentuk")) $("dTerbentuk").textContent=fmt(formed);
 if($("dTahunBerjalan")) $("dTahunBerjalan").textContent=fmt(currentYearFormed);
 if($("dTahunBerjalanSub")) $("dTahunBerjalanSub").textContent="DESTANA pembentukan tahun "+currentYear;
}

function filters(c){
 let k=$("kab"),y=$("year"),s=$("status");if(!k)return;
 k.innerHTML='<option value="">Semua Kabupaten/Kota</option>';
 if(y) y.innerHTML='<option value="">Semua Tahun</option>';
 if(s) s.innerHTML='<option value="">Semua Status</option>';
 if(c.kab>=0)[...new Set(R.map(r=>String(r[c.kab]||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"id")).forEach(x=>k.insertAdjacentHTML("beforeend",`<option value="${esc(x)}">${esc(x)}</option>`));
 if(c.tahun>=0 && y)[...new Set(R.map(r=>String(r[c.tahun]||"").trim()).filter(Boolean))].sort((a,b)=>Number(b)-Number(a)).forEach(x=>y.insertAdjacentHTML("beforeend",`<option value="${esc(x)}">${esc(x)}</option>`));
 if(c.status>=0 && s)[...new Set(R.map(r=>String(r[c.status]||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"id")).forEach(x=>s.insertAdjacentHTML("beforeend",`<option value="${esc(x)}">${esc(x)}</option>`));
 
 k.onchange=()=>{ currentPage=1; table(c); };
 if(y) y.onchange=()=>{ currentPage=1; table(c); };
 if(s) s.onchange=()=>{ currentPage=1; table(c); };
}

function table(c=cols()){
 if(!$("table")) return;

 let q=n($("search")?.value || "");
 let kf=n($("kab")?.value || "");
 let yf=n($("year")?.value || "");
 let sf=n($("status")?.value || "");

 let filteredData = R.map((r,i)=>({r,i})).filter(o=>{
   let r=o.r;
   return(!q||r.join(" ").toLowerCase().includes(q))&&(!kf||n(r[c.kab])===kf)&&(!yf||n(r[c.tahun])===yf)&&(!sf||n(r[c.status])===sf);
 });

 const totalRows = filteredData.length;
 const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

 if(currentPage > totalPages) currentPage = totalPages;
 if(currentPage < 1) currentPage = 1;

 const startIndex = (currentPage - 1) * rowsPerPage;
 const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
 const paginatedData = filteredData.slice(startIndex, endIndex);

 const v=[c.kab,c.kec,c.desa,c.tahun,c.ancaman,c.sumber,c.status];
 const labels=["Kabupaten/Kota","Kecamatan","Desa/Kel","Tahun","Ancaman","Sumber Dana","Pembentukan / Penguatan"];
 
 $("table").querySelector("thead").innerHTML="<tr>"+labels.map(x=>`<th>${esc(x)}</th>`).join("")+"</tr>";
 $("table").querySelector("tbody").innerHTML=paginatedData.map(o=>"<tr class='clickrow' data-row='"+o.i+"'>"+v.map(i=>`<td>${esc(i>=0?o.r[i]:"")}</td>`).join("")+"</tr>").join("");
 $("table").querySelectorAll("tbody tr").forEach(tr=>tr.onclick=()=>showDetail(+tr.dataset.row));

 if($("info")) {
   $("info").textContent = totalRows > 0 
     ? `Menampilkan ${fmt(startIndex + 1)} - ${fmt(endIndex)} dari ${fmt(totalRows)} data` 
     : "Tidak ada data";
 }

 if($("pageIndicator")) $("pageIndicator").textContent = `Halaman ${currentPage} dari ${totalPages}`;
 if($("prevBtn")) $("prevBtn").disabled = (currentPage <= 1);
 if($("nextBtn")) $("nextBtn").disabled = (currentPage >= totalPages);
}

const doughnutLabelsPlugin = {
  id: 'doughnutLabels',
  afterDatasetsDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    const { ctx, data } = chart;
    const meta = chart.getDatasetMeta(0);
    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);

    meta.data.forEach((element, index) => {
      const val = data.datasets[0].data[index];
      if (!val || val === 0) return;
      
      const pct = (val / total * 100).toFixed(1).replace(".", ",") + "%";
      const { x, y } = element.tooltipPosition();
      
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      
      if (val / total > 0.03) {
        ctx.fillText(fmt(val), x, y - 6);
        ctx.fillText(`(${pct})`, x, y + 6);
      }
      ctx.restore();
    });
  }
};

const barTopLabelsPlugin = {
  id: 'barTopLabels',
  afterDatasetsDraw(chart) {
    if (chart.config.type !== 'bar' || chart.options.indexAxis === 'y') return;
    const { ctx, data } = chart;
    const meta = chart.getDatasetMeta(0);

    meta.data.forEach((bar, index) => {
      const val = data.datasets[0].data[index];
      if (val === undefined || val === null) return;

      ctx.save();
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(fmt(val), bar.x, bar.y - 3);
      ctx.restore();
    });
  }
};

function renderCharts(c){
 const selectedKab = globalKab;
 const activeRows = (selectedKab && c.kab >= 0) 
   ? R.filter(r => n(r[c.kab]) === n(selectedKab))
   : R;

 if($("kabChart")){
   const kabData=Object.entries(countByData(R, c.kab, r=>c.status<0 || statusIs(r[c.status],"PEMBENTUKAN"))).sort((a,b)=>b[1]-a[1]);
   if(kabChart)kabChart.destroy();
   kabChart=new Chart($("kabChart"),{type:"bar",data:{labels:kabData.map(x=>x[0]),datasets:[{label:"Jumlah DESTANA",data:kabData.map(x=>x[1]),backgroundColor:"#56CCF2"}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{precision:0}},y:{ticks:{font:{size:9}}}}}});
 }

 if($("fundChart")){
   const fund=Object.entries(countByData(activeRows, c.sumber)).sort((a,b)=>b[1]-a[1]);
   if(fundChart)fundChart.destroy();
   const fundTotal=fund.reduce((a,x)=>a+x[1],0);
   fundChart=new Chart($("fundChart"),{
     type:"doughnut",
     data:{
       labels:fund.map(x=>{const pct=fundTotal?(x[1]/fundTotal*100):0;return `${x[0]} — ${fmt(x[1])} (${pct.toFixed(1).replace(".",",")}%)`;}),
       datasets:[{data:fund.map(x=>x[1]),backgroundColor:["#2F80ED","#EB5757","#F2994A","#F2C94C","#56CCF2","#9B51E0","#828282"]}]
     },
     plugins:[doughnutLabelsPlugin],
     options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{font:{size:9},boxWidth:12,padding:8}}}}
   });
 }

 if($("yearChart")){
   const yearly={}; const fundNames=[];
   activeRows.forEach(r=>{
     if(c.tahun<0) return;
     if(c.status>=0 && !statusIs(r[c.status],"PEMBENTUKAN")) return;
     const y=String(r[c.tahun]??"").trim();
     if(!/^\d{4}$/.test(y))return;
     const f=String(r[c.sumber]??"").trim() || "Lainnya";
     if(!yearly[y])yearly[y]={};
     yearly[y][f]=(yearly[y][f]||0)+1;
     if(!fundNames.includes(f))fundNames.push(f);
   });
   const years=Object.keys(yearly).sort((a,b)=>Number(a)-Number(b));
   const palette=["#2F80ED","#F2994A","#27AE60","#EB5757","#9B51E0","#F2C94C","#56CCF2","#6FCF97","#BB6BD9","#828282"];
   const totalLabelsPlugin={id:"yearTotals",afterDatasetsDraw(chart){const {ctx,scales}=chart;ctx.save();ctx.font="600 12px Arial";ctx.textAlign="center";ctx.textBaseline="bottom";years.forEach((year,idx)=>{const total=(yearly[year]?Object.values(yearly[year]).reduce((a,b)=>a+b,0):0);if(!total)return;const x=scales.x.getPixelForValue(idx);const y=scales.y.getPixelForValue(total)-6;ctx.fillText(total.toLocaleString("id-ID"),x,y);});ctx.restore();}};
   if(yearChart)yearChart.destroy();
   yearChart=new Chart($("yearChart"),{type:"bar",data:{labels:years,datasets:fundNames.map((f,i)=>({label:f,data:years.map(y=>yearly[y]?.[f]||0),backgroundColor:palette[i%palette.length],borderWidth:0}))},plugins:[totalLabelsPlugin],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{display:true,position:"bottom",labels:{font:{size:9},boxWidth:12}}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true,ticks:{precision:0}}}}});
 }
}

function getColor(d) {
  return d > 30 ? '#1b5e20' :
         d > 20 ? '#2e7d32' :
         d > 10 ? '#f57f17' :
         d > 0  ? '#e65100' :
                  '#cccccc';
}

function renderDestanaMap(c){
 if(!$("destanaMap")||typeof L==="undefined")return;
 
 if(!map){
   map=L.map("destanaMap",{scrollWheelZoom:false}).setView([-7.15,110.4],8);
   L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap contributors"}).addTo(map);
 }

 const destanaPerKab = {};
 if (c.kab >= 0) {
   R.forEach(r => {
     if (c.status >= 0 && !statusIs(r[c.status], "PEMBENTUKAN")) return;
     const k = kabKey(r[c.kab]);
     if (k) destanaPerKab[k] = (destanaPerKab[k] || 0) + 1;
   });
 }

 fetch('jateng-kab.geojson')
   .then(response => {
     if(!response.ok) throw new Error("GeoJSON tidak ditemukan");
     return response.json();
   })
   .then(geojsonData => {
     if (geojsonLayer) map.removeLayer(geojsonLayer);

     geojsonLayer = L.geoJSON(geojsonData, {
       style: function (feature) {
         const namaKab = feature.properties.WADMKK || feature.properties.nama_kabupaten || feature.properties.NAME_2 || "";
         const count = destanaPerKab[kabKey(namaKab)] || 0;

         return {
           fillColor: getColor(count),
           weight: 1.5,
           opacity: 1,
           color: '#ffffff',
           fillOpacity: 0.7
         };
       },
       onEachFeature: function (feature, layer) {
         const namaKab = feature.properties.WADMKK || feature.properties.nama_kabupaten || feature.properties.NAME_2 || "";
         const count = destanaPerKab[kabKey(namaKab)] || 0;

         layer.bindTooltip(
           `<b>${esc(namaKab)}</b><br>Jumlah DESTANA: <b>${fmt(count)}</b>`,
           { sticky: true }
         );

         layer.on({
           mouseover: (e) => {
             e.target.setStyle({ fillOpacity: 0.9, weight: 2.5 });
           },
           mouseout: (e) => {
             geojsonLayer.resetStyle(e.target);
           },
           click: () => {
             if ($("kab")) {
               $("kab").value = namaKab;
               currentPage = 1;
               table(c);
             }
           }
         });
       }
     }).addTo(map);

     if ($("coordInfo")) $("coordInfo").textContent = "Peta Kepadatan Wilayah (Choropleth)";
   })
   .catch(err => {
     const pts=[];
     if(c.lat>=0&&c.lon>=0){
       R.forEach(r=>{
         const lat=parseFloat(r[c.lat]), lon=parseFloat(r[c.lon]);
         if(Number.isFinite(lat)&&Number.isFinite(lon)){
           const p=[lat,lon];
           L.marker(p).addTo(map).bindPopup(`<b>${esc(r[c.desa]||"DESTANA")}</b><br>${esc(r[c.kab]||"")}<br>${esc(r[c.kec]||"")}`);
           pts.push(p);
         }
       });
     }
     if($("coordInfo")) $("coordInfo").textContent=fmt(pts.length)+" lokasi berkoordinat";
     if(pts.length) map.fitBounds(pts,{padding:[20,20],maxZoom:11});
   });

 setTimeout(()=>map.invalidateSize(),150);
}

function findHeader(name){let i=H.findIndex(h=>n(h)===n(name));if(i>=0)return i;return H.findIndex(h=>n(h).includes(n(name)))}
function showDetail(rowIndex){const c=cols(),r=R[rowIndex];if(!r)return;if($("detailTitle")) $("detailTitle").textContent=`${r[c.desa]||"DESTANA"} — ${r[c.kab]||""}`;const preferred=[c.kab,c.kec,c.desa,c.kode,findHeader("Kode Kab/Kota"),findHeader("Kode Kecamatan"),c.lat,c.lon,findHeader("Bulan"),c.tahun,c.ancaman,c.sumber,findHeader("Keterangan"),c.status,findHeader("Ketua Forum PRB"),findHeader("Nomor HP"),findHeader("DOKUMEN"),findHeader("Kelas"),findHeader("SKOR"),findHeader("PKD"),findHeader("Kajian Risiko Bencana + Peta"),findHeader("RPB"),findHeader("FRB"),findHeader("PFRB"),findHeader("Pembentukan Tim Relawan Desa"),findHeader("Sistem Peringatan Dini"),findHeader("Rencana Evakuasi + Peta"),findHeader("Rencana Kontingensi"),findHeader("Simulasi/Gladi Lapangan"),findHeader("Rencana Pemulihan")];const ids=[...new Set(preferred.filter(i=>i>=0))];if($("detailGrid")) $("detailGrid").innerHTML=ids.map(i=>`<div class="detailitem"><label>${esc(H[i])}</label><div>${esc(r[i]||"—")}</div></div>`).join("");if($("detailModal")) $("detailModal").classList.add("show")}

function showKabChartAll(){
 const m=$("kabChartModal"); if(!m)return;
 m.classList.add("show");
 m.style.display="flex";
 
 setTimeout(()=>{
   const c=cols();
   let data=Object.entries(countByData(R, c.kab, r=>c.status<0 || statusIs(r[c.status],"PEMBENTUKAN")));
   
   const sortVal = $("sortKabChartAll")?.value || "highest";

   if(sortVal === "alphabet"){
     data.sort((a,b)=>a[0].localeCompare(b[0], "id"));
   } else if(sortVal === "alphabet-desc") {
     data.sort((a,b)=>b[0].localeCompare(a[0], "id"));
   } else if(sortVal === "lowest") {
     data.sort((a,b)=>a[1]-b[1]);
   } else {
     data.sort((a,b)=>b[1]-a[1]);
   }

   if(window.kabAllChart)window.kabAllChart.destroy();
   if($("kabChartAll")){
     const canvasEl = $("kabChartAll");
     canvasEl.parentElement.style.height = "420px";
     
     window.kabAllChart=new Chart(canvasEl,{
       type:"bar",
       data:{
         labels:data.map(x=>x[0]),
         datasets:[{label:"DESTANA Pembentukan",data:data.map(x=>x[1]),backgroundColor:"#2F80ED"}]
       },
       plugins:[barTopLabelsPlugin],
       options:{
         indexAxis:"x",
         responsive:true,
         maintainAspectRatio:false,
         layout:{padding:{top:25}},
         plugins:{legend:{display:false}},
         scales:{
           x:{
             ticks:{
               font:{size:9},
               maxRotation:90,
               minRotation:45,
               autoSkip:false
             }
           },
           y:{
             beginAtZero:true,
             ticks:{precision:0}
           }
         }
       }
     });
   }
 },50);
}

if($("sortKabChartAll")){
  $("sortKabChartAll").onchange = function(){
    showKabChartAll();
  };
}

function closeKabChartAll(){
 const m=$("kabChartModal");
 if(m){
   m.classList.remove("show");
   m.style.display="none";
 }
}

function go(p){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));if($(p)) $(p).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));let t={dashboard:"Dashboard Pencegahan & Kesiapsiagaan",destana:"Desa Tangguh Bencana",ews:"Early Warning System",spab:"Satuan Pendidikan Aman Bencana",lidi:"Unit LIDI Jawa Tengah",dokumen:"Dokumen Kebencanaan",peta:"Peta Kebencanaan",edukasi:"Edukasi Kebencanaan"};if($("title")) $("title").textContent=t[p];if($("sidebar")) $("sidebar").classList.remove("open");if(p==="destana"&&map)setTimeout(()=>map.invalidateSize(),150)}
function toast(x){let t=$("toast");if(!t)return;t.textContent=x;t.style.display="block";setTimeout(()=>t.style.display="none",4500)}

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.page));
document.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>go(b.dataset.jump));
document.querySelectorAll("[data-chart-all]").forEach(b=>b.onclick=showKabChartAll);

document.addEventListener("click", function(e) {
  if (e.target.closest("#closeKabChart") || e.target.closest("#closeKabChartBtn") || e.target.closest(".close-kab-chart") || e.target.id === "kabChartModal") {
    closeKabChartAll();
  }
});

if($("closeModal")) $("closeModal").onclick=()=>$("detailModal")?.classList.remove("show");
if($("detailModal")) $("detailModal").onclick=e=>{if(e.target.id==="detailModal")$("detailModal").classList.remove("show")};
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    $("detailModal")?.classList.remove("show");
    closeKabChartAll();
  }
});

if($("menuBtn")) $("menuBtn").onclick=()=>$("sidebar")?.classList.toggle("open");
if($("search")) $("search").oninput=()=>{ currentPage=1; table(cols()); };
if($("refresh")) $("refresh").onclick=load;

load();
