const express = require('express');
const path = require('path');
const session = require('express-session');
const seed = require('./database/seed');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const homepageAdminRoutes = require('./routes/homepage-admin');
const { attachUser, requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Session
app.use(session({
    secret: 'cms-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Attach user to all requests
app.use(attachUser);

// Seed database
seed();

// Routes
app.use('/auth', authRoutes);
app.use('/admin/homepage', requireAuth, homepageAdminRoutes);
app.use('/admin', requireAuth, adminRoutes);
app.use('/', publicRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error('ERROR:', err.stack);
    res.status(500).send('Something went wrong! ' + err.message);
});

app.listen(PORT, () => {
    console.log(`\n🚀 CMS Server running at http://localhost:${PORT}`);
    console.log(`📝 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`🌐 Public Sites: http://localhost:${PORT}/[brand-slug]\n`);
});
