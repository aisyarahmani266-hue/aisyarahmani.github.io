# Toko Adila - Web Kasir Sederhana

Aplikasi Point of Sale (POS) berbasis web untuk manajemen toko kelontong/sembako.

## Fitur
-   **Kasir**: Pencarian barang cepat, hitung total otomatis, cetak struk (simulasi).
-   **Barcode Scanner**: Scan produk menggunakan kamera HP.
-   **Manajemen Barang**: Tambah, Edit, Hapus data barang.
-   **Laporan**: Rekap penjualan harian/bulanan, pencatatan hutang.
-   **PWA**: Bisa diinstall sebagai aplikasi di Android/iOS/PC.
-   **Responsif**: Tampilan menyesuaikan HP dan Laptop.

## Catatan Penting
Web ini menggunakan **LocalStorage** browser untuk menyimpan data (bukan database server). Artinya:
1.  Data yang Anda input (transaksi/barang baru) **hanya tersimpan di browser Laptop/HP Anda sendiri**.
2.  Jika link ini dibuka di HP orang lain, datanya akan kembalie ke pengaturan awal (Reset).

## Cara Membuka di HP (Localhost)
Agar bisa dibuka di HP, Laptop dan HP harus terhubung ke **Wi-Fi yang sama**.

### Langkah 1: Jalankan Server di Laptop
1.  Buka project ini di **VS Code**.
2.  Install Extension **"Live Server"**.
3.  Klik kanan pada `index.html` -> Pilih **"Open with Live Server"**.
4.  Web akan terbuka di browser (biasanya port 5500).

### Langkah 2: Cek IP Laptop
1.  Buka **Command Prompt (CMD)** atau Terminal.
2.  Ketik `ipconfig` (Windows) lalu Enter.
3.  Cari **IPv4 Address**. Contoh: `192.168.1.10`.

### Langkah 3: Buka di HP
1.  Buka Chrome di HP.
2.  Ketik alamat: `http://[IP-LAPTOP]:5500`.
    -   Contoh: `http://192.168.1.10:5500`
3.  Klik menu browser -> **"Add to Home Screen"** untuk menginstall.

---
**Penting**: Fitur **Kamera/Scanner** mungkin tidak jalan jika tidak menggunakan HTTPS. Namun untuk localhost biasanya Chrome masih mengizinkan. Jika tetap tidak bisa, pastikan izin kamera diberikan.
