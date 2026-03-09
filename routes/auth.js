const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/init');
const multer = require('multer');
const path = require('path');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const { processImage } = require('../utils/imageProcessor');
const { getUserByUuid, getUserById } = require('../utils/brandEncoder');
const { randomUUID } = require('crypto');

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('File harus berupa gambar (jpg, png, gif, webp)'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ==================== LOGIN ====================
router.get('/login', (req, res) => {
    if (req.session && req.session.userId) return res.redirect('/admin');
    res.render('auth/login', { error: null });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.render('auth/login', { error: 'Username atau password salah' });
    }

    req.session.userId = user.id;
    
    // Check if first login - redirect to onboarding
    const hasBrands = db.prepare('SELECT COUNT(*) as count FROM brands WHERE created_by = ?').get(user.id).count > 0;
    if (!hasBrands && user.role === 'super_admin') {
        return res.redirect('/admin/onboarding');
    }
    
    res.redirect('/admin');
});

// ==================== ONBOARDING ====================
router.get('/onboarding', requireAuth, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.render('admin/onboarding', { user });
});

// ==================== LOGOUT ====================
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});

// ==================== PROFILE ====================
router.get('/profile', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, username, role, full_name, email, avatar_url, created_at FROM users WHERE id = ?').get(req.user.id);
    res.render('auth/profile', { 
        user, 
        success: req.query.success, 
        error: req.query.error,
        user: req.user,
        activePage: 'profile'
    });
});

router.post('/profile/update', requireAuth, upload.single('avatar'), async (req, res) => {
    const { full_name, email, existing_avatar_url } = req.body;
    
    let avatar_url = existing_avatar_url || '';
    if (req.file) {
        const processedImage = await processImage(req.file, 'avatar');
        if (processedImage) avatar_url = processedImage;
    }
    
    db.prepare('UPDATE users SET full_name = ?, email = ?, avatar_url = ? WHERE id = ?')
        .run(full_name || '', email || '', avatar_url, req.user.id);
    
    res.redirect('/auth/profile?success=Profil berhasil diperbarui');
});

router.post('/profile/password', requireAuth, (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    
    if (!bcrypt.compareSync(current_password, user.password)) {
        return res.redirect('/auth/profile?error=Password lama salah');
    }
    
    if (new_password !== confirm_password) {
        return res.redirect('/auth/profile?error=Konfirmasi password tidak cocok');
    }
    
    if (new_password.length < 6) {
        return res.redirect('/auth/profile?error=Password minimal 6 karakter');
    }
    
    const hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
    
    res.redirect('/auth/profile?success=Password berhasil diubah');
});

// ==================== USER MANAGEMENT (Super Admin only) ====================
router.get('/users', requireAuth, requireSuperAdmin, (req, res) => {
    const users = db.prepare(`
        SELECT u.*, 
        (SELECT COUNT(*) FROM brands WHERE created_by = u.id) as brand_count
        FROM users u ORDER BY u.created_at DESC
    `).all();
    res.render('auth/users', { users, success: req.query.success, error: req.query.error, user: req.user, activePage: 'users' });
});

router.get('/users/create', requireAuth, requireSuperAdmin, (req, res) => {
    res.render('auth/user-form', { editUser: null, error: null, user: req.user, activePage: 'users' });
});

router.post('/users/create', requireAuth, requireSuperAdmin, (req, res) => {
    const { username, password, role } = req.body;
    const userUuid = randomUUID();
    try {
        const hash = bcrypt.hashSync(password, 10);
        db.prepare('INSERT INTO users (uuid, username, password, role) VALUES (?, ?, ?, ?)').run(userUuid, username, hash, role || 'admin');
        res.redirect('/auth/users?success=User berhasil dibuat');
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.render('auth/user-form', { editUser: null, error: 'Username sudah digunakan', user: req.user, activePage: 'users' });
        }
        res.render('auth/user-form', { editUser: null, error: err.message, user: req.user, activePage: 'users' });
    }
});

router.get('/users/:uuid/edit', requireAuth, requireSuperAdmin, (req, res) => {
    const editUser = getUserByUuid(req.params.uuid);
    if (!editUser) return res.redirect('/auth/users');
    res.render('auth/user-form', { editUser, error: null, user: req.user, activePage: 'users' });
});

router.post('/users/:uuid/update', requireAuth, requireSuperAdmin, (req, res) => {
    const user = getUserByUuid(req.params.uuid);
    if (!user) return res.redirect('/auth/users');
    
    const { username, password, role } = req.body;
    try {
        if (password && password.trim()) {
            const hash = bcrypt.hashSync(password, 10);
            db.prepare('UPDATE users SET username=?, password=?, role=? WHERE id=?').run(username, hash, role, user.id);
        } else {
            db.prepare('UPDATE users SET username=?, role=? WHERE id=?').run(username, role, user.id);
        }
        res.redirect('/auth/users?success=User berhasil diperbarui');
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            const editUser = { uuid: req.params.uuid, id: user.id, username, role };
            return res.render('auth/user-form', { editUser, error: 'Username sudah digunakan' });
        }
        res.redirect('/auth/users?error=' + encodeURIComponent(err.message));
    }
});

router.post('/users/:uuid/delete', requireAuth, requireSuperAdmin, (req, res) => {
    const user = getUserByUuid(req.params.uuid);
    if (!user) return res.redirect('/auth/users');
    
    // Prevent deleting yourself
    if (user.id === req.user.id) {
        return res.redirect('/auth/users?error=Tidak bisa menghapus akun sendiri');
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    res.redirect('/auth/users?success=User berhasil dihapus');
});

module.exports = router;
