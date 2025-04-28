// app.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const { database } = require('./databaseConnection');
const saltRounds = 12;

const app = express();
const port = process.env.PORT || 3000;
const expireTime = 60 * 60 * 1000; // 1 hour expiry for session

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: false }));

// Serve static files (images, CSS, etc.) from the 'public' folder
app.use(express.static('public'));

// Session configuration
var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`,
    crypto: { secret: process.env.MONGODB_SESSION_SECRET }, // Use mongodb_session_secret here for session encryption
    ttl: 60 * 60 // 1 hour session expiration
});

app.use(session({
    secret: process.env.NODE_SESSION_SECRET, // Use node_session_secret here for signing session cookies
    store: mongoStore,
    saveUninitialized: false,
    resave: true
}));

// Home page route
app.get('/', (req, res) => {
    if (req.session.authenticated) {
        res.render('index', {
            authenticated: true,
            username: req.session.username
        });
    } else {
        res.render('index', {
            authenticated: false,
            username: null
        });
    }
});

// Signup page route
app.get('/signup', (req, res) => {
    res.render('signup', { errorMessage: null });
});

// Signup POST route
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    // Validate input
    const schema = Joi.object({
        name: Joi.string().max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
    });

    const validationResult = schema.validate({ name, email, password });
    if (validationResult.error) {
        return res.render('signup', { errorMessage: validationResult.error.details[0].message });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Check if email already exists
    const userCollection = database.db(process.env.MONGODB_DATABASE).collection('users');
    const existingUser = await userCollection.findOne({ email });
    if (existingUser) {
        return res.render('signup', { errorMessage: 'User with that email already exists!' });
    }

    // Insert new user
    await userCollection.insertOne({ name, email, password: hashedPassword });

    // Set session
    req.session.authenticated = true;
    req.session.username = name;
    req.session.cookie.maxAge = expireTime;

    res.redirect('/members');
});

// Login page route
app.get('/login', (req, res) => {
    res.render('login', { errorMessage: null });
});

// Login POST route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

    const validationResult = schema.validate({ email, password });
    if (validationResult.error) {
        return res.render('login', { errorMessage: validationResult.error.details[0].message });
    }

    // Find user in database
    const userCollection = database.db(process.env.MONGODB_DATABASE).collection('users');
    const user = await userCollection.findOne({ email });
    if (!user) {
        return res.render('login', { errorMessage: 'User not found' });
    }

    // Check if password is correct
    const validPassword = await bcrypt.compare(password, user.password);
    if (validPassword) {
        req.session.authenticated = true;
        req.session.username = user.name;
        req.session.cookie.maxAge = expireTime;
        res.redirect('/members');
    } else {
        res.render('login', { errorMessage: 'Incorrect password' });
    }
});

// Members page route
app.get('/members', (req, res) => {
    if (!req.session.authenticated) {
        return res.redirect('/');
    }

    const images = ['/img1.png', '/img2.png', '/img3.png'];
    const randomImage = images[Math.floor(Math.random() * images.length)];
    res.render('members', { username: req.session.username, randomImage });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// 404 route (catch-all for undefined routes)
app.use((req, res) => {
    res.status(404).render('404');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
