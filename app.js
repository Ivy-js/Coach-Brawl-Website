const express = require('express');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
const QuickDB = require('quick.db');
const db = new QuickDB.QuickDB();
const config = require("./private/config.json")

const app = express();
const PORT = 1337;
const DISCORD_CLIENT_ID = config.id;
const DISCORD_CLIENT_SECRET = config.secret;
const REDIRECT_URI = `http://localhost:${PORT}/auth/discord/callback`;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true for HTTPS
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    if (req.session.user) {
        return res.render('logged', { user: req.session.user, badge: null });
    }
    res.render('main');
});

app.get('/auth/discord', (req, res) => {
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify`;
    res.redirect(authUrl);
});

app.get('/auth/discord/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.redirect('/');
    }

    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            client_secret: DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
        });

        req.session.user = userResponse.data;
        res.redirect('/');
    } catch (e) {
        console.error(`[🐛] Erreur lors de l'Auth Discord : ${e.message}`);
        res.redirect('/');
    }
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    const badge = await db.get(`badges.${req.session.user.id}`);
    res.render('dashboard', { user: req.session.user, badge });
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Erreur lors de la déconnexion:', err);
        }
        res.redirect('/');
    });
});

app.get('/test', (req, res) => {
    res.send('Server is working!');
});

app.listen(PORT, () => {
    console.log(`[📦] Server Running on http://localhost:${PORT}`);
});
