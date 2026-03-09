const db = require('../database/init');

// Middleware: require login
function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.redirect('/auth/login');
    }
    next();
}

// Middleware: require super_admin role
function requireSuperAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).render('403');
    }
    next();
}

// Middleware: attach user to req and res.locals
function attachUser(req, res, next) {
        if (req.session && req.session.userId) {
        const user = db.prepare('SELECT id, username, role, full_name, email, avatar_url, created_at FROM users WHERE id = ?').get(req.session.userId);
        if (user) {
            req.user = user;
            res.locals.user = user;
        } else {
            // User was deleted, clear session
            if (req.session) {
                req.session.destroy((err) => {
                    if (err) console.error('Session destroy error:', err);
                    return res.redirect('/auth/login');
                });
            } else {
                return res.redirect('/auth/login');
            }
        }
    }
    res.locals.user = res.locals.user || null;
    next();
}

// Helper: check if user can manage a brand
function canManageBrand(user, brand) {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return brand.created_by === user.id;
}

module.exports = { requireAuth, requireSuperAdmin, attachUser, canManageBrand };
