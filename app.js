const CFG={id:"1clhhPSSb9z-tgGbpSNjk_fwWZjr02moi2qJneyWkzzQ",sheet:"INPUT DATA",totalDesaJateng:8563,prototypeUpdated:"10 Agustus 2026"};
const PCT_CFG={id:"1clhhPSSb9z-tgGbpSNjk_fwWZjr02moi2qJneyWkzzQ",sheet:"PRESENTASE DESTANA"};
const EWS_CFG={id:"1Sl4AsiUlha_bI9yoQFl4yweimjvLxH2lXFoVtra2l4M",sheet:"INPUT DATA EWS",updated:"10 Juli 2026"};
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
let PCT_H=[],PCT_R=[],pctByKab={};
let kabLabelLayer=null;
let EWS_H=[],EWS_R=[],ewsKabFilter="",ewsCharts={},ewsCurrentPage=1,ewsLoaded=false,ewsLoading=false;
let currentSortMode = "highest";

// ==========================================
// PENGATURAN PAGINASI TABEL (10 BARIS)
// ==========================================
let currentPage = 1;
const rowsPerPage = 10;

const $=x=>document.getElementById(x), n=x=>String(x??"").trim().toLowerCase();

// Fungsi Pindah Halaman untuk Tombol HTML
window.changePage = function(direction) {
  currentPage += direction;
  table(cols());
};

function cols(){
 const exact=(...names)=>{for(const x of names){const i=H.findIndex(h=>n(h)===n(x));if(i>=0)return i}return -1};
 const partial=(...names)=>{for(const x of names){const needle=n(x);const i=H.findIndex(h=>n(h).includes(needle));if(i>=0)return i}return -1};
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

function cellValue(cell){
  if(!cell)return "";
  // Gunakan nilai mentah (v) untuk angka/tanggal agar tahun pemasangan tidak
  // berubah menjadi nilai format tampilan (f) dari Google Visualization API.
  if(cell.v!==undefined && cell.v!==null)return cell.v;
  if(cell.f!==undefined && cell.f!==null)return cell.f;
  return "";
}
function rawSheetRows(data){
  if(!data || data.status!=="ok" || !data.table) throw new Error("Respons Google Sheets tidak valid");
  const colsCount=data.table.cols.length;
  return data.table.rows.map(row=>Array.from({length:colsCount},(_,i)=>cellValue(row.c&&row.c[i])));
}
function normHeaderValue(v){return String(v??"").replace(/\s+/g," ").trim().toLowerCase()}
function detectHeaderIndex(rows, detector){
  return rows.findIndex(row=>detector(row.map(normHeaderValue)));
}
function parseSheetData(data, detector, label){
  const raw=rawSheetRows(data);
  const headerIndex=detectHeaderIndex(raw,detector);
  if(headerIndex<0) throw new Error("Header "+label+" tidak ditemukan");
  const headers=raw[headerIndex].map((v,i)=>String(v??"").trim()||String.fromCharCode(65+i));
  const rows=raw.slice(headerIndex+1).filter(r=>r.some(v=>String(v??"").trim()!==""));
  return {headers,rows,headerIndex};
}
function loadGoogleSheetJsonp(id,sheet,onSuccess,onError){
  const callback="googleSheetCallback_"+Date.now()+"_"+Math.random().toString(36).slice(2);
  const url=`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=responseHandler:${callback}&headers=0&sheet=${encodeURIComponent(sheet)}`;
  window[callback]=function(data){
    try{onSuccess(data)}catch(e){console.error(sheet+" error:",e);onError?.(e)}finally{
      const sc=document.getElementById(callback+"_script");if(sc)sc.remove();try{delete window[callback]}catch(_){}}
  };
  const script=document.createElement("script");script.id=callback+"_script";script.src=url;
  script.onerror=()=>{if(onError)onError(new Error("Tidak dapat menghubungkan ke "+sheet));script.remove();try{delete window[callback]}catch(_) {}};
  document.body.appendChild(script);
}
function buildPctFallbackFromDestana(){
  // Fallback hanya dipakai jika sheet PRESENTASE DESTANA tidak dapat dibaca.
  // Sumber utamanya tetap sheet PRESENTASE DESTANA.
  const counts={};
  const c=cols();
  if(c.kab>=0){
    R.forEach(r=>{
      // Fallback tetap mengikuti definisi cakupan peta: DESTANA PEMBENTUKAN saja.
      if(c.status>=0 && !statusIs(r[c.status],"PEMBENTUKAN")) return;
      const k=kabKey(r[c.kab]);
      if(k) counts[k]=(counts[k]||0)+1;
    });
  }
  Object.entries(DESA_PER_KAB).forEach(([kab,desa])=>{
    const total=counts[kab]||0;
    pctByKab[kab]={pct:desa>0?(total/desa*100):0,total,desa};
  });
  console.warn("PRESENTASE DESTANA memakai fallback dari INPUT DATA + jumlah desa/kelurahan karena sheet persentase belum terbaca.");
}

function load(){
  if($("connection")){ $("connection").className="connection"; $("connection").textContent="● Menghubungkan data..."; }
  loadGoogleSheetJsonp(CFG.id,CFG.sheet,(data)=>{
    const parsed=parseSheetData(data,(row)=>row.includes("kab/kota")&&row.includes("kecamatan")&&row.includes("desa/kel"),"DESTANA");
    H=parsed.headers;R=parsed.rows;
    R=R.filter(r=>r.some(v=>String(v??"").trim()!==""));
    if($("connection")){ $("connection").className="connection ok"; $("connection").textContent="● Data Google Sheets terhubung"; }
    const c=cols();initGlobalFilterDropdown(c);
    // Siapkan fallback terlebih dahulu agar peta tidak pernah tampil merah semua
    // ketika request sheet persentase gagal/terlambat. Sheet PRESENTASE DESTANA
    // tetap menjadi sumber resmi dan akan menimpa fallback bila berhasil dibaca.
    buildPctFallbackFromDestana();
    render();
    // Muat sheet PRESENTASE DESTANA sebagai sumber resmi cakupan peta.
    loadGoogleSheetJsonp(PCT_CFG.id,PCT_CFG.sheet,(pctData)=>{
      try{
        const parsedPct=parseSheetData(pctData,(row)=>row.includes("kab/kota")&&row.includes("presentase"),"PRESENTASE DESTANA");
        PCT_H=parsedPct.headers; PCT_R=parsedPct.rows;
        pctByKab={};
        // Sheet PRESENTASE DESTANA saat ini sudah satu baris tanpa merge.
        // Tetap gunakan nama header, tetapi sediakan fallback posisi kolom B/G/F/E
        // agar perubahan format Google Visualization tidak membuat semua nilai 0.
        let pk=PCT_H.findIndex(h=>normHeaderValue(h)==="kab/kota");
        let pp=PCT_H.findIndex(h=>normHeaderValue(h)==="presentase" || normHeaderValue(h)==="persentase");
        // Struktur sheet PRESENTASE DESTANA:
        // B = Kab/Kota, C = PEMBENTUKAN, D = PENGUATAN,
        // E = TOTAL, F = JUMLAH DESA, G = PRESENTASE.
        // Untuk peta dan detail, jumlah DESTANA yang digunakan adalah
        // PEMBENTUKAN (kolom C), bukan TOTAL (Pembentukan + Penguatan).
        let pembentukan=PCT_H.findIndex(h=>normHeaderValue(h).includes("pembentukan"));
        let pt=PCT_H.findIndex(h=>normHeaderValue(h)==="total");
        let pd=PCT_H.findIndex(h=>normHeaderValue(h).includes("jumlah desa"));
        if(pk<0) pk=1;   // kolom B
        if(pembentukan<0) pembentukan=2; // kolom C
        if(pt<0) pt=4;   // kolom E (tidak dipakai untuk jumlah peta)
        if(pd<0) pd=5;   // kolom F
        if(pp<0) pp=6;   // kolom G

        const numCell=(v)=>{
          if(v===null||v===undefined||v==="") return NaN;
          if(typeof v==='number') return v;
          let x=String(v).trim().replace(/%/g,"").replace(/\./g,"").replace(/,/g,".");
          return parseFloat(x);
        };
        PCT_R.forEach(r=>{
          const k=kabKey(r[pk]); if(!k)return;
          let pct=numCell(r[pp]);
          // Nilai spreadsheet biasanya berupa 0.428058 (format 42,81%).
          if(Number.isFinite(pct) && pct<=1) pct*=100;
          const totalPembentukan=numCell(r[pembentukan]);
          const desa=numCell(r[pd]);
          pctByKab[k]={pct:Number.isFinite(pct)?pct:0,total:Number.isFinite(totalPembentukan)?totalPembentukan:0,desa:Number.isFinite(desa)?desa:0};
        });
        const loadedCount=Object.keys(pctByKab).length;
        console.log("PRESENTASE DESTANA terbaca:", PCT_H, pctByKab);
        // Jika respons berhasil tetapi isinya tidak menghasilkan baris wilayah,
        // jangan menimpa fallback dengan data 0.
        if(loadedCount===0) buildPctFallbackFromDestana();
        renderDestanaMap(cols());
      }catch(err){
        console.warn("PRESENTASE DESTANA gagal diproses:",err);
        buildPctFallbackFromDestana();
        renderDestanaMap(cols());
      }
    },(err)=>{
      console.warn("Sheet PRESENTASE DESTANA tidak dapat dibaca:",err);
      buildPctFallbackFromDestana();
      renderDestanaMap(cols());
    });
  },(e)=>{
    console.error("Google Sheets DESTANA error:",e);
    if($("connection")){ $("connection").className="connection bad"; $("connection").textContent="● Gagal membaca data"; }
    toast("Data DESTANA gagal diproses: "+e.message);
  });
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
 const currentYearFormed=c.tahun>=0
   ?rows.filter(r=>(c.status<0||statusIs(r[c.status],"PEMBENTUKAN"))&&String(r[c.tahun]??"").trim()===String(currentYear)).length:0;

 if(!selected){
   if($("dJatengLabel")) $("dJatengLabel").textContent="JUMLAH DESA";
   if($("dJateng")) $("dJateng").textContent=fmt(CFG.totalDesaJateng);
   if($("dJatengSub")) $("dJatengSub").textContent="Jawa Tengah";
   if($("dTerbentukSub")) $("dTerbentukSub").textContent=c.status>=0?"status pembentukan":"data DESTANA terdaftar";
   if($("dCapaianSub")) $("dCapaianSub").textContent="dari 8.563 desa";
   if($("dCapaian")) $("dCapaian").textContent=(formed/CFG.totalDesaJateng*100).toFixed(2).replace(".",",")+"%";
 }else{
   const totalKab=DESA_PER_KAB[kabKey(selected)];
   if($("dJatengLabel")) $("dJatengLabel").textContent="JUMLAH DESA/KELURAHAN";
   if($("dJateng")) $("dJateng").textContent=totalKab?fmt(totalKab):"—";
   if($("dJatengSub")) $("dJatengSub").textContent=selected;
   if($("dTerbentukSub")) $("dTerbentukSub").textContent=(c.status>=0?"DESTANA pembentukan di ":"DESTANA terdaftar di ")+selected;
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

// ==========================================
// FUNGSI TABEL + LOGIKA PAGINASI 10 BARIS
// ==========================================
function table(c=cols()){
 if(!$("table")) return;

 let q=n($("search")?.value || "");
 let kf=n($("kab")?.value || "");
 let yf=n($("year")?.value || "");
 let sf=n($("status")?.value || "");

 // 1. Filter Data Berdasarkan Pencarian & Opsi Select
 let filteredData = R.map((r,i)=>({r,i})).filter(o=>{
   let r=o.r;
   return(!q||r.join(" ").toLowerCase().includes(q))&&(!kf||n(r[c.kab])===kf)&&(!yf||n(r[c.tahun])===yf)&&(!sf||n(r[c.status])===sf);
 });

 // 2. Perhitungan Halaman (10 Baris)
 const totalRows = filteredData.length;
 const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

 if(currentPage > totalPages) currentPage = totalPages;
 if(currentPage < 1) currentPage = 1;

 const startIndex = (currentPage - 1) * rowsPerPage;
 const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
 const paginatedData = filteredData.slice(startIndex, endIndex);

 // 3. Render Header dan Baris Tabel
 const v=[c.kab,c.kec,c.desa,c.tahun,c.ancaman,c.sumber];
 const labels=["Kabupaten/Kota","Kecamatan","Desa/Kel","Tahun","Ancaman","Sumber Dana"];
 if(c.status>=0){v.push(c.status);labels.push("Pembentukan / Penguatan");}
 
 $("table").querySelector("thead").innerHTML="<tr>"+labels.map(x=>`<th>${esc(x)}</th>`).join("")+"</tr>";
 $("table").querySelector("tbody").innerHTML=paginatedData.map(o=>"<tr class='clickrow' data-row='"+o.i+"'>"+v.map(i=>`<td>${esc(i>=0?o.r[i]:"")}</td>`).join("")+"</tr>").join("");
 $("table").querySelectorAll("tbody tr").forEach(tr=>tr.onclick=()=>showDetail(+tr.dataset.row));

 // 4. Update Status Teks & Kondisi Tombol
 if($("info")) {
   $("info").textContent = totalRows > 0 
     ? `Menampilkan ${fmt(startIndex + 1)} - ${fmt(endIndex)} dari ${fmt(totalRows)} data` 
     : "Tidak ada data";
 }

 if($("pageIndicator")) $("pageIndicator").textContent = `Halaman ${currentPage} dari ${totalPages}`;
 if($("prevBtn")) $("prevBtn").disabled = (currentPage <= 1);
 if($("nextBtn")) $("nextBtn").disabled = (currentPage >= totalPages);
}

// Plugin Doughnut Chart
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

// Plugin Label Atas Bar Chart
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
   const kabData=Object.entries(countByData(R, c.kab, r=>c.status<0||statusIs(r[c.status],"PEMBENTUKAN"))).sort((a,b)=>b[1]-a[1]);
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
       labels:fund.map(x=>x[0]),
       datasets:[{data:fund.map(x=>x[1]),backgroundColor:["#2F80ED","#EB5757","#F2994A","#F2C94C","#56CCF2","#9B51E0","#828282"]}]
     },
     plugins:[doughnutLabelsPlugin],
     options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{font:{size:9},boxWidth:12,padding:8}}}}
   });
 }

 if($("yearChart")){
   const yearly={}; const fundNames=[];
   activeRows.forEach(r=>{
     if(c.tahun<0)return;
     if(c.status>=0&&!statusIs(r[c.status],"PEMBENTUKAN"))return;
     const y=String(r[c.tahun]??"").trim();
     if(!/^\d{4}$/.test(y))return;
     const f=String(r[c.sumber]??"").trim();
     if(!validValue(f))return;
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

// ==========================================
// FUNGSI CHOROPLETH MAP (PETA KEPADATAN)
// ==========================================
function getColorByPct(pct){
  const p=Number(pct)||0;
  if(p<=10) return '#d73027';       // 0–10% merah
  if(p<=25) return '#f39c12';       // >10–25% orange
  if(p<=50) return '#ffd92f';       // >25–50% kuning
  if(p<=75) return '#a8d08d';       // >50–75% hijau muda
  return '#006100';                 // >75–100% hijau tua
}

function renderYearChartInModal(){
 const modal=$("yearChartModal"), canvas=$("yearChartModalCanvas");
 if(!modal||!canvas||!yearChart)return;
 modal.classList.add("show"); modal.style.display="flex";
 setTimeout(()=>{
   if(window.yearChartModalInstance) window.yearChartModalInstance.destroy();
   const cfg=yearChart.config;
   const totalPlugin={id:"yearTotalsModal",afterDatasetsDraw(chart){const {ctx,scales}=chart;ctx.save();ctx.font="600 12px Arial";ctx.textAlign="center";ctx.textBaseline="bottom";const years=cfg.data.labels||[];years.forEach((year,idx)=>{const total=(cfg.data.datasets||[]).reduce((sum,ds)=>sum+(Number(ds.data?.[idx])||0),0);if(!total)return;ctx.fillText(total.toLocaleString("id-ID"),scales.x.getPixelForValue(idx),scales.y.getPixelForValue(total)-7);});ctx.restore();}};
   window.yearChartModalInstance=new Chart(canvas,{type:"bar",data:{labels:[...(cfg.data.labels||[])],datasets:(cfg.data.datasets||[]).map(ds=>({...ds,data:[...(ds.data||[])],borderWidth:0}))},plugins:[totalPlugin],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:24,right:12,left:8,bottom:8}},plugins:{legend:{display:true,position:"bottom",labels:{font:{size:11},boxWidth:14,padding:14}}},scales:{x:{stacked:true,ticks:{font:{size:11},maxRotation:45,minRotation:0}},y:{stacked:true,beginAtZero:true,ticks:{precision:0,font:{size:11}}}}}});
 },40);
}
function closeYearChartModal(){const m=$("yearChartModal");if(m){m.classList.remove("show");m.style.display="none";}if(window.yearChartModalInstance){window.yearChartModalInstance.destroy();window.yearChartModalInstance=null;}}

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

 const geojsonPromise = window.JATENG_KAB_GEOJSON
   ? Promise.resolve(window.JATENG_KAB_GEOJSON)
   : fetch('jateng-kab.geojson').then(response => { if(!response.ok) throw new Error("GeoJSON tidak ditemukan"); return response.json(); });

 // GeoJSON lokal versi sebelumnya memiliki feature Kota Magelang, tetapi geometry-nya
 // NULL. Ambil batas Kota Magelang dari layanan administrasi BIG hanya sebagai
 // pelengkap agar wilayah tersebut tetap muncul tanpa mengubah data wilayah lain.
 function addKotaMagelangIfMissing(geojsonData){
   const isKotaMagelangFeature=(f)=>{
     const p=f&&f.properties?f.properties:{};
     const code=String(p.KDPKAB||p.kdp_kab||p.KD_PUM||p.kdpum||"").replace(/\s/g,"");
     const name=kabKey(p.WADMKK||p.nama_kabupaten||p.namobj||p.NAMOBJ||"");
     return f&&f.geometry && (code==="33.71" || name==="KOTA MAGELANG");
   };

   // Hapus feature Kota Magelang lama yang geometry-nya NULL.
   geojsonData.features=(geojsonData.features||[]).filter(f=>{
     const p=f&&f.properties?f.properties:{};
     const code=String(p.KDPKAB||p.kdp_kab||p.KD_PUM||p.kdpum||"").replace(/\s/g,"");
     const name=kabKey(p.WADMKK||p.nama_kabupaten||p.namobj||p.NAMOBJ||"");
     return !(code==="33.71" || name==="KOTA MAGELANG") || !!f.geometry;
   });

   if(geojsonData.features.some(isKotaMagelangFeature)) return Promise.resolve(geojsonData);

   const url="https://geoservices.big.go.id/gis/rest/services/DISIGT/BatasWilayah/FeatureServer/0/query?where=KDPKAB%3D%2733.71%27&outFields=*&returnGeometry=true&f=geojson";
   return fetch(url,{mode:"cors"})
     .then(r=>{if(!r.ok)throw new Error("Batas Kota Magelang dari BIG tidak dapat dimuat");return r.json();})
     .then(extra=>{
       const extras=(extra&&extra.features)||[];
       extras.forEach(f=>{
         const p=f&&f.properties?f.properties:{};
         const code=String(p.KDPKAB||p.kdp_kab||p.KD_PUM||p.kdpum||"").replace(/\s/g,"");
         const name=kabKey(p.WADMKK||p.nama_kabupaten||p.namobj||p.NAMOBJ||"");
         if(f.geometry && (code==="33.71" || name==="KOTA MAGELANG" || name==="MAGELANG")){
           f.properties=f.properties||{};
           // BIG pada feature Kota Magelang tertentu memakai NAMOBJ="Magelang".
           // Normalisasi agar cocok dengan key data PRESENTASE DESTANA.
           f.properties.WADMKK="Kota Magelang";
           f.properties.KDPKAB="33.71";
           geojsonData.features.push(f);
         }
       });
       return geojsonData;
     })
     .catch(err=>{
       console.warn("Batas Kota Magelang tidak berhasil dimuat dari BIG:",err);
       return geojsonData;
     });
 }

 geojsonPromise.then(addKotaMagelangIfMissing).then(geojsonData => {
     if (geojsonLayer) map.removeLayer(geojsonLayer);
     if (kabLabelLayer) map.removeLayer(kabLabelLayer);
     kabLabelLayer = L.layerGroup().addTo(map);

     geojsonLayer = L.geoJSON(geojsonData, {
       style: function (feature) {
         const p = feature.properties || {};
         const namaKab = p.WADMKK || p.nama_kabupaten || p.namobj || p.NAMOBJ || "";
         const provinsi = String(p.WADMPR || p.provinsi || p.WADMPRN || "").trim().toUpperCase();
         const kodeKab = String(p.KDPKAB||p.kdp_kab||p.KD_PUM||p.kdpum||"").replace(/\s/g,"");
         const isKotaMagelang = kodeKab === "33.71" || kabKey(namaKab) === "KOTA MAGELANG";
         const isJateng = provinsi === "JAWA TENGAH" || kodeKab.startsWith("33.") || isKotaMagelang;
         const info = isJateng ? (pctByKab[kabKey(namaKab)] || {}) : {};
         const pct = Number(info.pct)||0;
         return {
           fillColor: isJateng ? getColorByPct(pct) : '#bdbdbd',
           weight: 1.5,
           opacity: 1,
           color: '#ffffff',
           fillOpacity: isJateng ? 0.72 : 0.65
         };
       },
       onEachFeature: function (feature, layer) {
         const p = feature.properties || {};
         const namaKab = p.WADMKK || p.nama_kabupaten || p.namobj || p.NAMOBJ || "";
         const provinsi = String(p.WADMPR || p.provinsi || p.WADMPRN || "").trim().toUpperCase();
         const kodeKab = String(p.KDPKAB||p.kdp_kab||p.KD_PUM||p.kdpum||"").replace(/\s/g,"");
         const isKotaMagelang = kodeKab === "33.71" || kabKey(namaKab) === "KOTA MAGELANG";
         const isJateng = provinsi === "JAWA TENGAH" || kodeKab.startsWith("33.") || isKotaMagelang;
         const info = isJateng ? (pctByKab[kabKey(namaKab)] || {}) : {};
         const count = Number(info.total)||destanaPerKab[kabKey(namaKab)]||0;
         const desa = Number(info.desa)||0;
         const pct = Number(info.pct)||0;

         if (isJateng) {
           // Label kabupaten/kota ditampilkan sebagai teks murni tanpa kotak.
           // Tooltip tetap khusus untuk informasi lengkap saat hover.
           if (kabLabelLayer && namaKab) {
             const labelKey = kabKey(namaKab);
             const labelOverrides = {
               "CILACAP": [-7.512, 108.904],
               "JEPARA": [-6.59, 110.67]
             };
             const center = labelOverrides[labelKey] ? L.latLng(labelOverrides[labelKey][0], labelOverrides[labelKey][1]) : layer.getBounds().getCenter();
             const icon = L.divIcon({
               className: "kabupaten-label-wrap",
               html: `<span class="kabupaten-label">${esc(namaKab)}</span>`,
               iconSize: null,
               iconAnchor: [0, 0]
             });
             L.marker(center, {
               icon,
               interactive: false,
               keyboard: false,
               zIndexOffset: 1000
             }).addTo(kabLabelLayer);
           }
           layer.bindTooltip(
             `<b>${esc(namaKab)}</b><br>DESTANA: <b>${fmt(count)}</b><br>Jumlah Desa/Kelurahan: <b>${fmt(desa)}</b><br>Persentase DESTANA: <b>${pct.toLocaleString("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2})}%</b>`,
             { sticky: true }
           );
           layer.bindPopup(
             `<div style="min-width:210px"><b style="font-size:15px">${esc(namaKab)}</b><br><span>DESTANA: <b>${fmt(count)}</b></span><br><span>Jumlah Desa/Kelurahan: <b>${fmt(desa)}</b></span><br><span>Persentase DESTANA: <b>${pct.toLocaleString("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2})}%</b></span></div>`
           );
         } else {
           layer.bindTooltip(`<b>${esc(namaKab)}</b><br><span style="color:#666">Wilayah di luar Jawa Tengah</span>`, { sticky: true });
         }

         layer.on({
           mouseover: (e) => {
             e.target.setStyle({ fillOpacity: 0.9, weight: 2.5 });
           },
           mouseout: (e) => {
             geojsonLayer.resetStyle(e.target);
           }
         });
       }
     }).addTo(map);

     // Ukuran label kabupaten/kota mengikuti zoom peta agar tetap proporsional.
     const updateKabupatenLabelSize = () => {
       const z = map.getZoom();
       const px = Math.max(8, Math.min(16, 9 + (z - 8) * 0.85));
       document.querySelectorAll('#destanaMap .kabupaten-label').forEach(el => {
         el.style.fontSize = `${px}px`;
       });
     };
     updateKabupatenLabelSize();
     map.off('zoomend.kabupatenLabels').on('zoomend.kabupatenLabels', updateKabupatenLabelSize);

     if ($("coordInfo")) $("coordInfo").textContent = "Peta Cakupan DESTANA berdasarkan persentase desa/kelurahan";

     if($("destanaMapLegend")){
       $("destanaMapLegend").innerHTML=`
         <div class="map-legend-title">Cakupan Pembentukan DESTANA</div>
         <div class="map-legend-items">
           <span><i style="background:#d73027"></i>0–10%</span>
           <span><i style="background:#f39c12"></i>&gt;10–25%</span>
           <span><i style="background:#ffd92f"></i>&gt;25–50%</span>
           <span><i style="background:#a8d08d"></i>&gt;50–75%</span>
           <span><i style="background:#006100"></i>&gt;75–100%</span>
           <span><i style="background:#bdbdbd"></i>Wilayah di luar Jawa Tengah</span>
         </div>`;
     }
   })
   .catch(err => {
     console.warn("Gagal memuat GeoJSON, fallback ke penanda titik:", err);
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
   let data=Object.entries(countByData(R, c.kab, r=>c.status<0||statusIs(r[c.status],"PEMBENTUKAN")));
   
   // LOGIKA PENGURUTAN GRAFIK BERDASARKAN SELEKSI DROPDOWN
   if(currentSortMode === "alphabet"){
     data.sort((a,b)=>a[0].localeCompare(b[0], "id"));
   } else if(currentSortMode === "alphabet-desc") {
     data.sort((a,b)=>b[0].localeCompare(a[0], "id"));
   } else if(currentSortMode === "lowest") {
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
         datasets:[{label:c.status>=0?"DESTANA Pembentukan":"DESTANA Terdaftar",data:data.map(x=>x[1]),backgroundColor:"#2F80ED"}]
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

function changeSortMode(mode){
  currentSortMode = mode;
  if($("sortKabChartAll")) $("sortKabChartAll").value = mode;
  showKabChartAll();
}

// EVENT LISTENER DROPDOWN SORTING MODAL
if($("sortKabChartAll")){
  $("sortKabChartAll").onchange = function(e){
    changeSortMode(e.target.value);
  };
}

function closeKabChartAll(){
 const m=$("kabChartModal");
 if(m){
   m.classList.remove("show");
   m.style.display="none";
 }
}


// ==========================================
// ==========================================
// MODUL EWS — DATABASE TERPISAH
// ==========================================
function ewsCols(){
 const exact=(...names)=>{for(const x of names){const i=EWS_H.findIndex(h=>normHeaderValue(h)===normHeaderValue(x));if(i>=0)return i}return -1};
 const partial=(...names)=>{for(const x of names){const needle=normHeaderValue(x);const i=EWS_H.findIndex(h=>normHeaderValue(h).includes(needle));if(i>=0)return i}return -1};
 // Struktur INPUT DATA EWS bersifat tetap: A=NO., B=Jenis EWS, C=Desa,
 // D=Kecamatan, E=Kab/Kota, F=Tanggal Pemasangan, G=Tahun Pemasangan,
 // H=Sumber Pendanaan. Fallback posisi dipakai jika Google Visualization
 // menghilangkan/mengubah label header akibat merged cell/format sheet.
 const at=(found,fallback)=>found>=0?found:fallback;
 return {
   jenis:at(exact("Jenis EWS"),1),
   desa:at(exact("Desa/Kelurahan","Desa/Kel"),2),
   kec:at(exact("Kecamatan"),3),
   kab:at(partial("Kabupaten/Kota","Kabupaten/ Kota","Kabupaten"),4),
   tanggal:at(exact("Tanggal Pemasangan"),5),
   tahun:at(exact("Tahun Pemasangan"),6),
   sumber:at(exact("SUMBER PENDANAAN","Sumber Pendanaan"),7),
   ketSumber:at(exact("KETERANGAN PENDANAAN"),8),
   kodeKab:at(partial("Kode Kabupaten"),9),
   kodeKec:at(exact("Kode Kecamatan"),10),
   kodeDesa:at(exact("Kode Desa"),11)
 };
}
function ewsValidRow(r,c){return c.jenis>=0&&c.kab>=0&&validValue(r[c.jenis])&&validValue(r[c.kab]);}
function ewsParseDate(v){
 if(v instanceof Date && !Number.isNaN(v.getTime())) return v;
 if(v===null||v===undefined||v==="") return null;
 const s=String(v).trim();
 if(!s) return null;
 // Google Visualization: Date(YYYY,M,D), dengan M 0-based.
 const g=s.match(/^Date\s*\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})\s*\)$/i);
 if(g){
   const d=new Date(Number(g[1]),Number(g[2]),Number(g[3]));
   return Number.isNaN(d.getTime())?null:d;
 }
 // ISO / timestamp yang bisa dipahami browser.
 if(/^\d{4}-\d{1,2}-\d{1,2}/.test(s)){
   const d=new Date(s); return Number.isNaN(d.getTime())?null:d;
 }
 // Format umum Indonesia: dd/mm/yyyy atau dd-mm-yyyy.
 const id=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
 if(id){
   const d=new Date(Number(id[3]),Number(id[2])-1,Number(id[1]));
   return Number.isNaN(d.getTime())?null:d;
 }
 return null;
}
function ewsFmtDate(v){
 const d=ewsParseDate(v);
 if(d) return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
 if(v===null||v===undefined)return "";
 const s=String(v).trim();
 return s;
}
function ewsFmtYear(v){
 const d=ewsParseDate(v);
 if(d) return String(d.getFullYear());
 if(v===null||v===undefined||v==="")return "";
 const s=String(v).trim();
 if(!s)return "";
 const gdate=s.match(/Date\s*\(\s*((?:19|20)\d{2})\s*,/i);
 if(gdate)return gdate[1];
 const iso=s.match(/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/);
 if(iso)return iso[1];
 const num=Number(s.replace(/,/g,""));
 if(Number.isFinite(num)&&num>=1900&&num<=2100)return String(Math.trunc(num));
 return "";
}
function ewsActiveRows(){const c=ewsCols();let rows=EWS_R.filter(r=>ewsValidRow(r,c));if(ewsKabFilter)rows=rows.filter(r=>n(r[c.kab])===n(ewsKabFilter));return rows;}
function ewsSetStatus(ok,msg){const el=$("ewsConnection");if(!el)return;el.className="ews-status "+(ok?"ok":"bad");el.textContent="● "+msg;}
function loadEWS(force=false){
 if(ewsLoading)return;
 if(ewsLoaded&&!force){renderEWS();return;}
 ewsLoading=true;ewsSetStatus(true,"Menghubungkan data EWS...");
 loadGoogleSheetJsonp(EWS_CFG.id,EWS_CFG.sheet,(data)=>{
   const parsed=parseSheetData(data,(row)=>row.includes("jenis ews")&&row.includes("desa/kelurahan")&&row.includes("kecamatan")&&(row.includes("kabupaten/ kota")||row.includes("kabupaten/kota")||row.some(x=>x.includes("kabupaten")&&x.includes("kota"))),"EWS");
   EWS_H=parsed.headers;EWS_R=parsed.rows;
   const c=ewsCols();EWS_R=EWS_R.filter(r=>ewsValidRow(r,c));
   ewsLoaded=true;ewsLoading=false;ewsSetStatus(true,"Data Google Sheets EWS terhubung");
   initEWSFilter();initEWSTableFilters();renderEWS();
 },(e)=>{ewsLoading=false;ewsSetStatus(false,"Gagal membaca data EWS");toast("Data EWS gagal diproses: "+e.message);});
}
function initEWSFilter(){
 const g=$("ewsGlobalKab");if(!g)return;const c=ewsCols();
 const current=ewsKabFilter;
 g.innerHTML='<option value="">Jawa Tengah — Semua Kabupaten/Kota</option>';
 [...new Set(EWS_R.map(r=>String(r[c.kab]||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"id")).forEach(v=>g.insertAdjacentHTML("beforeend",`<option value="${esc(v)}">${esc(v)}</option>`));
 g.value=current;
 g.onchange=()=>{ewsKabFilter=g.value;ewsCurrentPage=1;renderEWS();};
}
function fillEWSSelect(id,values,placeholder){
 const el=$(id);if(!el)return;
 const current=el.value;
 el.innerHTML=`<option value="">${esc(placeholder)}</option>`;
 values.filter(Boolean).sort((a,b)=>String(a).localeCompare(String(b),"id",{numeric:true})).forEach(v=>el.insertAdjacentHTML("beforeend",`<option value="${esc(v)}">${esc(v)}</option>`));
 if(values.includes(current))el.value=current;
}
function initEWSTableFilters(){
 const c=ewsCols();
 fillEWSSelect("ewsTableKab",[...new Set(EWS_R.map(r=>String(r[c.kab]??"").trim()))],"Semua Kabupaten/Kota");
 fillEWSSelect("ewsTableJenis",[...new Set(EWS_R.map(r=>String(r[c.jenis]??"").trim()))],"Semua Jenis EWS");
 fillEWSSelect("ewsTableYear",[...new Set(EWS_R.map(r=>ewsFmtYear(r[c.tahun])).filter(Boolean))],"Semua Tahun Pemasangan");
 fillEWSSelect("ewsTableFund",[...new Set(EWS_R.map(r=>String(r[c.sumber]??"").trim()))],"Semua Sumber Dana");
 ["ewsSearch","ewsTableKab","ewsTableJenis","ewsTableYear","ewsTableFund"].forEach(id=>{const el=$(id);if(el)el.oninput=el.onchange=()=>{ewsCurrentPage=1;renderEWSTable(c);};});
}
function ewsDestroyCharts(){Object.values(ewsCharts).forEach(ch=>{try{ch.destroy()}catch(_){}});ewsCharts={};}
function ewsEmptyCanvas(id,msg="Tidak ada data"){
 const el=$(id);if(!el)return;const p=el.parentElement;p.innerHTML=`<div class="emptychart">${esc(msg)}</div>`;
}
function renderEWS(){
 if(!$('ews')||!ewsLoaded)return;
 const c=ewsCols(),rows=ewsActiveRows(),currentYear=String(new Date().getFullYear());
 if($("ewsTotal"))$("ewsTotal").textContent=fmt(rows.length);
 const thisYear=rows.filter(r=>ewsFmtYear(r[c.tahun])===currentYear).length;
 if($("ewsCurrentYear"))$("ewsCurrentYear").textContent=fmt(thisYear);
 if($("ewsTotalSub"))$("ewsTotalSub").textContent=ewsKabFilter?ewsKabFilter:"Jawa Tengah";
 if($("ewsYearSub"))$("ewsYearSub").textContent="tahun "+currentYear+(ewsKabFilter?" di "+ewsKabFilter:"");
 if($("ewsUpdate"))$("ewsUpdate").textContent=EWS_CFG.updated;
 renderEWSCharts(c,rows);
 renderEWSTable(c);
}
function ewsBuildKabData(c,rows){
 const map={};
 rows.forEach(r=>{const kab=String(r[c.kab]||"").trim(),t=String(r[c.jenis]||"").trim();if(!kab||!t)return;if(!map[kab])map[kab]={};map[kab][t]=(map[kab][t]||0)+1;});
 return Object.entries(map).map(([kab,byType])=>({kab,total:Object.values(byType).reduce((a,b)=>a+b,0),byType}));
}
function showEWSKabChartAll(){
 const modal=$("ewsKabChartModal");if(!modal)return;
 modal.classList.add("show");modal.style.display="flex";
 const box=modal.querySelector(".chartmodalbox");if(box){box.style.setProperty("width","1000px","important");box.style.setProperty("max-width","calc(100vw - 80px)","important");box.style.setProperty("max-height","84vh","important");}
 const body=modal.querySelector(".ews-modal-body");if(body){body.style.setProperty("height","68vh","important");body.style.setProperty("max-height","600px","important");}
 const sort=$("sortEWSKabChartAll");if(sort)sort.onchange=renderEWSKabModalChart;
 setTimeout(()=>renderEWSKabModalChart(),30);
}
function renderEWSKabModalChart(){
 const c=ewsCols(),rows=ewsActiveRows(),data=ewsBuildKabData(c,rows);
 const mode=$("sortEWSKabChartAll")?.value||"highest";
 if(mode==="alphabet")data.sort((a,b)=>a.kab.localeCompare(b.kab,"id"));
 else if(mode==="lowest")data.sort((a,b)=>a.total-b.total||a.kab.localeCompare(b.kab,"id"));
 else data.sort((a,b)=>b.total-a.total||a.kab.localeCompare(b.kab,"id"));
 const types=[...new Set(data.flatMap(x=>Object.keys(x.byType)))].sort((a,b)=>a.localeCompare(b,"id"));
 const colors=["#2F80ED","#F2994A","#27AE60","#EB5757","#9B51E0","#F2C94C","#56CCF2"];
 if(window.ewsKabAllChart)window.ewsKabAllChart.destroy();
 const canvas=$("ewsKabChartAll");if(!canvas)return;
 canvas.parentElement.style.height=Math.min(Math.max(data.length*34,460),760)+"px";
 const modalTotalsPlugin={id:"ewsModalTotals",afterDatasetsDraw(chart){const {ctx,scales}=chart;ctx.save();ctx.font="600 10px Arial";ctx.textAlign="center";ctx.textBaseline="bottom";data.forEach((x,i)=>{if(x.total){ctx.fillText(fmt(x.total),scales.x.getPixelForValue(i),scales.y.getPixelForValue(x.total)-5);}});ctx.restore();}};
 window.ewsKabAllChart=new Chart(canvas,{type:"bar",data:{labels:data.map(x=>x.kab),datasets:types.map((t,i)=>({label:t,data:data.map(x=>x.byType[t]||0),backgroundColor:colors[i%colors.length],borderWidth:0}))},plugins:[modalTotalsPlugin],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{position:"bottom",labels:{font:{size:9},boxWidth:12}}},scales:{x:{stacked:true,ticks:{font:{size:9},maxRotation:55,minRotation:55,autoSkip:false}},y:{stacked:true,beginAtZero:true,ticks:{precision:0}}}}});
 const totalAll=data.reduce((sum,x)=>sum+x.total,0);if($("ewsKabChartAllTotal"))$("ewsKabChartAllTotal").textContent=`Total EWS: ${fmt(totalAll)}`;
}
function closeEWSKabChartAll(){const m=$("ewsKabChartModal");if(m){m.classList.remove("show");m.style.display="none";}if(window.ewsKabAllChart){window.ewsKabAllChart.destroy();window.ewsKabAllChart=null;}}
function renderEWSCharts(c,rows){
 ewsDestroyCharts();
 const colors=["#2F80ED","#F2994A","#27AE60","#EB5757","#9B51E0","#F2C94C","#56CCF2","#6FCF97","#BB6BD9","#828282"];
 // 1. Sebaran EWS: vertikal, sumbu X nama kab/kota. Tampilan utama dibatasi agar ringkas; semua tersedia via modal.
 const kabData=ewsBuildKabData(c,rows).sort((a,b)=>b.total-a.total||a.kab.localeCompare(b.kab,"id"));
 const mainData=kabData.slice(0,10);
 const types=[...new Set(mainData.flatMap(x=>Object.keys(x.byType)))].sort((a,b)=>a.localeCompare(b,"id"));
 const can1=$("ewsKabChart");if(can1){
   const ewsKabTotalsPlugin={id:"ewsKabTotals",afterDatasetsDraw(chart){const {ctx,scales}=chart;ctx.save();ctx.font="600 10px Arial";ctx.textAlign="center";ctx.textBaseline="bottom";mainData.forEach((x,i)=>{if(x.total){ctx.fillText(fmt(x.total),scales.x.getPixelForValue(i),scales.y.getPixelForValue(x.total)-5);}});ctx.restore();}};
   ewsCharts.kab=new Chart(can1,{type:"bar",data:{labels:mainData.map(x=>x.kab),datasets:types.map((t,i)=>({label:t,data:mainData.map(x=>x.byType[t]||0),backgroundColor:colors[i%colors.length],borderWidth:0}))},plugins:[ewsKabTotalsPlugin],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{position:"bottom",labels:{font:{size:9},boxWidth:12}}},scales:{x:{stacked:true,ticks:{font:{size:9},maxRotation:55,minRotation:55,autoSkip:false}},y:{stacked:true,beginAtZero:true,ticks:{precision:0}}}}});}
 // 2. Total per jenis EWS
 const typeCounts={};rows.forEach(r=>{const t=String(r[c.jenis]||"").trim();if(t)typeCounts[t]=(typeCounts[t]||0)+1;});
 const typeData=Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]);
 const can2=$("ewsTypeChart");if(can2){ewsCharts.type=new Chart(can2,{type:"bar",data:{labels:typeData.map(x=>x[0]),datasets:[{label:"Jumlah EWS",data:typeData.map(x=>x[1]),backgroundColor:"#2F80ED",borderWidth:0}]},plugins:[barTopLabelsPlugin],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:10}}},y:{beginAtZero:true,ticks:{precision:0}}}}});}
 // 3. Sumber pendanaan
 const fundCounts={};rows.forEach(r=>{const f=String(r[c.sumber]||"").trim();if(validValue(f))fundCounts[f]=(fundCounts[f]||0)+1;});
 const fundData=Object.entries(fundCounts).sort((a,b)=>b[1]-a[1]);
 const can3=$("ewsFundChart");if(can3){ewsCharts.fund=new Chart(can3,{type:"doughnut",data:{labels:fundData.map(x=>`${x[0]} — ${fmt(x[1])} (${rows.length?(x[1]/rows.length*100).toFixed(1).replace(".",","):0}%)`),datasets:[{data:fundData.map(x=>x[1]),backgroundColor:colors}]},plugins:[doughnutLabelsPlugin],options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{font:{size:9},boxWidth:12,padding:8}}}}});}
 // 4. Pemasangan per tahun, dirinci sumber pendanaan. Hanya tahun 4 digit valid yang dihitung.
 const yearly={},fundNames=[];rows.forEach(r=>{const y=ewsFmtYear(r[c.tahun]),f=String(r[c.sumber]||"").trim();if(!y||!validValue(f))return;yearly[y]??={};yearly[y][f]=(yearly[y][f]||0)+1;if(!fundNames.includes(f))fundNames.push(f);});
 const years=Object.keys(yearly).sort((a,b)=>Number(a)-Number(b));
 const can4=$("ewsYearChart");if(can4&&years.length){const totalPlugin={id:"ewsYearTotals",afterDatasetsDraw(chart){const {ctx,scales}=chart;ctx.save();ctx.font="600 11px Arial";ctx.textAlign="center";ctx.textBaseline="bottom";years.forEach((y,i)=>{const total=Object.values(yearly[y]||{}).reduce((a,b)=>a+b,0);if(total){ctx.fillText(fmt(total),scales.x.getPixelForValue(i),scales.y.getPixelForValue(total)-5);}});ctx.restore();}};ewsCharts.year=new Chart(can4,{type:"bar",data:{labels:years,datasets:fundNames.map((f,i)=>({label:f,data:years.map(y=>yearly[y]?.[f]||0),backgroundColor:colors[i%colors.length],borderWidth:0}))},plugins:[totalPlugin],options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{position:"bottom",labels:{font:{size:9},boxWidth:12}}},scales:{x:{stacked:true,ticks:{font:{size:9}}},y:{stacked:true,beginAtZero:true,ticks:{precision:0}}}}});}
 else if(can4){can4.parentElement.innerHTML='<div class="emptychart">Data tahun pemasangan belum tersedia.</div>';}
}
function showEWSDetail(rowIndex){
 const r=EWS_R[rowIndex];
 if(!r)return;
 const c=ewsCols();
 const desa=c.desa>=0?String(r[c.desa]||"").trim():"";
 const kab=c.kab>=0?String(r[c.kab]||"").trim():"";
 const kec=c.kec>=0?String(r[c.kec]||"").trim():"";
 if($("ewsDetailTitle")) $("ewsDetailTitle").textContent=`${desa||"Detail EWS"}${kab?` — ${kab}`:""}`;
 if($("ewsDetailSub")) $("ewsDetailSub").textContent=`${kec?`${kec} • `:""}Seluruh data dari INPUT DATA EWS`;
 if($("ewsDetailGrid")){
   // Detail mengikuti kolom B:R pada INPUT DATA EWS. Header spreadsheet
   // menggunakan beberapa merged-cell, sehingga header dibentuk eksplisit
   // dari struktur data aslinya agar tidak berubah menjadi A, B, C, dst.
   const detailFields=[
     [1,"Jenis EWS"],
     [2,"Desa/Kelurahan"],
     [3,"Kecamatan"],
     [4,"Kabupaten/Kota"],
     [5,"Tanggal Pemasangan"],
     [6,"Tahun Pemasangan"],
     [7,"Sumber Pendanaan"],
     [8,"Keterangan Pendanaan"],
     [9,"Kode Kabupaten"],
     [10,"Kode Kecamatan"],
     [11,"Kode Desa"],
     [12,"Contact Person (Ketua TSB) — Nama"],
     [13,"Contact Person (Ketua TSB) — HP"],
     [14,"Koordinat Tiang Utama EWS — LS (X)"],
     [15,"Koordinat Tiang Utama EWS — BT (Y)"],
     [16,"Koordinat Sensor — LS (X)"],
     [17,"Koordinat Sensor — BT (Y)"]
   ];
   const items=detailFields.map(([i,h])=>({h,v:r[i]}));
   $("ewsDetailGrid").innerHTML=items.map(x=>{
     let value=x.v;
     if(x.h==="Tanggal Pemasangan") value=ewsFmtDate(value);
     if(x.h==="Tahun Pemasangan") value=ewsFmtYear(value);
     return `<div class="detailitem"><label>${esc(x.h)}</label><div>${esc(value===null||value===undefined||String(value).trim()===""?"—":value)}</div></div>`;
   }).join("");
 }
 if($("ewsDetailModal")){ $("ewsDetailModal").classList.add("show"); $("ewsDetailModal").style.display="flex"; }
}
function closeEWSDetail(){const m=$("ewsDetailModal");if(m){m.classList.remove("show");m.style.display="none";}}

function renderEWSTable(c){
 const q=n($("ewsSearch")?.value||""),fk=n($("ewsTableKab")?.value||""),ft=n($("ewsTableJenis")?.value||""),fy=$("ewsTableYear")?.value||"",ff=n($("ewsTableFund")?.value||"");
 let rows=EWS_R.filter(r=>ewsValidRow(r,c));
 rows=rows.filter(r=>{
   const kab=n(r[c.kab]||""),jenis=n(r[c.jenis]||""),year=ewsFmtYear(r[c.tahun]),fund=n(r[c.sumber]||"");
   const text=r.join(" ").toLowerCase();
   return (!q||text.includes(q))&&(!fk||kab===fk)&&(!ft||jenis===ft)&&(!fy||year===fy)&&(!ff||fund===ff);
 });
 const total=rows.length,pages=Math.max(1,Math.ceil(total/10));if(ewsCurrentPage>pages)ewsCurrentPage=pages;if(ewsCurrentPage<1)ewsCurrentPage=1;
 const start=(ewsCurrentPage-1)*10,end=Math.min(start+10,total),view=rows.slice(start,end);
 const labels=["Kabupaten/Kota","Kecamatan","Desa/Kelurahan","Jenis EWS","Tahun Pemasangan","Sumber Pendanaan"];const idx=[c.kab,c.kec,c.desa,c.jenis,c.tahun,c.sumber];
 const table=$("ewsTable");if(!table)return;
 table.querySelector("thead").innerHTML="<tr>"+labels.map(x=>`<th>${esc(x)}</th>`).join("")+"</tr>";
 table.querySelector("tbody").innerHTML=view.map(r=>{const originalIndex=EWS_R.indexOf(r);return `<tr class="clickrow" data-ews-row="${originalIndex}" title="Klik untuk melihat detail EWS">`+idx.map(i=>`<td>${esc(i>=0?(i===c.tahun?ewsFmtYear(r[i]):r[i]):"")}</td>`).join("")+`</tr>`;}).join("");
 if($("ewsInfo"))$("ewsInfo").textContent=total?`Menampilkan ${fmt(start+1)} - ${fmt(end)} dari ${fmt(total)} data`:"Tidak ada data";
 if($("ewsPageIndicator"))$("ewsPageIndicator").textContent=`Halaman ${ewsCurrentPage} dari ${pages}`;
 if($("ewsPrevBtn"))$("ewsPrevBtn").disabled=ewsCurrentPage<=1;
 if($("ewsNextBtn"))$("ewsNextBtn").disabled=ewsCurrentPage>=pages;
}
window.changeEWSPage=function(direction){ewsCurrentPage+=direction;renderEWSTable(ewsCols());};

function go(p){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));if($(p)) $(p).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));let t={dashboard:"Dashboard Pencegahan & Kesiapsiagaan",destana:"Desa Tangguh Bencana",ews:"Early Warning System",spab:"Satuan Pendidikan Aman Bencana",lidi:"Unit LIDI Jawa Tengah",dokumen:"Dokumen Kebencanaan",peta:"Peta Kebencanaan",edukasi:"Edukasi Kebencanaan"};if($("title")) $("title").textContent=t[p];if($("sidebar")) $("sidebar").classList.remove("open");if(p==="destana"&&map)setTimeout(()=>map.invalidateSize(),150);if(p==="ews")loadEWS();}
function toast(x){let t=$("toast");if(!t)return;t.textContent=x;t.style.display="block";setTimeout(()=>t.style.display="none",4500)}

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.page));
document.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>go(b.dataset.jump));
document.querySelectorAll("[data-chart-all]").forEach(b=>b.onclick=showKabChartAll);
if($("ewsRefresh"))$("ewsRefresh").onclick=()=>loadEWS(true);
if($("ewsKabChartAllBtn"))$("ewsKabChartAllBtn").onclick=showEWSKabChartAll;
if($("sortEWSKabChartAll"))$("sortEWSKabChartAll").onchange=renderEWSKabModalChart;


// Modal controls are declared after app.js in index.html; use delegated events so
// sorting works both locally and on GitHub Pages.
document.addEventListener("change", function(e){
  if(e.target && e.target.id==="sortKabChartAll"){ changeSortMode(e.target.value); }
  if(e.target && e.target.id==="sortEWSKabChartAll"){ renderEWSKabModalChart(); }
});

document.addEventListener("click", function(e) {
  if (e.target.closest("#closeKabChart") || e.target.closest("#closeKabChartBtn") || e.target.closest(".close-kab-chart") || e.target.id === "kabChartModal") {
    closeKabChartAll();
  }
  if (e.target.closest("#closeEWSKabChart") || e.target.id === "ewsKabChartModal") {
    closeEWSKabChartAll();
  }
  // Year chart modal is declared after app.js, so bind its close action
  // through event delegation to ensure it works on local files and hosting.
  if (e.target.closest("#closeYearChart") || e.target.id === "yearChartModal") {
    closeYearChartModal();
  }
});

if($("closeModal")) $("closeModal").onclick=()=>$("detailModal")?.classList.remove("show");
if($("detailModal")) $("detailModal").onclick=e=>{if(e.target.id==="detailModal")$("detailModal").classList.remove("show")};
document.addEventListener("click",function(e){
  const row=e.target.closest("#ewsTable tbody tr[data-ews-row]");
  if(row){showEWSDetail(Number(row.dataset.ewsRow));}
});
if($("closeEWSDetail")) $("closeEWSDetail").onclick=closeEWSDetail;
if($("ewsDetailModal")) $("ewsDetailModal").onclick=e=>{if(e.target.id==="ewsDetailModal")closeEWSDetail();};

document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    $("detailModal")?.classList.remove("show");
    closeEWSDetail();
    closeKabChartAll();
    closeEWSKabChartAll();
    closeYearChartModal();
  }
});

if($("menuBtn")) $("menuBtn").onclick=()=>$("sidebar")?.classList.toggle("open");
if($("search")) $("search").oninput=()=>{ currentPage=1; table(cols()); };
if($("refresh")) $("refresh").onclick=load;

load();

// V39 - tombol perbesar grafik Pembentukan DESTANA per Tahun
if($("yearChartExpand")) $("yearChartExpand").addEventListener("click", renderYearChartInModal);
if($("closeYearChart")) $("closeYearChart").addEventListener("click", closeYearChartModal);
if($("yearChartModal")) $("yearChartModal").addEventListener("click", e=>{ if(e.target.id==="yearChartModal") closeYearChartModal(); });

// V38 - tombol perbesar peta DESTANA
function initDestanaMapExpand(){
 const btn=$("destanaMapExpand"), panel=$("destanaMapPanel");
 if(!btn||!panel||btn.dataset.bound) return;
 btn.dataset.bound="1";
 const setExpanded=(expanded)=>{
   panel.classList.toggle("is-expanded",expanded);
   document.body.classList.toggle("map-expanded-open",expanded);
   btn.textContent=expanded?"✕ Kembalikan Peta":"⛶ Perbesar Peta";
   setTimeout(()=>{ if(map) map.invalidateSize(); },80);
 };
 btn.addEventListener("click",()=>setExpanded(!panel.classList.contains("is-expanded")));
 document.addEventListener("keydown",e=>{ if(e.key==="Escape" && panel.classList.contains("is-expanded")) setExpanded(false); });
}

initDestanaMapExpand();
