# Erlangga Online — CMS Multi-Brand Template

CMS (Content Management System) untuk mengelola banyak website brand dari satu admin panel. Setiap brand menggunakan template yang dapat digunakan ulang (reusable) dan dapat diakses melalui URL `http://localhost:3000/[nama-brand]`.

## Tech Stack

- **Backend**: Node.js + Express.js
- **Template Engine**: EJS
- **Database**: SQLite (via better-sqlite3)
- **Upload**: Multer
- **Styling**: Tailwind CSS (CDN)

## Instalasi

```bash
# 1. Clone / masuk ke folder project
cd d:\Project\erlanggaonline

# 2. Install dependencies
npm install

# 3. Jalankan server
npm run dev
```

Server akan berjalan di **http://localhost:3000**.

> **Note**: Jika muncul error `EADDRINUSE: address already in use :::3000`, artinya port 3000 sudah digunakan. Matikan proses sebelumnya atau ubah port di `server.js`.

## Struktur URL

| URL | Fungsi |
|-----|--------|
| `http://localhost:3000/` | Homepage — daftar semua brand website |
| `http://localhost:3000/admin` | Admin Panel — kelola semua data |
| `http://localhost:3000/[brand-slug]` | Halaman publik brand (contoh: `/eksakta`) |

## Cara Penggunaan

### 1. Membuat Brand Baru

1. Buka **http://localhost:3000/admin**
2. Klik tombol **"New Brand"**
3. Isi form:
   - **Template**: Pilih template yang ingin digunakan
   - **Brand Name**: Nama brand (contoh: "Eksakta")
   - **URL Slug**: Slug URL, huruf kecil tanpa spasi (contoh: `eksakta`)
   - **Logo Text & Initial**: Teks logo di navbar
   - **Brand Colors**: Pilih warna utama dan aksen
4. Klik **"Save Brand"**

### 2. Edit Konten Website

Setelah brand dibuat, Anda bisa mengedit semua section melalui halaman edit brand:

| Section | Yang bisa diedit |
|---------|-----------------|
| **Hero** | Badge, heading (3 baris), deskripsi, tombol CTA, gambar hero |
| **Features** | Kartu fitur (icon, judul, deskripsi, warna) — bisa tambah/hapus |
| **Catalog** | Heading dan deskripsi section katalog |
| **Products** | Produk/buku (judul, deskripsi, harga, grade, gambar, featured) |
| **CTA** | Heading, deskripsi, dan 2 tombol aksi |
| **Brand Settings** | Nama, warna, logo, tagline, copyright, powered by |

### 3. Menambah Produk

1. Di halaman edit brand, scroll ke bagian **Products**
2. Klik **"Add Product"**
3. Isi judul, deskripsi, harga, grade, URL gambar
4. Centang **"Featured / Best Seller"** untuk produk unggulan
5. Klik **"Save Product"**

### 4. Melihat Website

Buka `http://localhost:3000/[slug-brand]` di browser.

Contoh: `http://localhost:3000/eksakta`

## Struktur Folder

```
erlanggaonline/
├── server.js                  # Entry point Express
├── package.json
├── database/
│   ├── init.js                # Inisialisasi SQLite & schema
│   └── seed.js                # Data contoh (brand Eksakta)
├── routes/
│   ├── public.js              # Route publik (/, /:brandSlug)
│   └── admin.js               # Route admin panel (CRUD)
├── views/
│   ├── index.ejs              # Homepage publik
│   ├── 404.ejs                # Halaman not found
│   ├── templates/
│   │   └── template1.ejs      # Template landing page (EJS)
│   └── admin/
│       ├── layout.ejs         # Layout admin
│       ├── dashboard.ejs      # Dashboard admin
│       ├── brands/
│       │   ├── list.ejs       # Daftar brands
│       │   └── form.ejs       # Form create/edit brand
│       └── products/
│           └── form.ejs       # Form create/edit produk
├── templates/
│   └── templates1.html        # Template HTML original (referensi)
├── public/
│   ├── css/                   # CSS files
│   └── uploads/               # Upload gambar
└── data/
    └── cms.db                 # SQLite database (auto-generated)
```

## Menambah Template Baru

1. Buat file EJS baru di `views/templates/` (contoh: `template2.ejs`)
2. Gunakan variabel EJS yang tersedia:
   - `brand` — data brand (nama, logo, warna, dll)
   - `sections` — data section (hero, features, cta, dll)
   - `products` — array produk
   - `features` — array fitur
   - `navLinks` — array link navigasi
   - `socialLinks` — array link sosial media
   - `footerColumns` — object link footer per kolom
3. Tambahkan entry template ke database melalui `database/seed.js` atau langsung ke SQLite

## Data Default

Saat pertama kali dijalankan, database akan otomatis ter-seed dengan:
- **1 Template**: "Landing Page Buku"
- **1 Brand**: "Eksakta" (slug: `eksakta`)
- **4 Produk**: Buku Koding & KA dan Informatika kelas VII-IX
- **3 Fitur**: Berbasis STEM, Print-Dig Integration, Deep Learning
