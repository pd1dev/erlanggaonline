const db = require('../database/init');

// Brand UUID helpers
function getBrandByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM brands WHERE uuid = ?').get(uuid);
}

function getBrandById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM brands WHERE id = ?').get(id);
}

function getBrandId(identifier) {
    if (!identifier) return null;
    
    const brand = getBrandByUuid(identifier);
    if (brand) return brand.id;
    
    const numericId = parseInt(identifier);
    if (!isNaN(numericId)) {
        const brandById = getBrandById(numericId);
        if (brandById) return brandById.id;
    }
    
    return null;
}

// User UUID helpers
function getUserByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM users WHERE uuid = ?').get(uuid);
}

function getUserById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// Product UUID helpers
function getProductByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM products WHERE uuid = ?').get(uuid);
}

function getProductById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

// Feature UUID helpers
function getFeatureByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM features WHERE uuid = ?').get(uuid);
}

function getFeatureById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM features WHERE id = ?').get(id);
}

// Nav Link UUID helpers
function getNavLinkByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM nav_links WHERE uuid = ?').get(uuid);
}

function getNavLinkById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM nav_links WHERE id = ?').get(id);
}

// Social Link UUID helpers
function getSocialLinkByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM social_links WHERE uuid = ?').get(uuid);
}

function getSocialLinkById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM social_links WHERE id = ?').get(id);
}

// Footer Link UUID helpers
function getFooterLinkByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM footer_links WHERE uuid = ?').get(uuid);
}

function getFooterLinkById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM footer_links WHERE id = ?').get(id);
}

// Homepage Product UUID helpers
function getHomepageProductByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM homepage_products WHERE uuid = ?').get(uuid);
}

function getHomepageProductById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM homepage_products WHERE id = ?').get(id);
}

// Homepage Testimonial UUID helpers
function getHomepageTestimonialByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM homepage_testimonials WHERE uuid = ?').get(uuid);
}

function getHomepageTestimonialById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM homepage_testimonials WHERE id = ?').get(id);
}

// Homepage Nav Link UUID helpers
function getHomepageNavLinkByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM homepage_nav_links WHERE uuid = ?').get(uuid);
}

function getHomepageNavLinkById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM homepage_nav_links WHERE id = ?').get(id);
}

// Homepage Footer Link UUID helpers
function getHomepageFooterLinkByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM homepage_footer_links WHERE uuid = ?').get(uuid);
}

function getHomepageFooterLinkById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM homepage_footer_links WHERE id = ?').get(id);
}

// Homepage Social Link UUID helpers
function getHomepageSocialLinkByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM homepage_social_links WHERE uuid = ?').get(uuid);
}

function getHomepageSocialLinkById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM homepage_social_links WHERE id = ?').get(id);
}

// Homepage Banner UUID helpers
function getHomepageBannerByUuid(uuid) {
    if (!uuid) return null;
    return db.prepare('SELECT * FROM homepage_banners WHERE uuid = ?').get(uuid);
}

function getHomepageBannerById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM homepage_banners WHERE id = ?').get(id);
}

module.exports = {
    // Brand
    getBrandByUuid,
    getBrandById,
    getBrandId,
    // User
    getUserByUuid,
    getUserById,
    // Product
    getProductByUuid,
    getProductById,
    // Feature
    getFeatureByUuid,
    getFeatureById,
    // Nav Link
    getNavLinkByUuid,
    getNavLinkById,
    // Social Link
    getSocialLinkByUuid,
    getSocialLinkById,
    // Footer Link
    getFooterLinkByUuid,
    getFooterLinkById,
    // Homepage Product
    getHomepageProductByUuid,
    getHomepageProductById,
    // Homepage Testimonial
    getHomepageTestimonialByUuid,
    getHomepageTestimonialById,
    // Homepage Nav Link
    getHomepageNavLinkByUuid,
    getHomepageNavLinkById,
    // Homepage Footer Link
    getHomepageFooterLinkByUuid,
    getHomepageFooterLinkById,
    // Homepage Social Link
    getHomepageSocialLinkByUuid,
    getHomepageSocialLinkById,
    // Homepage Banner
    getHomepageBannerByUuid,
    getHomepageBannerById
};
