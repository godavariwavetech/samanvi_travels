const express = require('express');
const rateLimit = require('express-rate-limit');// npm i express-rate-limit
const requestIp = require('request-ip');// npm i request-ip
// const { apiRateLimiter } = require('../utils/apiratelimiter'); SET PATH IN ROUTES
const app = express();

// Middleware to get client IP address
app.use(requestIp.mw());

// Create a rate limiter for the specific API endpoint
const apiRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    keyGenerator: (req, res) => {
        // Use the x-forwarded-for header or remote address
        return req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    },
    handler: function (req, res) {
        // Send a 429 response when rate limit is exceeded
        // return res.status(429).json({error: 'You sent too many requests. Please wait a while then try again' });
        return res.send({ "status": 429, "message": 'You sent too many requests. Please wait a while then try again' });
    }
});
module.exports = { apiRateLimiter };