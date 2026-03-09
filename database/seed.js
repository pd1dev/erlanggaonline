const bcrypt = require('bcryptjs');
const db = require('./init');

function seed() {
  // Check if already seeded
  const existingTemplate = db.prepare('SELECT id FROM templates WHERE slug = ?').get('glass');
  if (existingTemplate) {
    console.log('Database already seeded, skipping...');
    // Still ensure default super admin exists
    ensureSuperAdmin();
    return;
  }

  console.log('Seeding database...');

  // Create default super admin
  const adminId = ensureSuperAdmin();

  // Insert templates
  const insertTemplate = db.prepare(`
    INSERT INTO templates (name, slug, file_path, description, category) VALUES (?, ?, ?, ?, ?)
  `);
  
  // Glassmorphism Template
  const glassResult = insertTemplate.run(
    'Glassmorphism', 
    'glass', 
    'templates/template-glass',
    'Template modern dengan efek kaca transparan dan blur. Tampilan elegan dengan gradasi warna lembut.',
    'glass'
  );
  const templateId = glassResult.lastInsertRowid;
  
  // Neumorphism Template
  insertTemplate.run(
    'Neumorphism', 
    'neumorph', 
    'templates/template-neumorph',
    'Template dengan desain soft shadow dan efek timbul. Tampilan lembut dan futuristik.',
    'neumorph'
  );
  
  // 3D Elements Template
  insertTemplate.run(
    '3D Elements', 
    '3d', 
    'templates/template-3d',
    'Template dengan elemen 3D, efek depth, dan animasi menarik. Tampilan bold dan dinamis.',
    '3d'
  );
  
  // Minimalist Template
  insertTemplate.run(
    'Minimalist', 
    'minimal', 
    'templates/template-minimal',
    'Template bersih dengan banyak whitespace dan tipografi sederhana. Tampilan modern dan profesional.',
    'minimal'
  );

  // Insert brand
  const insertBrand = db.prepare(`
    INSERT INTO brands (template_id, name, slug, logo_text, logo_initial, tagline, primary_color, primary_hover_color, accent_color_1, accent_color_2, accent_color_3, copyright_text, powered_by, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const brandResult = insertBrand.run(
    templateId,
    'Eksakta',
    'eksakta',
    'ERLANGGA',
    'E',
    'Penerbit Erlangga telah melayani kebutuhan pendidikan Indonesia sejak 1952. Kami berkomitmen untuk terus berinovasi mencerdaskan bangsa.',
    '#0056b3',
    '#004494',
    '#76bc43',
    '#6658a6',
    '#f58220',
    '© 2023 Penerbit Erlangga. All rights reserved.',
    'Kurikulum Merdeka',
    adminId
  );
  const brandId = brandResult.lastInsertRowid;

  // Insert hero section
  const insertSection = db.prepare(`
    INSERT INTO sections (brand_id, section_type, data) VALUES (?, ?, ?)
  `);
  insertSection.run(brandId, 'hero', JSON.stringify({
    badge: '🚀 Kurikulum Merdeka Ready',
    heading_line1: 'Seri Eksakta:',
    heading_line2: 'Masa Depan Teknologi',
    heading_line3: 'di Tangan Siswa',
    description: 'Gabungkan keseruan belajar dengan teknologi! Mencetak inovator cilik yang cerdas, kreatif, dan siap menghadapi dunia digital.',
    cta_primary_text: 'Lihat Katalog',
    cta_primary_href: '#catalog',
    cta_secondary_text: 'Tonton Video',
    cta_secondary_href: '#',
    hero_image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9RN8fwewwKpg99iqxDxgP_D_6jTMLceTfupkWLcJ2elYb6CMYFoSi5M4-ZzFePvr19-aax34Nc4HbIpC6Yonb0BK8l-Cty0WHON1clwYh83zisocgLSp4ZwK1-gnkR6ZLxsXTeDtZ_D4GCVzKv20HVgG3lY2iaFTepzJfgnsKjslW9vhImCXroOcahT6ePfPkFXV_aVGhWhkpr98pbT-FQ1dnuCLoN6W8TPI5BBN6p2wgMdCvBjuNHOIRLYS5jBdc5UHhUXcvQJdV'
  }));

  insertSection.run(brandId, 'features_header', JSON.stringify({
    badge: 'Fitur Unggulan',
    heading: 'Kenapa Harus',
    heading_highlight: 'Eksakta?',
    description: 'Belajar jadi lebih seru dengan metode kekinian yang disukai anak-anak.'
  }));

  insertSection.run(brandId, 'cta', JSON.stringify({
    heading_prefix: 'Siap Menghadapi',
    heading_highlight: 'Era Digital?',
    description: 'Dapatkan seri buku Eksakta sekarang! Bekal terbaik untuk masa depan teknologi yang gemilang.',
    button1_text: 'Download Silabus',
    button1_icon: 'download',
    button2_text: 'Hubungi Sales',
    button2_icon: 'support_agent'
  }));

  insertSection.run(brandId, 'catalog_header', JSON.stringify({
    heading: 'Katalog Buku',
    description: 'Pilih buku sesuai jenjang kelasmu!',
    filter_tabs: ['Semua', 'Koding & KA', 'Informatika']
  }));

  // Insert features
  const insertFeature = db.prepare(`
    INSERT INTO features (brand_id, icon, title, description, color_class, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertFeature.run(brandId, 'rocket_launch', 'Berbasis STEM', 'Sains, Teknologi, Teknik, dan Matematika jadi satu paket komplit yang asik dipelajari bareng-bareng.', 'primary', 1);
  insertFeature.run(brandId, 'touch_app', 'Print-Dig Integration', 'Buku fisik rasa digital! Tinggal scan QR code, langsung muncul video dan kuis seru.', 'accent-purple', 2);
  insertFeature.run(brandId, 'psychology', 'Deep Learning', 'Materi disusun bertahap biar konsepnya nempel terus di ingatan dan paham sampai ke akar-akarnya.', 'accent-green', 3);

  // Insert products
  const insertProduct = db.prepare(`
    INSERT INTO products (brand_id, title, description, price, grade, image_url, is_featured, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertProduct.run(brandId, 'Koding & KA Kelas VII', 'Kecerdasan Artifisial seru untuk pemula.', 85000, 'Grade 7', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBH9FGJPdd-2UQo18K3gwIAXQIYmbT-z-7WNbU8Y5ur0yJSksKWoE6Ax7spoKME5_XmnM6VfdymrurOBFi5qRGU2S5FVEj9RUFMp8y_Fgs3Q2tT3J_UUjEv_pwm_0p8fVTQ--RiaTqlNu29QRMzlaY2Z8DS8lr9N9RgjtRZCogh3t54_lwkPwh0oQuMNLBihf8gaZJOrD-DihH-RL0jlwFlO2oe1ofcgynK7vRqL3Xmwx53HOTT0km4MxvOc-EHqYTt2WY_NdAUw6x3', 0, 1);
  insertProduct.run(brandId, 'Informatika Kelas VII', 'Kenali hardware dan cara kerja komputer.', 85000, 'Grade 7', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwzj8PnkwJIEDTUPsJ8_p6l0fGyMwwWPE_FOBz5LISOLwGDfUY-YzB1YJXDIHB5f7qdTfP6VXN-XIbbtuwSTPogIIwJlfJapSDucTuiDyXBFjkbOkP2D3leHmk_5ZHTNQKNKAC2Jo8hqD5tMfzWnF8Q642OoEe8OVvndE_8Lp_5q1QKN2sGpUF5j7SAzwKpa0gLN_nAbYSWYWt63V_5NoEscbGFsN-S9fRqynE2X7ds7JpGxcsiJv82EUq1dSoMf-sfQt8PXOeee3y', 0, 2);
  insertProduct.run(brandId, 'Koding & KA Kelas VIII', 'Petualangan Neural networks & deep learning.', 88000, 'Grade 8', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAW7ZwFoMxLx2HRR6eDSqClQmmOnS2WIBmv3pswnpBoK7z9xIN7fFyrovv6WJoLkUfB7ueoPjbBnG2Re9riSWevkRYh-p71DgeMN45HWqegfSztsaOMBEFSN9tNEEi_3Y51cLkqr0hqL-0WlbPbtIm103JduxqIuuFjl2d_E8iCdRPKH7vBwRyfoKlAoDxjMTI9P1OUwn4paz-gzoOTQKlY2SYaPpFjDHDqbd1QByHcv80Pc9CzbBTjYyFNcOKOrb0JK7TTDMBBmsmm', 1, 3);
  insertProduct.run(brandId, 'Koding & KA Kelas IX', 'Bikin robot sendiri dengan otomasi cerdas.', 92000, 'Grade 9', 'https://lh3.googleusercontent.com/aida-public/AB6AXuApCEp8an1g5IvJ_AD4VVhIoGkYNPgbBU1krLzQuKUPwCdn0Q7DkhciC3fiBP-SRyt_EDhQkDXPGC0o2suTDkGGpI_q6YRse-DKKCTNmnSRV1O0JrhWCxu3hxSrfRifS8ICvV0wzbP8NaLoRAZmwFKw3gPsmUCCnVMnPFS3reamRXJKMkLhnCjMY03a14e0BN369pI_YTuKzC9IbU67FqKPD1Lm4Sk3bsXtlwiwf_wwN6Y9GRyIGtR3EjYZNl3selSkMXjTmVBo_ujj', 0, 4);

  // Insert nav links
  const insertNav = db.prepare(`
    INSERT INTO nav_links (brand_id, label, href, is_button, sort_order) VALUES (?, ?, ?, ?, ?)
  `);
  insertNav.run(brandId, 'Beranda', '#', 0, 1);
  insertNav.run(brandId, 'Keunggulan', '#features', 0, 2);
  insertNav.run(brandId, 'Produk', '#catalog', 0, 3);
  insertNav.run(brandId, 'Hubungi Kami', '#', 1, 4);

  // Insert social links
  const insertSocial = db.prepare(`
    INSERT INTO social_links (brand_id, icon, href, sort_order) VALUES (?, ?, ?, ?)
  `);
  insertSocial.run(brandId, 'facebook', '#', 1);
  insertSocial.run(brandId, 'smart_display', '#', 2);
  insertSocial.run(brandId, 'photo_camera', '#', 3);

  // Insert footer links
  const insertFooter = db.prepare(`
    INSERT INTO footer_links (brand_id, column_title, label, href, sort_order) VALUES (?, ?, ?, ?, ?)
  `);
  insertFooter.run(brandId, 'Produk', 'Buku Teks', '#', 1);
  insertFooter.run(brandId, 'Produk', 'Buku Digital', '#', 2);
  insertFooter.run(brandId, 'Produk', 'Alat Peraga', '#', 3);
  insertFooter.run(brandId, 'Produk', 'Eksakta Series', '#', 4);
  insertFooter.run(brandId, 'Bantuan', 'Hubungi Kami', '#', 1);
  insertFooter.run(brandId, 'Bantuan', 'Lokasi Toko', '#', 2);
  insertFooter.run(brandId, 'Bantuan', 'Karir', '#', 3);
  insertFooter.run(brandId, 'Bantuan', 'Kebijakan Privasi', '#', 4);

  // ==================== HOMEPAGE SEEDING ====================
  seedHomepage();

  console.log('Database seeded successfully!');
  console.log(`  Templates: Glassmorphism, Neumorphism, 3D Elements, Minimalist`);
  console.log(`  Brand: Eksakta (ID: ${brandId}, slug: eksakta)`);
  console.log(`  Super Admin: admin / admin123`);
}

function ensureSuperAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (existing) return existing.id;

  const hash = bcrypt.hashSync('admin123', 10);
  const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'super_admin');
  console.log('  Created default Super Admin: admin / admin123');
  return result.lastInsertRowid;
}

function seedHomepage() {
  const existing = db.prepare('SELECT id FROM homepage_settings WHERE id = 1').get();
  if (existing) return;

  console.log('  Seeding homepage data...');

  // Settings
  db.prepare(`INSERT INTO homepage_settings (id, site_name, site_tagline, primary_color,
    hero_badge, hero_badge_icon, hero_title, hero_title_highlight, hero_description,
    hero_cta1_text, hero_cta1_href, hero_cta2_text, hero_cta2_href,
    hero_promo_badge, hero_promo_heading, hero_promo_description, hero_promo_code,
    hero_promo_button_text, hero_promo_button_href, hero_promo_image_url,
    products_heading, survey_heading, survey_description, survey_button_text, survey_button_href,
    testimonials_badge, testimonials_heading,
    footer_description, footer_address, footer_phone, footer_email, footer_copyright
  ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'Erlangga Online', 'Belajar Lebih Seru', '#257bf4',
    'Masa Depan Belajar Dimulai Sini', 'rocket_launch',
    'Belajar Lebih Seru dengan', 'Erlangga Online',
    'Akses ribuan materi pendidikan berkualitas, eBook interaktif, dan simulasi ujian kapan saja dan di mana saja. Jadikan proses belajar menjadi petualangan yang menyenangkan!',
    'Mulai Belajar', '#', 'Lihat Produk', '#products',
    'Promo Spesial Bulan Ini', 'Diskon hingga 50% untuk Paket Berlangganan',
    'Gunakan kode:', 'ERLANGGA2024',
    'Cek Promo Sekarang', '#', '',
    'Produk Unggulan Kami',
    'Suara Anda Berharga!',
    'Bantu kami meningkatkan layanan Erlangga Online dengan mengikuti Survei Pelanggan. Dapatkan kesempatan memenangkan hadiah menarik!',
    'Ikut Survei', '#',
    'Testimoni', 'Apa Kata Mereka?',
    'Membangun generasi cerdas Indonesia melalui teknologi pendidikan terdepan dan materi berkualitas tinggi.',
    'Jl. H. Baping No. 100, Ciracas, Jakarta Timur, 13740',
    '+62 (21) 871 7006',
    'support@erlanggaonline.com',
    '© 2024 PT Penerbit Erlangga Online. Seluruh hak cipta dilindungi undang-undang.'
  );

  // Nav links
  const insertNav = db.prepare('INSERT INTO homepage_nav_links (label, href, is_button, position, sort_order) VALUES (?, ?, ?, ?, ?)');
  insertNav.run('Beranda', '#', 0, 'left', 1);
  insertNav.run('Produk', '#products', 0, 'left', 2);
  insertNav.run('Survei', '#', 0, 'right', 1);
  insertNav.run('Belanja', '#', 1, 'right', 2);

  // Homepage products
  const insertProd = db.prepare('INSERT INTO homepage_products (icon, title, description, image_url, link_text, link_href, bg_color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertProd.run('menu_book', 'eBook Interaktif', 'Baca ribuan buku digital berkualitas dari penerbit Erlangga dengan fitur anotasi dan highlight.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDhXs2braK2o3tPMyR9sqW-96Ifujmarqy0juZZj9FwZUuTdV35I3LUt8D87u8_AxFLYlHms9eomood7SIV8efKwudu6sSchbWc_Pwco_Wby2vwbcQbt7gxksZ7H8OnsBb5orUevVY5EWXUoKENjThXS5bl436rH_KrJz6BS6aPbXwcR3Oj595VdV1tEYVQOh9Y5vC3vk_LjWYRt10PsP0_iNm2b5VCgggxMIjSLD7ZISCCWx8bWl_aJEFL8ULmzHwkppql_HwcY9Y',
    'Selengkapnya', '#', '', 1);
  insertProd.run('local_library', 'e-Library Sekolah', 'Solusi perpustakaan digital untuk instansi sekolah dengan manajemen peminjaman yang mudah.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCE09nOL8ga0er1Vi9irSg-Rw-UiEZtPJMqIMuDDxirYLwdpHA6GSZ80l0ViARSQWXKOsc0IrRl2Mw_Tl3zaye8DMPyuzIsYkmtxOTaI2Bndvsm9aHs6hgkw-9lViRKDHDEQsXOUnQksW472BZVjM-iptu4lkX8CNqLUrm5IhRN6KVUXg0zS2fiDQ98h-DC9sUgvDgWay80WCwLyZVQMdQ6TKByyw6XSlXqGRfkNbxwjv-qRqZFiU5QE7NuC7hV31TSaXWD2vNQ7SU',
    'Selengkapnya', '#', '', 2);
  insertProd.run('quiz', 'Tryout AKM & Ujian', 'Latih kesiapanmu menghadapi ujian nasional dan sekolah dengan simulasi real-time dan pembahasan.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCgNcPjiWgA15tDf-F8Vx3RoLNvyyPBm_hn6g0NvREdn9SIwQj1KRV0WUTHzBeP8ZgPlTKsjNPz3I15dzaUyiyj4JR6YnLSAl0buIo4azFzsz-wzOCWPuw9_aYo9Cx4XFkdeqbQ_XhN7yffTX4RpJZBxI93OYEsms7Z0DPf2wbZxjOEs0KPreUX1wrt_bHV4r8BGlSJpYWDG6-49iCpSMkC13T7QW4rf6eWDrlN48zEJsZxQJXcAofEGhj7RMknrf9rlQp5mitpcX0',
    'Selengkapnya', '#', '', 3);
  insertProd.run('task', 'Bank Soal Digital', 'Akses puluhan ribu soal latihan berkualitas untuk berbagai jenjang pendidikan.',
    '', 'Selengkapnya', '#', 'blue', 4);
  insertProd.run('movie', 'Video Pembelajaran', 'Materi visual yang menarik dibawakan oleh pengajar berpengalaman di bidangnya.',
    '', 'Selengkapnya', '#', 'purple', 5);
  insertProd.run('groups', 'Webinar Eksklusif', 'Sesi interaktif langsung bersama pakar pendidikan dan tokoh inspiratif.',
    '', 'Selengkapnya', '#', 'orange', 6);

  // Testimonials
  const insertTest = db.prepare('INSERT INTO homepage_testimonials (name, role, quote, avatar_url, rating, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
  insertTest.run('Andi Pratama', 'Siswa Kelas 9',
    'Belajar jadi lebih gampang pakai eBook Erlangga. Gambarnya bagus dan bisa di-highlight sesuka hati!',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA6EwB55y_B5npVWhPN6v0BFG-ofktjs1mPM_iy_0zOZSGId3nDThUf60CXNX6XwEavPjk5sewembGc7ydvvU-u95eLsNDGL7-RjQ0xFa3YNhsHQBe7tNCPgDJegZo2BCmvNqRhBFcJdKfdTtqY2O59PLE5LsEiOzcIeCOcYgkoda1C5RVwTE7RAh6aghiXai5ZPtd5fVSb5Lp8Dz7AoZTOmaIuNAHrwo-dsas6ZKpDqDBXOPi9XlQpZvXuRMJlaAtzsbCkQ0g5Jgo',
    5, 1);
  insertTest.run('Ibu Siti Nurhaliza', 'Guru Matematika',
    'Sangat terbantu untuk materi pembelajaran jarak jauh. Fitur perpustakaan digitalnya sangat lengkap.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuADCs2QGTKLf2WchdKkteEvCGNNtyqVgWLYwh38eiv1U6jAG7drtS2FwJ02PulCh_auQDCHtjTtAO4ZxtiS6h7SHRQ5oucVC8buWXsZnBHEL1B7Mdp2Cl0-2cBSD1_ZfYDVKhPJZbIe_ZpxtO9fP9LvB80pl0_mrlRPVB8MuGJZ2EPKxCJ6CDubaeemIr9fpwejhbTHHGY59D4OyCzX0n_SQmvIYKuqyDTgg0Ho45Gz9XoeryW1VtQYnntwUy2Fhi3xpwLvrI1C8ZY',
    5, 2);
  insertTest.run('Rara Safira', 'Siswa Kelas 12',
    'Tryoutnya mirip banget sama soal ujian asli. Bikin pede pas hari H ujian!',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAnSrwu7ez6DT0BZGmrHW23v-6oAjyRtHVDj-afxChUKwYXGWPODwhkpRsYPTgKB7HblFre4RJM-8M2rCmy5j3_d2Dj9z-0AiXYiv2eVJhc3VuQ7KpXffe9sKaFneloxBpV0erJ1eWj4OHaUoqofUOoR3HNpz1Hl3tuQLbIWZ_yQqp0BXGZVl7XOvS8Whm1eqaRKFTAgTBH4XvztdvpBmJ7DvWdLpQXs9FQJQ9NLCbXg7P40AZ9iBkBtmOGYNx6xKyGthmMnq6V2kI',
    5, 3);

  // Footer links
  const insertFL = db.prepare('INSERT INTO homepage_footer_links (column_title, label, href, sort_order) VALUES (?, ?, ?, ?)');
  insertFL.run('Menu Utama', 'Beranda', '#', 1);
  insertFL.run('Menu Utama', 'Semua Produk', '#', 2);
  insertFL.run('Menu Utama', 'Tentang Kami', '#', 3);
  insertFL.run('Menu Utama', 'Cara Berlangganan', '#', 4);
  insertFL.run('Layanan', 'eBook', '#', 1);
  insertFL.run('Layanan', 'e-Library', '#', 2);
  insertFL.run('Layanan', 'Tryout Online', '#', 3);
  insertFL.run('Layanan', 'Hubungi Kami', '#', 4);

  // Social links
  const insertSL = db.prepare('INSERT INTO homepage_social_links (icon, href, sort_order) VALUES (?, ?, ?)');
  insertSL.run('social_leaderboard', '#', 1);
  insertSL.run('photo_camera', '#', 2);
  insertSL.run('play_circle', '#', 3);

  console.log('  Homepage data seeded.');
}

module.exports = seed;
