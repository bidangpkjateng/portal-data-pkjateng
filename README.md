# Website Bidang Pencegahan & Kesiapsiagaan BPBD Jawa Tengah

Prototype website statis dengan DESTANA sebagai modul pertama.

## Database DESTANA
Spreadsheet ID: `1clhhPSSb9z-tgGbpSNjk_fwWZjr02moi2qJneyWkzzQ`
Sheet: `INPUT DATA`

Website membaca data Google Sheets melalui Google Visualization endpoint.

## File
- index.html
- style.css
- app.js

## Publikasi gratis
Project ini cocok untuk GitHub Pages. Upload ketiga file ke repository, aktifkan Settings > Pages > Deploy from branch.

## Catatan
Google Sheets harus dapat dibaca sebagai Viewer oleh siapa saja yang memiliki link. Kolom Latitude dan Longitude boleh kosong; peta akan otomatis menampilkan titik setelah koordinat diisi.


Versi 6: perapihan lebar tabel dan filter Kabupaten/Kota global untuk indikator utama DESTANA. Jumlah desa/kelurahan per kabupaten menggunakan data BPS Jawa Tengah 2024 dan total 8.563.

## Versi 7
Perbaikan koneksi Google Sheets dan tata letak dashboard DESTANA.

## Versi 8
Perbaikan pembacaan header Google Sheets, tabel DESTANA, layout grafik, indikator tahun berjalan, dan logo BPBD Jawa Tengah.

## Versi 9
Perbaikan grafik sebaran, tabel 25 baris, dan grafik pembentukan bertumpuk menurut sumber dana.


## Versi 10
- Mengabaikan Kabupaten/Kota kosong atau bernilai tidak valid pada grafik sebaran.
- Mengabaikan sumber pendanaan kosong atau bernilai tidak valid pada pie chart.
- Grafik pembentukan DESTANA per tahun tetap bertumpuk berdasarkan sumber dana.
- Menambahkan angka total pembentukan di atas setiap batang tahun.

## Versi 11
- Tampilan kartu indikator utama pada HP menjadi 2 kolom (2 kartu per baris).
- Label indikator dipersingkat agar lebih ringkas di layar kecil.
- Grafik Sebaran DESTANA per Kabupaten/Kota hanya menghitung status PEMBENTUKAN.


## Versi 12
- Ikon sidebar diganti menjadi ikon SVG yang konsisten.
- Sebaran DESTANA tetap hanya menghitung status Pembentukan.
- Ditambahkan tombol Lihat semua untuk sebaran DESTANA per Kabupaten/Kota.
- Pie chart menampilkan jumlah dan persentase pada legenda setiap sumber dana.
