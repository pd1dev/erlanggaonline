const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'cms.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    file_path TEXT NOT NULL,
    description TEXT,
    category TEXT,
    preview_image TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrations for templates table - add new columns if not exist
try {
  db.prepare("SELECT description FROM templates LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE templates ADD COLUMN description TEXT");
    console.log('Migration: added description column to templates');
  } catch (err) {
    // Table might not exist yet
  }
}

try {
  db.prepare("SELECT category FROM templates LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE templates ADD COLUMN category TEXT");
    console.log('Migration: added category column to templates');
  } catch (err) {
    // Table might not exist yet
  }
}

try {
  db.prepare("SELECT is_active FROM templates LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE templates ADD COLUMN is_active INTEGER DEFAULT 1");
    console.log('Migration: added is_active column to templates');
  } catch (err) {
    // Column might already exist
  }
}

// Migrations for existing databases
try {
  db.prepare("SELECT logo_url FROM brands LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE brands ADD COLUMN logo_url TEXT DEFAULT ''");
  console.log('Migration: added logo_url column to brands');
}

try {
  db.prepare("SELECT created_by FROM brands LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE brands ADD COLUMN created_by INTEGER");
  console.log('Migration: added created_by column to brands');
}

try {
  db.prepare("SELECT logo_url FROM homepage_settings LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE homepage_settings ADD COLUMN logo_url TEXT DEFAULT ''");
  console.log('Migration: added logo_url column to homepage_settings');
}

try {
  db.prepare("SELECT full_name FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN full_name TEXT DEFAULT ''");
  console.log('Migration: added full_name column to users');
}

try {
  db.prepare("SELECT email FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''");
  console.log('Migration: added email column to users');
}

try {
  db.prepare("SELECT avatar_url FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''");
  console.log('Migration: added avatar_url column to users');
}

try {
  db.prepare("SELECT uuid FROM brands LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE brands ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to brands');
}

try {
  const { randomUUID } = require('crypto');
  const brands = db.prepare('SELECT id FROM brands WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE brands SET uuid = ? WHERE id = ?');
  for (const brand of brands) {
    updateStmt.run(randomUUID(), brand.id);
  }
  if (brands.length > 0) console.log(`Migration: generated UUIDs for ${brands.length} brands`);
} catch (e) {
  console.log('Migration: could not generate UUIDs', e.message);
}

// UUID for users
try {
  db.prepare("SELECT uuid FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to users');
}
try {
  const { randomUUID } = require('crypto');
  const users = db.prepare('SELECT id FROM users WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE users SET uuid = ? WHERE id = ?');
  for (const user of users) {
    updateStmt.run(randomUUID(), user.id);
  }
  if (users.length > 0) console.log(`Migration: generated UUIDs for ${users.length} users`);
} catch (e) {
  console.log('Migration: could not generate user UUIDs', e.message);
}

// UUID for products
try {
  db.prepare("SELECT uuid FROM products LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE products ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to products');
}
try {
  const { randomUUID } = require('crypto');
  const products = db.prepare('SELECT id FROM products WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE products SET uuid = ? WHERE id = ?');
  for (const product of products) {
    updateStmt.run(randomUUID(), product.id);
  }
  if (products.length > 0) console.log(`Migration: generated UUIDs for ${products.length} products`);
} catch (e) {
  console.log('Migration: could not generate product UUIDs', e.message);
}

// UUID for features
try {
  db.prepare("SELECT uuid FROM features LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE features ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to features');
}
try {
  const { randomUUID } = require('crypto');
  const features = db.prepare('SELECT id FROM features WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE features SET uuid = ? WHERE id = ?');
  for (const feature of features) {
    updateStmt.run(randomUUID(), feature.id);
  }
  if (features.length > 0) console.log(`Migration: generated UUIDs for ${features.length} features`);
} catch (e) {
  console.log('Migration: could not generate feature UUIDs', e.message);
}

// UUID for nav_links
try {
  db.prepare("SELECT uuid FROM nav_links LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE nav_links ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to nav_links');
}
try {
  const { randomUUID } = require('crypto');
  const navLinks = db.prepare('SELECT id FROM nav_links WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE nav_links SET uuid = ? WHERE id = ?');
  for (const link of navLinks) {
    updateStmt.run(randomUUID(), link.id);
  }
  if (navLinks.length > 0) console.log(`Migration: generated UUIDs for ${navLinks.length} nav_links`);
} catch (e) {
  console.log('Migration: could not generate nav_link UUIDs', e.message);
}

// UUID for social_links
try {
  db.prepare("SELECT uuid FROM social_links LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE social_links ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to social_links');
}
try {
  const { randomUUID } = require('crypto');
  const socialLinks = db.prepare('SELECT id FROM social_links WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE social_links SET uuid = ? WHERE id = ?');
  for (const link of socialLinks) {
    updateStmt.run(randomUUID(), link.id);
  }
  if (socialLinks.length > 0) console.log(`Migration: generated UUIDs for ${socialLinks.length} social_links`);
} catch (e) {
  console.log('Migration: could not generate social_link UUIDs', e.message);
}

// UUID for footer_links
try {
  db.prepare("SELECT uuid FROM footer_links LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE footer_links ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to footer_links');
}
try {
  const { randomUUID } = require('crypto');
  const footerLinks = db.prepare('SELECT id FROM footer_links WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE footer_links SET uuid = ? WHERE id = ?');
  for (const link of footerLinks) {
    updateStmt.run(randomUUID(), link.id);
  }
  if (footerLinks.length > 0) console.log(`Migration: generated UUIDs for ${footerLinks.length} footer_links`);
} catch (e) {
  console.log('Migration: could not generate footer_link UUIDs', e.message);
}

// UUID for homepage_products
try {
  db.prepare("SELECT uuid FROM homepage_products LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE homepage_products ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to homepage_products');
}
try {
  const { randomUUID } = require('crypto');
  const products = db.prepare('SELECT id FROM homepage_products WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE homepage_products SET uuid = ? WHERE id = ?');
  for (const product of products) {
    updateStmt.run(randomUUID(), product.id);
  }
  if (products.length > 0) console.log(`Migration: generated UUIDs for ${products.length} homepage_products`);
} catch (e) {
  console.log('Migration: could not generate homepage_product UUIDs', e.message);
}

// UUID for homepage_testimonials
try {
  db.prepare("SELECT uuid FROM homepage_testimonials LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE homepage_testimonials ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to homepage_testimonials');
}
try {
  const { randomUUID } = require('crypto');
  const testimonials = db.prepare('SELECT id FROM homepage_testimonials WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE homepage_testimonials SET uuid = ? WHERE id = ?');
  for (const t of testimonials) {
    updateStmt.run(randomUUID(), t.id);
  }
  if (testimonials.length > 0) console.log(`Migration: generated UUIDs for ${testimonials.length} homepage_testimonials`);
} catch (e) {
  console.log('Migration: could not generate testimonial UUIDs', e.message);
}

// UUID for homepage_nav_links
try {
  db.prepare("SELECT uuid FROM homepage_nav_links LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE homepage_nav_links ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to homepage_nav_links');
}
try {
  const { randomUUID } = require('crypto');
  const links = db.prepare('SELECT id FROM homepage_nav_links WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE homepage_nav_links SET uuid = ? WHERE id = ?');
  for (const link of links) {
    updateStmt.run(randomUUID(), link.id);
  }
  if (links.length > 0) console.log(`Migration: generated UUIDs for ${links.length} homepage_nav_links`);
} catch (e) {
  console.log('Migration: could not generate homepage_nav_link UUIDs', e.message);
}

// UUID for homepage_footer_links
try {
  db.prepare("SELECT uuid FROM homepage_footer_links LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE homepage_footer_links ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to homepage_footer_links');
}
try {
  const { randomUUID } = require('crypto');
  const links = db.prepare('SELECT id FROM homepage_footer_links WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE homepage_footer_links SET uuid = ? WHERE id = ?');
  for (const link of links) {
    updateStmt.run(randomUUID(), link.id);
  }
  if (links.length > 0) console.log(`Migration: generated UUIDs for ${links.length} homepage_footer_links`);
} catch (e) {
  console.log('Migration: could not generate homepage_footer_link UUIDs', e.message);
}

// UUID for homepage_social_links
try {
  db.prepare("SELECT uuid FROM homepage_social_links LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE homepage_social_links ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to homepage_social_links');
}
try {
  const { randomUUID } = require('crypto');
  const links = db.prepare('SELECT id FROM homepage_social_links WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE homepage_social_links SET uuid = ? WHERE id = ?');
  for (const link of links) {
    updateStmt.run(randomUUID(), link.id);
  }
  if (links.length > 0) console.log(`Migration: generated UUIDs for ${links.length} homepage_social_links`);
} catch (e) {
  console.log('Migration: could not generate homepage_social_link UUIDs', e.message);
}

// UUID for homepage_banners
try {
  db.prepare("SELECT uuid FROM homepage_banners LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE homepage_banners ADD COLUMN uuid TEXT");
  console.log('Migration: added uuid column to homepage_banners');
}
try {
  const { randomUUID } = require('crypto');
  const banners = db.prepare('SELECT id FROM homepage_banners WHERE uuid IS NULL').all();
  const updateStmt = db.prepare('UPDATE homepage_banners SET uuid = ? WHERE id = ?');
  for (const banner of banners) {
    updateStmt.run(randomUUID(), banner.id);
  }
  if (banners.length > 0) console.log(`Migration: generated UUIDs for ${banners.length} homepage_banners`);
} catch (e) {
  console.log('Migration: could not generate banner UUIDs', e.message);
}

// Add product_url to products
try {
  db.prepare("SELECT product_url FROM products LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE products ADD COLUMN product_url TEXT DEFAULT ''");
  console.log("Migration: added product_url column to products");
}

module.exports = db;
