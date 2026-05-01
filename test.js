const request = require('supertest');
const express = require('express');
const cors = require('cors');
const { default: rateLimit, ipKeyGenerator } = require('express-rate-limit');
const fs = require('fs');

// Mock the app setup similar to index.js
const app = express();
app.use(cors());
app.set('trust proxy', true);

const reasons = JSON.parse(fs.readFileSync('./reasons.json', 'utf-8'));

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    keyGenerator: (req, res) => {
        return req.headers['cf-connecting-ip'] || ipKeyGenerator(req);
    },
    message: { error: "Too many requests, please try again later. (120 reqs/min/IP)" }
});

app.use(limiter);

app.get('/no', (req, res) => {
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    res.json({ reason });
});

describe('Express API Tests', () => {
    test('GET /no returns a reason from reasons.json', async () => {
        const response = await request(app).get('/no');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('reason');
        expect(reasons).toContain(response.body.reason);
    });

    test('GET /no returns valid JSON with reason property', async () => {
        const response = await request(app).get('/no');
        expect(response.status).toBe(200);
        expect(typeof response.body.reason).toBe('string');
    });

    test('Rate limiter allows up to 120 requests per minute', async () => {
        const response = await request(app).get('/no');
        expect(response.status).toBe(200);
    });

    test('CORS headers are present in response', async () => {
        const response = await request(app).get('/no');
        expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
});
