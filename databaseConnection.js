require('dotenv').config();
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database_users = process.env.MONGODB_DATABASE_USERS;
const mongodb_database_sessions = process.env.MONGODB_DATABASE_SESSIONS;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

// Users database configuration
const MongoClient = require("mongodb").MongoClient;
const atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database_users}?retryWrites=true&w=majority`;

// Create and export MongoDB connection instance
var database = new MongoClient(atlasURI, {});
module.exports = { database };
