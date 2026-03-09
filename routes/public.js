const express = require('express');
const router = express.Router();
const db = require('../database/init');

// Home page - CMS-driven homepage
router.get('/', (req, res) => {
    const settings = db.prepare('SELECT * FROM homepage_settings WHERE id = 1').get();

    // If no homepage settings exist, show a simple brand list fallback
    if (!settings) {
        const brands = db.prepare(`
            SELECT b.*, t.name as template_name 
            FROM brands b 
            JOIN templates t ON b.template_id = t.id 
            ORDER BY b.created_at DESC
        `).all();
        return res.render('index', { brands });
    }

    const products = db.prepare('SELECT * FROM homepage_products ORDER BY sort_order').all();
    const testimonials = db.prepare('SELECT * FROM homepage_testimonials ORDER BY sort_order').all();
    const navLinks = db.prepare('SELECT * FROM homepage_nav_links ORDER BY sort_order').all();
    const socialLinks = db.prepare('SELECT * FROM homepage_social_links ORDER BY sort_order').all();
    const footerLinksRaw = db.prepare('SELECT * FROM homepage_footer_links ORDER BY sort_order').all();
    const banners = db.prepare('SELECT * FROM homepage_banners WHERE is_active = 1 ORDER BY sort_order').all();
    const brands = db.prepare(`
        SELECT b.*, t.name as template_name 
        FROM brands b 
        JOIN templates t ON b.template_id = t.id 
        ORDER BY b.created_at DESC
    `).all();

    // Group footer links by column
    const footerColumns = {};
    footerLinksRaw.forEach(link => {
        if (!footerColumns[link.column_title]) {
            footerColumns[link.column_title] = [];
        }
        footerColumns[link.column_title].push(link);
    });

    res.render('templates/homepage', {
        settings,
        products,
        testimonials,
        navLinks,
        socialLinks,
        footerColumns,
        banners,
        brands
    });
});

// Preview template (public - no auth required)
router.get('/preview/template/:templateId', (req, res) => {
    const db = require('../database/init');
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.templateId);
    
    if (!template) {
        return res.status(404).send('Template not found');
    }
    
    const userName = req.query.name || 'Brand Anda';
    const userTagline = req.query.tagline || 'Solusi terbaik untuk kebutuhan Anda';
    const userColor = req.query.primary_color || '#3b82f6';
    const userLogoInitial = req.query.logo_initial || 'B';
    
    function adjustColor(color, percent) {
        if (!color) return '#2563eb';
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + 
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    }
    
    const userHoverColor = adjustColor(userColor, -20);
    
    const previewBrand = {
        name: userName,
        tagline: userTagline,
        primary_color: userColor,
        primary_hover_color: userHoverColor,
        accent_color_1: '#10b981',
        accent_color_2: '#8b5cf6',
        accent_color_3: '#f59e0b',
        logo_initial: userLogoInitial,
        logo_url: '',
        slug: 'preview',
        copyright_text: '© 2024 ' + userName + '. All rights reserved.',
        powered_by: 'CMS Admin'
    };
    
    const isPreview = req.query.preview === 'true';
    
    const sections = isPreview ? {
        hero: { 
            badge: 'Selamat Datang', 
            heading_line1: userName, 
            heading_line2: userTagline, 
            heading_line3: '', 
            description: 'Kami menyediakan produk dan layanan terbaik untuk memenuhi kebutuhan Anda. Mari bergabung dan rasakan bedanya!',
            cta_primary_text: 'Lihat Produk',
            cta_primary_href: '#products',
            cta_secondary_text: 'Hubungi Kami',
            cta_secondary_href: '#contact',
            hero_image_url: ''
        },
        features_header: { 
            badge: 'Keunggulan', 
            heading: 'Mengapa Memilih', 
            heading_highlight: userName + '?', 
            description: 'Kami menawarkan berbagai keunggulan yang membuat kami berbeda dari yang lain.'
        },
        catalog_header: { 
            heading: 'Produk Kami', 
            description: 'Temukan produk terbaik kami',
            filter_tabs: ['Semua', 'Terbaru', 'Terlaris']
        },
        cta: { 
            heading_prefix: 'Siap ', 
            heading_highlight: 'Bergabung?', 
            description: 'Jangan ragu untuk menghubungi kami dan mendapatkan konsultasi gratis.',
            button1_text: 'Hubungi Sekarang',
            button1_icon: 'chat',
            button2_text: '',
            button2_icon: ''
        }
    } : {
        hero: { badge: '', heading_line1: '', heading_line2: '', heading_line3: '', description: '', cta_primary_text: '', cta_primary_href: '', cta_secondary_text: '', cta_secondary_href: '', hero_image_url: '' },
        features_header: { badge: '', heading: '', heading_highlight: '', description: '' },
        catalog_header: { heading: '', description: '', filter_tabs: [] },
        cta: { heading_prefix: '', heading_highlight: '', description: '', button1_text: '', button1_icon: '', button2_text: '', button2_icon: '' }
    };
    
    const navLinks = isPreview ? [
        { label: 'Beranda', url: '#hero', is_button: false },
        { label: 'Produk', url: '#products', is_button: false },
        { label: 'Tentang', url: '#about', is_button: false },
        { label: 'Kontak', url: '#contact', is_button: true }
    ] : [];
    
    const features = isPreview ? [
        { icon: 'verified', title: 'Kualitas Terjamin', description: 'Produk dengan standar kualitas tinggi yang telah teruji' },
        { icon: 'support_agent', title: 'Layanan 24/7', description: 'Tim support siap membantu Anda kapan saja' },
        { icon: 'local_shipping', title: 'Pengiriman Cepat', description: 'Dikirim ke seluruh Indonesia dengan cepat' }
    ] : [];
    
    const products = isPreview ? [
        { title: 'Produk Unggulan 1', description: 'Deskripsi produk pertama yang menarik', price: 150000, grade: 'Terbaru', image_url: '', is_featured: true },
        { title: 'Produk Unggulan 2', description: 'Deskripsi produk kedua yang menarik', price: 250000, grade: 'Terlaris', image_url: '', is_featured: false },
        { title: 'Produk Unggulan 3', description: 'Deskripsi produk ketiga yang menarik', price: 350000, grade: 'Rekomendasi', image_url: '', is_featured: false },
        { title: 'Produk Unggulan 4', description: 'Deskripsi produk keempat yang menarik', price: 450000, grade: '', image_url: '', is_featured: false }
    ] : [];
    
    const footerLinks = isPreview ? [
        { label: 'Tentang Kami', url: '#about' },
        { label: 'Produk', url: '#products' },
        { label: 'Kontak', url: '#contact' }
    ] : [];

    const socialLinks = isPreview ? [
        { icon: 'facebook', url: '#' },
        { icon: 'instagram', url: '#' },
        { icon: 'whatsapp', url: '#' }
    ] : [];

    res.render(template.file_path, { 
        brand: previewBrand, 
        preview: isPreview,
        sections,
        navLinks,
        features,
        products,
        footerLinks,
        socialLinks
    });
});

// Public brand page
router.get('/:brandSlug', (req, res) => {
    const { brandSlug } = req.params;

    const brand = db.prepare(`
    SELECT b.*, t.file_path as template_file 
    FROM brands b 
    JOIN templates t ON b.template_id = t.id 
    WHERE b.slug = ?
  `).get(brandSlug);

    if (!brand) {
        return res.status(404).render('404');
    }

    // Get all related data
    const sections = db.prepare('SELECT * FROM sections WHERE brand_id = ?').all(brand.id);
    const products = db.prepare('SELECT * FROM products WHERE brand_id = ? ORDER BY sort_order').all(brand.id);
    const navLinks = db.prepare('SELECT * FROM nav_links WHERE brand_id = ? ORDER BY sort_order').all(brand.id);
    const features = db.prepare('SELECT * FROM features WHERE brand_id = ? ORDER BY sort_order').all(brand.id);
    const socialLinks = db.prepare('SELECT * FROM social_links WHERE brand_id = ? ORDER BY sort_order').all(brand.id);
    const footerLinks = db.prepare('SELECT * FROM footer_links WHERE brand_id = ? ORDER BY sort_order').all(brand.id);

    // Parse section data
    const sectionData = {};
    sections.forEach(s => {
        sectionData[s.section_type] = JSON.parse(s.data);
    });

    // Group footer links by column
    const footerColumns = {};
    footerLinks.forEach(link => {
        if (!footerColumns[link.column_title]) {
            footerColumns[link.column_title] = [];
        }
        footerColumns[link.column_title].push(link);
    });

    res.render(brand.template_file, {
        brand,
        sections: sectionData,
        products,
        navLinks,
        features,
        socialLinks,
        footerColumns
    });
});

module.exports = router;
