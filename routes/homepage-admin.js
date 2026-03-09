const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { requireSuperAdmin } = require('../middleware/auth');
const { getHomepageProductByUuid, getHomepageTestimonialByUuid, getHomepageNavLinkByUuid, getHomepageFooterLinkByUuid, getHomepageSocialLinkByUuid, getHomepageBannerByUuid } = require('../utils/brandEncoder');
const { processImage } = require('../utils/imageProcessor');
const { randomUUID } = require('crypto');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('File harus berupa gambar'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// All routes require super admin
router.use(requireSuperAdmin);

// ==================== HOMEPAGE SETTINGS ====================
router.get('/', (req, res) => {
    const settings = db.prepare('SELECT * FROM homepage_settings WHERE id = 1').get() || {};
    const products = db.prepare('SELECT * FROM homepage_products ORDER BY sort_order').all();
    const testimonials = db.prepare('SELECT * FROM homepage_testimonials ORDER BY sort_order').all();
    const navLinks = db.prepare('SELECT * FROM homepage_nav_links ORDER BY sort_order').all();
    const socialLinks = db.prepare('SELECT * FROM homepage_social_links ORDER BY sort_order').all();
    const footerLinks = db.prepare('SELECT * FROM homepage_footer_links ORDER BY sort_order').all();
    const banners = db.prepare('SELECT * FROM homepage_banners ORDER BY sort_order').all();

    res.render('admin/homepage', {
        settings, products, testimonials, navLinks, socialLinks, footerLinks, banners,
        activeTab: req.query.tab || 'general',
        success: req.query.success,
        error: req.query.error,
        user: req.user,
        activePage: 'homepage'
    });
});

router.post('/settings', upload.fields([{ name: 'logo', maxCount: 1 }]), async (req, res) => {
    const tab = req.body._tab || 'general';

    // Only update fields belonging to the active tab
    const tabFields = {
        general: ['site_name', 'site_tagline', 'logo_url', 'primary_color'],
        hero: [
            'hero_badge', 'hero_badge_icon', 'hero_title', 'hero_title_highlight', 'hero_description',
            'hero_cta1_text', 'hero_cta1_href', 'hero_cta2_text', 'hero_cta2_href',
            'products_heading', 'survey_heading', 'survey_description', 'survey_button_text', 'survey_button_href',
            'testimonials_badge', 'testimonials_heading'
        ],
        footer: ['footer_description', 'footer_address', 'footer_phone', 'footer_email', 'footer_copyright']
    };

    const fields = tabFields[tab];
    if (!fields) {
        return res.redirect('/admin/homepage?tab=' + tab + '&error=Tab tidak valid');
    }

    let bodyFields = { ...req.body };
    
    // Handle image upload for logo
    if (req.files && req.files['logo'] && tab === 'general') {
        const processedImage = await processImage(req.files['logo'][0], 'homepage-logo');
        if (processedImage) {
            bodyFields.logo_url = processedImage;
        }
    }
    
    // Keep existing image if no new upload
    if ((!req.files || !req.files['logo']) && req.body.existing_logo_url && tab === 'general') {
        bodyFields.logo_url = req.body.existing_logo_url;
    }

    const existing = db.prepare('SELECT id FROM homepage_settings WHERE id = 1').get();
    if (existing) {
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => bodyFields[f] !== undefined ? bodyFields[f] : '');
        db.prepare(`UPDATE homepage_settings SET ${setClause} WHERE id = 1`).run(...values);
    } else {
        // Insert with all defaults first, then update
        db.prepare('INSERT INTO homepage_settings (id) VALUES (1)').run();
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => bodyFields[f] !== undefined ? bodyFields[f] : '');
        db.prepare(`UPDATE homepage_settings SET ${setClause} WHERE id = 1`).run(...values);
    }

    res.redirect('/admin/homepage?tab=' + tab + '&success=Settings berhasil disimpan');
});

// ==================== PRODUCTS ====================
router.post('/products/create', upload.any(), async (req, res) => {
    const { icon, title, description, link_text, link_href, bg_color, sort_order } = req.body || {};
    
    if (!title) {
        return res.redirect('/admin/homepage?tab=products&error=Judul produk wajib diisi');
    }
    
    const productUuid = randomUUID();
    let image_url = '';
    
    // Check if there's a file uploaded
    const productImageFile = req.files ? req.files.find(f => f.fieldname === 'product_image') : null;
    
    if (productImageFile) {
        try {
            const processedImage = await processImage(productImageFile, 'homepage-product');
            if (processedImage) {
                image_url = processedImage;
            }
        } catch (err) {
            console.error('Error processing product image:', err);
            return res.redirect('/admin/homepage?tab=products&error=Gagal memproses gambar: ' + err.message);
        }
    }
    
    db.prepare('INSERT INTO homepage_products (uuid, icon, title, description, image_url, link_text, link_href, bg_color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(productUuid, icon || 'star', title, description || '', image_url || '', link_text || 'Selengkapnya', link_href || '#', bg_color || '', parseInt(sort_order) || 0);
    res.redirect('/admin/homepage?tab=products&success=Produk berhasil ditambahkan');
});

router.post('/products/:productUuid/update', upload.any(), async (req, res) => {
    const product = getHomepageProductByUuid(req.params.productUuid);
    if (!product) return res.redirect('/admin/homepage?tab=products');
    
    const { icon, title, description, link_text, link_href, bg_color, sort_order, existing_product_image_url } = req.body || {};
    
    let image_url = existing_product_image_url || '';
    
    // Check if there's a file uploaded
    const productImageFile = req.files ? req.files.find(f => f.fieldname === 'product_image') : null;
    
    if (productImageFile) {
        try {
            const processedImage = await processImage(productImageFile, 'homepage-product');
            if (processedImage) {
                image_url = processedImage;
            }
        } catch (err) {
            console.error('Error processing product image:', err);
            return res.redirect('/admin/homepage?tab=products&error=Gagal memproses gambar: ' + err.message);
        }
    }
    
    db.prepare('UPDATE homepage_products SET icon=?, title=?, description=?, image_url=?, link_text=?, link_href=?, bg_color=?, sort_order=? WHERE id=?')
        .run(icon, title, description, image_url || '', link_text, link_href, bg_color || '', parseInt(sort_order) || 0, product.id);
    res.redirect('/admin/homepage?tab=products&success=Produk berhasil diperbarui');
});

router.post('/products/:productUuid/update', upload.single('product_image'), async (req, res) => {
    const product = getHomepageProductByUuid(req.params.productUuid);
    if (!product) return res.redirect('/admin/homepage?tab=products');
    
    const { icon, title, description, link_text, link_href, bg_color, sort_order, existing_product_image_url } = req.body;
    
    let image_url = existing_product_image_url || '';
    if (req.file) {
        try {
            const processedImage = await processImage(req.file, 'homepage-product');
            if (processedImage) {
                image_url = processedImage;
            }
        } catch (err) {
            console.error('Error processing product image:', err);
            return res.redirect('/admin/homepage?tab=products&error=Gagal memproses gambar: ' + err.message);
        }
    }
    
    db.prepare('UPDATE homepage_products SET icon=?, title=?, description=?, image_url=?, link_text=?, link_href=?, bg_color=?, sort_order=? WHERE id=?')
        .run(icon, title, description, image_url || '', link_text, link_href, bg_color || '', parseInt(sort_order) || 0, product.id);
    res.redirect('/admin/homepage?tab=products&success=Produk berhasil diperbarui');
});

router.post('/products/:productUuid/delete', (req, res) => {
    const product = getHomepageProductByUuid(req.params.productUuid);
    if (!product) return res.redirect('/admin/homepage?tab=products');
    db.prepare('DELETE FROM homepage_products WHERE id = ?').run(product.id);
    res.redirect('/admin/homepage?tab=products&success=Produk berhasil dihapus');
});

// ==================== TESTIMONIALS ====================
router.post('/testimonials/create', (req, res) => {
    const { name, role, quote, avatar_url, rating, sort_order } = req.body;
    const testimonialUuid = randomUUID();
    db.prepare('INSERT INTO homepage_testimonials (uuid, name, role, quote, avatar_url, rating, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(testimonialUuid, name, role || '', quote, avatar_url || '', parseInt(rating) || 5, parseInt(sort_order) || 0);
    res.redirect('/admin/homepage?tab=testimonials&success=Testimoni berhasil ditambahkan');
});

router.post('/testimonials/:testimonialUuid/update', (req, res) => {
    const testimonial = getHomepageTestimonialByUuid(req.params.testimonialUuid);
    if (!testimonial) return res.redirect('/admin/homepage?tab=testimonials');
    
    const { name, role, quote, avatar_url, rating, sort_order } = req.body;
    db.prepare('UPDATE homepage_testimonials SET name=?, role=?, quote=?, avatar_url=?, rating=?, sort_order=? WHERE id=?')
        .run(name, role, quote, avatar_url || '', parseInt(rating) || 5, parseInt(sort_order) || 0, testimonial.id);
    res.redirect('/admin/homepage?tab=testimonials&success=Testimoni berhasil diperbarui');
});

router.post('/testimonials/:testimonialUuid/delete', (req, res) => {
    const testimonial = getHomepageTestimonialByUuid(req.params.testimonialUuid);
    if (!testimonial) return res.redirect('/admin/homepage?tab=testimonials');
    db.prepare('DELETE FROM homepage_testimonials WHERE id = ?').run(testimonial.id);
    res.redirect('/admin/homepage?tab=testimonials&success=Testimoni berhasil dihapus');
});

// ==================== NAV LINKS ====================
router.post('/nav-links/create', (req, res) => {
    const { label, href, is_button, position, sort_order } = req.body;
    const linkUuid = randomUUID();
    db.prepare('INSERT INTO homepage_nav_links (uuid, label, href, is_button, position, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
        .run(linkUuid, label, href || '#', is_button ? 1 : 0, position || 'left', parseInt(sort_order) || 0);
    res.redirect('/admin/homepage?tab=navigation&success=Nav link berhasil ditambahkan');
});

router.post('/nav-links/:linkUuid/update', (req, res) => {
    const link = getHomepageNavLinkByUuid(req.params.linkUuid);
    if (!link) return res.redirect('/admin/homepage?tab=navigation');
    
    const { label, href, is_button, position, sort_order } = req.body;
    db.prepare('UPDATE homepage_nav_links SET label=?, href=?, is_button=?, position=?, sort_order=? WHERE id=?')
        .run(label, href, is_button ? 1 : 0, position, parseInt(sort_order) || 0, link.id);
    res.redirect('/admin/homepage?tab=navigation&success=Nav link berhasil diperbarui');
});

router.post('/nav-links/:linkUuid/delete', (req, res) => {
    const link = getHomepageNavLinkByUuid(req.params.linkUuid);
    if (!link) return res.redirect('/admin/homepage?tab=navigation');
    db.prepare('DELETE FROM homepage_nav_links WHERE id = ?').run(link.id);
    res.redirect('/admin/homepage?tab=navigation&success=Nav link berhasil dihapus');
});

// ==================== FOOTER LINKS ====================
router.post('/footer-links/create', (req, res) => {
    const { column_title, label, href, sort_order } = req.body;
    const linkUuid = randomUUID();
    db.prepare('INSERT INTO homepage_footer_links (uuid, column_title, label, href, sort_order) VALUES (?, ?, ?, ?, ?)')
        .run(linkUuid, column_title, label, href || '#', parseInt(sort_order) || 0);
    res.redirect('/admin/homepage?tab=footer&success=Footer link berhasil ditambahkan');
});

router.post('/footer-links/:linkUuid/update', (req, res) => {
    const link = getHomepageFooterLinkByUuid(req.params.linkUuid);
    if (!link) return res.redirect('/admin/homepage?tab=footer');
    
    const { column_title, label, href, sort_order } = req.body;
    db.prepare('UPDATE homepage_footer_links SET column_title=?, label=?, href=?, sort_order=? WHERE id=?')
        .run(column_title, label, href, parseInt(sort_order) || 0, link.id);
    res.redirect('/admin/homepage?tab=footer&success=Footer link berhasil diperbarui');
});

router.post('/footer-links/:linkUuid/delete', (req, res) => {
    const link = getHomepageFooterLinkByUuid(req.params.linkUuid);
    if (!link) return res.redirect('/admin/homepage?tab=footer');
    db.prepare('DELETE FROM homepage_footer_links WHERE id = ?').run(link.id);
    res.redirect('/admin/homepage?tab=footer&success=Footer link berhasil dihapus');
});

// ==================== SOCIAL LINKS ====================
router.post('/social-links/create', (req, res) => {
    const { icon, href, sort_order } = req.body;
    const linkUuid = randomUUID();
    db.prepare('INSERT INTO homepage_social_links (uuid, icon, href, sort_order) VALUES (?, ?, ?, ?)')
        .run(linkUuid, icon, href || '#', parseInt(sort_order) || 0);
    res.redirect('/admin/homepage?tab=footer&success=Social link berhasil ditambahkan');
});

router.post('/social-links/:linkUuid/update', (req, res) => {
    const link = getHomepageSocialLinkByUuid(req.params.linkUuid);
    if (!link) return res.redirect('/admin/homepage?tab=footer');
    
    const { icon, href, sort_order } = req.body;
    db.prepare('UPDATE homepage_social_links SET icon=?, href=?, sort_order=? WHERE id=?')
        .run(icon, href, parseInt(sort_order) || 0, link.id);
    res.redirect('/admin/homepage?tab=footer&success=Social link berhasil diperbarui');
});

router.post('/social-links/:linkUuid/delete', (req, res) => {
    const link = getHomepageSocialLinkByUuid(req.params.linkUuid);
    if (!link) return res.redirect('/admin/homepage?tab=footer');
    db.prepare('DELETE FROM homepage_social_links WHERE id = ?').run(link.id);
    res.redirect('/admin/homepage?tab=footer&success=Social link berhasil dihapus');
});

// ==================== BANNERS ====================
router.post('/banners/create', upload.single('banner_image'), async (req, res) => {
    const { title, description, badge, promo_code, button_text, button_href, bg_gradient_from, bg_gradient_to, is_active, sort_order } = req.body;
    const bannerUuid = randomUUID();
    
    let image_url = '';
    if (req.file) {
        try {
            const processedImage = await processImage(req.file, 'banner');
            if (processedImage) {
                image_url = processedImage;
            }
        } catch (err) {
            console.error('Error processing banner image:', err);
            return res.redirect('/admin/homepage?tab=banners&error=Gagal memproses gambar: ' + err.message);
        }
    }
    
    db.prepare('INSERT INTO homepage_banners (uuid, title, description, badge, promo_code, button_text, button_href, image_url, bg_gradient_from, bg_gradient_to, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(bannerUuid, title || '', description || '', badge || '', promo_code || '', button_text || '', button_href || '#', image_url || '', bg_gradient_from || '#257bf4', bg_gradient_to || '#60a5fa', is_active ? 1 : 0, parseInt(sort_order) || 0);
    res.redirect('/admin/homepage?tab=banners&success=Banner berhasil ditambahkan');
});

router.post('/banners/:bannerUuid/update', upload.single('banner_image'), async (req, res) => {
    const banner = getHomepageBannerByUuid(req.params.bannerUuid);
    if (!banner) return res.redirect('/admin/homepage?tab=banners');
    
    const { title, description, badge, promo_code, button_text, button_href, bg_gradient_from, bg_gradient_to, is_active, sort_order, existing_banner_image_url } = req.body;
    
    let image_url = existing_banner_image_url || '';
    if (req.file) {
        try {
            const processedImage = await processImage(req.file, 'banner');
            if (processedImage) {
                image_url = processedImage;
            }
        } catch (err) {
            console.error('Error processing banner image:', err);
            return res.redirect('/admin/homepage?tab=banners&error=Gagal memproses gambar: ' + err.message);
        }
    }
    
    db.prepare('UPDATE homepage_banners SET title=?, description=?, badge=?, promo_code=?, button_text=?, button_href=?, image_url=?, bg_gradient_from=?, bg_gradient_to=?, is_active=?, sort_order=? WHERE id=?')
        .run(title || '', description || '', badge || '', promo_code || '', button_text || '', button_href || '#', image_url || '', bg_gradient_from || '#257bf4', bg_gradient_to || '#60a5fa', is_active ? 1 : 0, parseInt(sort_order) || 0, banner.id);
    res.redirect('/admin/homepage?tab=banners&success=Banner berhasil diperbarui');
});

router.post('/banners/:bannerUuid/delete', (req, res) => {
    const banner = getHomepageBannerByUuid(req.params.bannerUuid);
    if (!banner) return res.redirect('/admin/homepage?tab=banners');
    db.prepare('DELETE FROM homepage_banners WHERE id = ?').run(banner.id);
    res.redirect('/admin/homepage?tab=banners&success=Banner berhasil dihapus');
});

module.exports = router;
