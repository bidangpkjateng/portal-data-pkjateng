# Portal Data PK Jateng v30

Perbaikan lanjutan peta DESTANA:
- Mempertahankan data DESTANA dari kolom PEMBENTUKAN (kolom C) dan persentase dari kolom G.
- Memperbaiki feature Kota Magelang yang berhasil dimuat dari BIG tetapi atribut namanya terbaca sebagai "Magelang" sehingga tooltip/detail kosong.
- Feature dengan kode KDPKAB 33.71 sekarang dinormalisasi menjadi `WADMKK = Kota Magelang`.
- Geometry Kota Magelang tetap diambil dari layanan batas administrasi BIG jika geometry lokal kosong.
- Bagian lain website dipertahankan.
