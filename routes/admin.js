const express = require('express');
const router = express.Router();
const db = require('../database/init');
const multer = require('multer');
const path = require('path');
const { canManageBrand, requireSuperAdmin } = require('../middleware/auth');
const { processImage } = require('../utils/imageProcessor');
const { getBrandByUuid, getBrandById, getBrandId, getProductByUuid, getFeatureByUuid, getNavLinkByUuid, getSocialLinkByUuid, getFooterLinkByUuid } = require('../utils/brandEncoder');
const { randomUUID } = require('crypto');

// Helper: Darken/lighten color
function adjustColor(color, percent) {
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

// Render helper - wraps views in sidebar layout  
function renderWithLayout(res, view, options = {}) {
    const user = options.user || res.locals.user;
    const activePage = options.activePage || 'dashboard';
    const pageTitle = options.pageTitle || 'Dashboard';
    res.render(view, { user, activePage, pageTitle, ...options });
}

// Multer config for image uploads
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('File harus berupa gambar (jpg, png, gif, webp)'), false);
};
const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Helper: get brands filtered by user role
function getUserBrands(user) {
    if (user.role === 'super_admin') {
        return db.prepare(`
            SELECT b.*, t.name as template_name, u.username as created_by_name
            FROM brands b 
            JOIN templates t ON b.template_id = t.id 
            LEFT JOIN users u ON b.created_by = u.id
            ORDER BY b.created_at DESC
        `).all();
    }
    return db.prepare(`
        SELECT b.*, t.name as template_name, u.username as created_by_name
        FROM brands b 
        JOIN templates t ON b.template_id = t.id 
        LEFT JOIN users u ON b.created_by = u.id
        WHERE b.created_by = ?
        ORDER BY b.created_at DESC
    `).all(user.id);
}

// Middleware: check brand ownership for routes with :id or :brandId (supports both ID and UUID)
function checkBrandAccess(req, res, next) {
    const identifier = req.params.brandId || req.params.id;
    let brand = getBrandByUuid(identifier);
    
    if (!brand) {
        const numericId = parseInt(identifier);
        if (!isNaN(numericId)) {
            brand = getBrandById(numericId);
        }
    }
    
    if (!brand) return res.redirect('/admin/brands');
    if (!canManageBrand(req.user, brand)) {
        return res.status(403).render('403');
    }
    req.brand = brand;
    req.brandId = brand.id;
    next();
}

// ==================== DASHBOARD ====================
router.get('/', (req, res) => {
    const brands = getUserBrands(req.user);
    const templates = db.prepare('SELECT * FROM templates').all();

    let totalProducts;
    if (req.user.role === 'super_admin') {
        totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    } else {
        totalProducts = db.prepare(`
            SELECT COUNT(*) as count FROM products p 
            JOIN brands b ON p.brand_id = b.id 
            WHERE b.created_by = ?
        `).get(req.user.id).count;
    }

    res.render('admin/dashboard', { brands, templates, totalProducts, user: req.user, activePage: 'dashboard' });
});

// ==================== BRANDS ====================
router.get('/brands', (req, res) => {
    const brands = getUserBrands(req.user);
    res.render('admin/brands/list', { brands, user: req.user, activePage: 'brands' });
});

// Wizard: Show create form with template selection
router.get('/brands/create/wizard', (req, res) => {
    const templates = db.prepare("SELECT * FROM templates WHERE category IN ('glass', 'neumorph', '3d', 'minimal')").all();
    res.render('admin/brands/create-wizard', { templates, user: req.user, activePage: 'brands' });
});

// Wizard: Handle brand creation
router.post('/brands/create/wizard', upload.single('logo'), async (req, res) => {
    const { template_id, name, slug, tagline, primary_color, logo_initial } = req.body;
    const { randomUUID } = require('crypto');
    const brandUuid = randomUUID();

    try {
        let logo_url = '';
        if (req.file) {
            const processedImage = await processImage(req.file, 'logo');
            if (processedImage) logo_url = processedImage;
        }

        const result = db.prepare(`
            INSERT INTO brands (uuid, template_id, name, slug, tagline, logo_initial, logo_url, primary_color, primary_hover_color, accent_color_1, accent_color_2, accent_color_3, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(brandUuid, template_id, name, slug, tagline, logo_initial, logo_url, 
            primary_color || '#3b82f6', 
            primary_color ? adjustColor(primary_color, -20) : '#2563eb',
            '#10b981', '#8b5cf6', '#f59e0b',
            req.user.id);

        const brandId = db.prepare('SELECT id FROM brands WHERE uuid = ?').get(brandUuid).id;

        const heroData = JSON.stringify({
            badge: 'Selamat Datang',
            heading_line1: name || 'Brand Anda',
            heading_line2: tagline || 'Solusi terbaik untuk kebutuhan Anda',
            heading_line3: '',
            description: 'Kami menyediakan produk dan layanan terbaik untuk memenuhi kebutuhan Anda. Mari bergabung dan rasakan bedanya!',
            cta_primary_text: 'Lihat Produk',
            cta_primary_href: '#products',
            cta_secondary_text: 'Hubungi Kami',
            cta_secondary_href: '#contact',
            hero_image_url: ''
        });

        const featuresHeaderData = JSON.stringify({
            badge: 'Keunggulan',
            heading: 'Mengapa Memilih',
            heading_highlight: (name || 'Kami') + '?',
            description: 'Kami menawarkan berbagai keunggulan yang membuat kami berbeda dari yang lain.'
        });

        const catalogHeaderData = JSON.stringify({
            heading: 'Produk Kami',
            description: 'Temukan produk terbaik kami',
            filter_tabs: ['Semua', 'Terbaru', 'Terlaris']
        });

        const ctaData = JSON.stringify({
            heading_prefix: 'Siap ',
            heading_highlight: 'Bergabung?',
            description: 'Jangan ragu untuk menghubungi kami dan mendapatkan konsultasi gratis.',
            button1_text: 'Hubungi Sekarang',
            button1_icon: 'chat',
            button2_text: '',
            button2_icon: ''
        });

        db.prepare('INSERT INTO sections (brand_id, section_type, data) VALUES (?, ?, ?)').run(brandId, 'hero', heroData);
        db.prepare('INSERT INTO sections (brand_id, section_type, data) VALUES (?, ?, ?)').run(brandId, 'features_header', featuresHeaderData);
        db.prepare('INSERT INTO sections (brand_id, section_type, data) VALUES (?, ?, ?)').run(brandId, 'catalog_header', catalogHeaderData);
        db.prepare('INSERT INTO sections (brand_id, section_type, data) VALUES (?, ?, ?)').run(brandId, 'cta', ctaData);

        const insertFeature = db.prepare('INSERT INTO features (brand_id, icon, title, description, color_class, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
        insertFeature.run(brandId, 'verified', 'Kualitas Terjamin', 'Produk dengan standar kualitas tinggi yang telah teruji', 'primary', 1);
        insertFeature.run(brandId, 'support_agent', 'Layanan 24/7', 'Tim support siap membantu Anda kapan saja', 'accent-purple', 2);
        insertFeature.run(brandId, 'local_shipping', 'Pengiriman Cepat', 'Dikirim ke seluruh Indonesia dengan cepat', 'accent-green', 3);

        const insertNav = db.prepare('INSERT INTO nav_links (brand_id, label, href, is_button, sort_order) VALUES (?, ?, ?, ?, ?)');
        insertNav.run(brandId, 'Beranda', '#hero', 0, 1);
        insertNav.run(brandId, 'Keunggulan', '#features', 0, 2);
        insertNav.run(brandId, 'Produk', '#catalog', 0, 3);
        insertNav.run(brandId, 'Hubungi Kami', '#contact', 1, 4);

        const insertProduct = db.prepare('INSERT INTO products (brand_id, title, description, price, grade, image_url, is_featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        insertProduct.run(brandId, 'Produk Unggulan 1', 'Deskripsi produk pertama yang menarik dan informatif', 150000, 'Grade A', '', 1, 1);
        insertProduct.run(brandId, 'Produk Unggulan 2', 'Deskripsi produk kedua dengan fitur terbaik', 200000, 'Grade B', '', 1, 2);
        insertProduct.run(brandId, 'Produk Terbaru', 'Produk terbaru kami dengan kualitas terjamin', 175000, 'Grade A', '', 0, 3);

        res.json({ success: true, brandUuid });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Preview template
router.get('/brands/preview/:templateId', (req, res) => {
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.templateId);
    
    if (!template) {
        return res.status(404).send('Template not found');
    }
    
    // User input from query params (for live preview)
    const userName = req.query.name || 'Brand Anda';
    const userTagline = req.query.tagline || 'Solusi terbaik untuk kebutuhan Anda';
    const userColor = req.query.primary_color || '#3b82f6';
    const userLogoInitial = req.query.logo_initial || 'B';
    
    // Calculate hover color from primary color
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
    
    // Brand data with user input
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
    
    // Check if this is a preview request (from wizard with user input)
    const isPreview = req.query.preview === 'true';
    
    // Sections - show sample data in preview mode, empty otherwise
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
    
    // Arrays - show sample data in preview mode, empty otherwise
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

// Original create form (advanced)
router.get('/brands/create', (req, res) => {
    const templates = db.prepare('SELECT * FROM templates').all();
    const activeTab = req.query.tab || 'brand';
    res.render('admin/brands/form', { brand: null, templates, activeTab, success: null, error: null, user: req.user, activePage: 'brands' });
});

router.post('/brands/create', (req, res) => {
    const { template_id, name, slug, logo_text, logo_initial, logo_url, tagline, primary_color, primary_hover_color, accent_color_1, accent_color_2, accent_color_3, copyright_text, powered_by } = req.body;
    const { randomUUID } = require('crypto');
    const brandUuid = randomUUID();

    try {
        const result = db.prepare(`
      INSERT INTO brands (uuid, template_id, name, slug, logo_text, logo_initial, logo_url, tagline, primary_color, primary_hover_color, accent_color_1, accent_color_2, accent_color_3, copyright_text, powered_by, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(brandUuid, template_id, name, slug, logo_text, logo_initial, logo_url || '', tagline, primary_color || '#0056b3', primary_hover_color || '#004494', accent_color_1 || '#76bc43', accent_color_2 || '#6658a6', accent_color_3 || '#f58220', copyright_text, powered_by, req.user.id);

        const brandId = result.lastInsertRowid;

        // Create default sections
        const insertSection = db.prepare('INSERT INTO sections (brand_id, section_type, data) VALUES (?, ?, ?)');
        insertSection.run(brandId, 'hero', JSON.stringify({
            badge: '🚀 New Brand',
            heading_line1: name,
            heading_line2: 'Your Tagline Here',
            heading_line3: 'Start Exploring',
            description: 'Description for ' + name,
            cta_primary_text: 'Lihat Katalog',
            cta_primary_href: '#catalog',
            cta_secondary_text: 'Tonton Video',
            cta_secondary_href: '#',
            hero_image_url: ''
        }));
        insertSection.run(brandId, 'features_header', JSON.stringify({
            badge: 'Fitur Unggulan',
            heading: 'Kenapa Harus',
            heading_highlight: name + '?',
            description: 'Deskripsi fitur unggulan.'
        }));
        insertSection.run(brandId, 'cta', JSON.stringify({
            heading_prefix: 'Siap Memulai?',
            heading_highlight: 'Bergabung Sekarang!',
            description: 'Deskripsi CTA.',
            button1_text: 'Download',
            button1_icon: 'download',
            button2_text: 'Hubungi Kami',
            button2_icon: 'support_agent'
        }));
        insertSection.run(brandId, 'catalog_header', JSON.stringify({
            heading: 'Katalog Produk',
            description: 'Temukan produk terbaik!',
            filter_tabs: ['Semua']
        }));

        // Create default nav links
        const insertNav = db.prepare('INSERT INTO nav_links (brand_id, label, href, is_button, sort_order) VALUES (?, ?, ?, ?, ?)');
        insertNav.run(brandId, 'Beranda', '#', 0, 1);
        insertNav.run(brandId, 'Keunggulan', '#features', 0, 2);
        insertNav.run(brandId, 'Produk', '#catalog', 0, 3);
        insertNav.run(brandId, 'Hubungi Kami', '#', 1, 4);

        // Create default social links
        const insertSocial = db.prepare('INSERT INTO social_links (brand_id, icon, href, sort_order) VALUES (?, ?, ?, ?)');
        insertSocial.run(brandId, 'facebook', '#', 1);
        insertSocial.run(brandId, 'smart_display', '#', 2);
        insertSocial.run(brandId, 'photo_camera', '#', 3);

        res.redirect('/admin/brands/' + brandUuid + '/edit?tab=brand');
    } catch (err) {
        const templates = db.prepare('SELECT * FROM templates').all();
        res.render('admin/brands/form', { brand: req.body, templates, error: err.message, activeTab: 'brand', user: req.user, activePage: 'brands' });
    }
});

router.get('/brands/:id/edit', checkBrandAccess, (req, res) => {
    const brand = req.brand;
    const templates = db.prepare("SELECT * FROM templates WHERE category IN ('glass', 'neumorph', '3d', 'minimal')").all();
    const sections = db.prepare('SELECT * FROM sections WHERE brand_id = ?').all(brand.id);
    const products = db.prepare('SELECT * FROM products WHERE brand_id = ? ORDER BY sort_order').all(brand.id);
    const features = db.prepare('SELECT * FROM features WHERE brand_id = ? ORDER BY sort_order').all(brand.id);
    const navLinks = db.prepare('SELECT * FROM nav_links WHERE brand_id = ? ORDER BY sort_order').all(brand.id);
    const socialLinks = db.prepare('SELECT * FROM social_links WHERE brand_id = ? ORDER BY sort_order').all(brand.id);
    const footerLinks = db.prepare('SELECT * FROM footer_links WHERE brand_id = ? ORDER BY sort_order').all(brand.id);

    const sectionData = {};
    sections.forEach(s => {
        sectionData[s.section_type] = { id: s.id, ...JSON.parse(s.data) };
    });

    const success = req.query.success === '1' ? 'Changes saved successfully!' : null;
    const error = req.query.error ? req.query.error : null;
    const activeTab = req.query.tab || 'brand';
    
    res.render('admin/brands/form', {
        brand, templates, sections: sectionData, products, features,
        navLinks, socialLinks, footerLinks, success, error, activeTab,
        user: req.user, activePage: 'brands'
    });
});

router.post('/brands/:id/update', checkBrandAccess, upload.single('logo'), async (req, res) => {
    const { template_id, name, slug, logo_text, logo_initial, existing_logo_url, tagline, primary_color, primary_hover_color, accent_color_1, accent_color_2, accent_color_3, copyright_text, powered_by } = req.body;

    let logo_url = existing_logo_url || '';
    if (req.file) {
        const processedImage = await processImage(req.file, 'logo');
        if (processedImage) logo_url = processedImage;
    }

    try {
        db.prepare(`
      UPDATE brands SET template_id=?, name=?, slug=?, logo_text=?, logo_initial=?, logo_url=?, tagline=?, 
      primary_color=?, primary_hover_color=?, accent_color_1=?, accent_color_2=?, accent_color_3=?,
      copyright_text=?, powered_by=? WHERE id=?
    `).run(template_id, name, slug, logo_text, logo_initial, logo_url, tagline, primary_color, primary_hover_color, accent_color_1, accent_color_2, accent_color_3, copyright_text, powered_by, req.brand.id);

        res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=brand&success=1');
    } catch (err) {
        res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=brand&error=' + encodeURIComponent(err.message));
    }
});

router.post('/brands/:id/delete', checkBrandAccess, (req, res) => {
    db.prepare('DELETE FROM brands WHERE id = ?').run(req.brand.id);
    res.redirect('/admin/brands');
});

// ==================== SECTIONS ====================
router.post('/brands/:brandId/sections/:type', checkBrandAccess, upload.single('hero_image'), async (req, res) => {
    const { type } = req.params;
    const brandId = req.brand.id;
    
    let dataObj = { ...req.body };
    
    if (req.file && type === 'hero') {
        const processedImage = await processImage(req.file, 'hero');
        if (processedImage) {
            dataObj.hero_image_url = processedImage;
        }
    }
    
    if (req.body.existing_hero_image_url && !dataObj.hero_image_url) {
        dataObj.hero_image_url = req.body.existing_hero_image_url;
    }
    
    const data = JSON.stringify(dataObj);

    const sectionToTab = {
        'hero': 'hero',
        'features_header': 'features',
        'cta': 'cta',
        'catalog_header': 'catalog'
    };
    const tab = sectionToTab[type] || 'hero';

    const existing = db.prepare('SELECT id FROM sections WHERE brand_id = ? AND section_type = ?').get(brandId, type);
    if (existing) {
        db.prepare('UPDATE sections SET data = ? WHERE id = ?').run(data, existing.id);
    } else {
        db.prepare('INSERT INTO sections (brand_id, section_type, data) VALUES (?, ?, ?)').run(brandId, type, data);
    }

    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=' + tab + '&success=1');
});

// ==================== PRODUCTS ====================
router.get('/brands/:brandId/products/create', checkBrandAccess, (req, res) => {
    res.render('admin/products/form', { brand: req.brand, product: null, user: req.user, activePage: 'brands' });
});

router.post('/brands/:brandId/products/create', checkBrandAccess, upload.single('image'), async (req, res) => {
    const { title, description, price, grade, existing_image_url, is_featured, sort_order, product_url } = req.body;
    const productUuid = randomUUID();
    
    let image_url = existing_image_url || '';
    if (req.file) {
        const processedImage = await processImage(req.file, 'product');
        if (processedImage) image_url = processedImage;
    }
    
    db.prepare(`
    INSERT INTO products (uuid, brand_id, title, description, price, grade, image_url, is_featured, sort_order, product_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(productUuid, req.brand.id, title, description, parseInt(price) || 0, grade, image_url, is_featured ? 1 : 0, parseInt(sort_order) || 0, product_url || '');

    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=products&success=1');
});

router.get('/brands/:brandId/products/:productUuid/edit', checkBrandAccess, (req, res) => {
    const product = getProductByUuid(req.params.productUuid);
    if (!product || product.brand_id !== req.brand.id) return res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=products');
    res.render('admin/products/form', { brand: req.brand, product, user: req.user, activePage: 'brands' });
});

router.post('/brands/:brandId/products/:productUuid/update', checkBrandAccess, upload.single('image'), async (req, res) => {
    const product = getProductByUuid(req.params.productUuid);
    if (!product || product.brand_id !== req.brand.id) return res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=products');
    
    const { title, description, price, grade, existing_image_url, is_featured, sort_order, product_url } = req.body;
    
    let image_url = existing_image_url;
    if (req.file) {
        const processedImage = await processImage(req.file, 'product');
        if (processedImage) image_url = processedImage;
    }
    
    db.prepare(`
    UPDATE products SET title=?, description=?, price=?, grade=?, image_url=?, is_featured=?, sort_order=?, product_url=? WHERE id=? AND brand_id=?
  `).run(title, description, parseInt(price) || 0, grade, image_url, is_featured ? 1 : 0, parseInt(sort_order) || 0, product_url || '', product.id, req.brand.id);

    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=products&success=1');
});

router.post('/brands/:brandId/products/:productUuid/delete', checkBrandAccess, (req, res) => {
    const product = getProductByUuid(req.params.productUuid);
    if (!product || product.brand_id !== req.brand.id) return res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=products');
    db.prepare('DELETE FROM products WHERE id = ? AND brand_id = ?').run(product.id, req.brand.id);
    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=products&success=1');
});

// ==================== FEATURES ====================
router.post('/brands/:brandId/features/create', checkBrandAccess, (req, res) => {
    const { icon, title, description, color_class, sort_order } = req.body;
    const featureUuid = randomUUID();
    db.prepare(`
    INSERT INTO features (uuid, brand_id, icon, title, description, color_class, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(featureUuid, req.brand.id, icon, title, description, color_class || 'primary', parseInt(sort_order) || 0);

    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=features&success=1');
});

router.post('/brands/:brandId/features/:featureUuid/update', checkBrandAccess, (req, res) => {
    const feature = getFeatureByUuid(req.params.featureUuid);
    if (!feature || feature.brand_id !== req.brand.id) return res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=features');
    
    const { icon, title, description, color_class, sort_order } = req.body;
    db.prepare(`
    UPDATE features SET icon=?, title=?, description=?, color_class=?, sort_order=? WHERE id=? AND brand_id=?
  `).run(icon, title, description, color_class, parseInt(sort_order) || 0, feature.id, req.brand.id);

    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=features&success=1');
});

router.post('/brands/:brandId/features/:featureUuid/delete', checkBrandAccess, (req, res) => {
    const feature = getFeatureByUuid(req.params.featureUuid);
    if (!feature || feature.brand_id !== req.brand.id) return res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=features');
    db.prepare('DELETE FROM features WHERE id = ? AND brand_id = ?').run(feature.id, req.brand.id);
    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=features&success=1');
});

// ==================== NAV LINKS ====================
router.post('/brands/:brandId/nav-links/create', checkBrandAccess, (req, res) => {
    const { label, href, is_button, sort_order } = req.body;
    const linkUuid = randomUUID();
    db.prepare('INSERT INTO nav_links (uuid, brand_id, label, href, is_button, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
        .run(linkUuid, req.brand.id, label, href || '#', is_button ? 1 : 0, parseInt(sort_order) || 0);
    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=navigation&success=1');
});

router.post('/brands/:brandId/nav-links/:linkUuid/update', checkBrandAccess, (req, res) => {
    const link = getNavLinkByUuid(req.params.linkUuid);
    if (!link || link.brand_id !== req.brand.id) return res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=navigation');
    
    const { label, href, is_button, sort_order } = req.body;
    db.prepare('UPDATE nav_links SET label=?, href=?, is_button=?, sort_order=? WHERE id=? AND brand_id=?')
        .run(label, href, is_button ? 1 : 0, parseInt(sort_order) || 0, link.id, req.brand.id);
    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=navigation&success=1');
});

router.post('/brands/:brandId/nav-links/:linkUuid/delete', checkBrandAccess, (req, res) => {
    const link = getNavLinkByUuid(req.params.linkUuid);
    if (!link || link.brand_id !== req.brand.id) return res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=navigation');
    db.prepare('DELETE FROM nav_links WHERE id = ? AND brand_id = ?').run(link.id, req.brand.id);
    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=navigation&success=1');
});

// ==================== SOCIAL LINKS ====================
router.post('/brands/:brandId/social-links/create', checkBrandAccess, (req, res) => {
    const { icon, href, sort_order } = req.body;
    const linkUuid = randomUUID();
    db.prepare('INSERT INTO social_links (uuid, brand_id, icon, href, sort_order) VALUES (?, ?, ?, ?, ?)')
        .run(linkUuid, req.brand.id, icon, href || '#', parseInt(sort_order) || 0);
    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=navigation&success=1');
});

router.post('/brands/:brandId/social-links/:linkUuid/update', checkBrandAccess, (req, res) => {
    const link = getSocialLinkByUuid(req.params.linkUuid);
    if (!link || link.brand_id !== req.brand.id) return res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=navigation');
    
    const { icon, href, sort_order } = req.body;
    db.prepare('UPDATE social_links SET icon=?, href=?, sort_order=? WHERE id=? AND brand_id=?')
        .run(icon, href, parseInt(sort_order) || 0, link.id, req.brand.id);
    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=navigation&success=1');
});

router.post('/brands/:brandId/social-links/:linkUuid/delete', checkBrandAccess, (req, res) => {
    const link = getSocialLinkByUuid(req.params.linkUuid);
    if (!link || link.brand_id !== req.brand.id) return res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=navigation');
    db.prepare('DELETE FROM social_links WHERE id = ? AND brand_id = ?').run(link.id, req.brand.id);
    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=navigation&success=1');
});

// ==================== FOOTER LINKS ====================
router.post('/brands/:brandId/footer-links/create', checkBrandAccess, (req, res) => {
    const { column_title, label, href, sort_order } = req.body;
    const linkUuid = randomUUID();
    db.prepare('INSERT INTO footer_links (uuid, brand_id, column_title, label, href, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
        .run(linkUuid, req.brand.id, column_title, label, href || '#', parseInt(sort_order) || 0);
    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=footer&success=1');
});

router.post('/brands/:brandId/footer-links/:linkUuid/update', checkBrandAccess, (req, res) => {
    const link = getFooterLinkByUuid(req.params.linkUuid);
    if (!link || link.brand_id !== req.brand.id) return res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=footer');
    
    const { column_title, label, href, sort_order } = req.body;
    db.prepare('UPDATE footer_links SET column_title=?, label=?, href=?, sort_order=? WHERE id=? AND brand_id=?')
        .run(column_title, label, href, parseInt(sort_order) || 0, link.id, req.brand.id);
    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=footer&success=1');
});

router.post('/brands/:brandId/footer-links/:linkUuid/delete', checkBrandAccess, (req, res) => {
    const link = getFooterLinkByUuid(req.params.linkUuid);
    if (!link || link.brand_id !== req.brand.id) return res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=footer');
    db.prepare('DELETE FROM footer_links WHERE id = ? AND brand_id = ?').run(link.id, req.brand.id);
    res.redirect('/admin/brands/' + req.brand.uuid + '/edit?tab=footer&success=1');
});

// ==================== IMAGE UPLOAD ====================
router.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: '/uploads/' + req.file.filename });
});

module.exports = router;
