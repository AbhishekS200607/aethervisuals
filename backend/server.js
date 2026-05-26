require('dotenv').config({ path: '../.env' });
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const adminRoutes = require('./routes/adminRoutes');
const clientRoutes = require('./routes/clientRoutes');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Trust reverse proxy (Nginx/Caddy/Railway/Render) — fixes req.ip
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "blob:", "data:", "*.supabase.co"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "*.supabase.co"],
    }
  }
}));

// Logging — concise in production
app.use(morgan(isProd ? 'combined' : 'dev'));

app.use(express.json());

// CORS — allow BASE_URL in prod, anything in dev
app.use(cors({
  origin: isProd ? process.env.BASE_URL : true,
  credentials: true,
}));

app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);

// Cache admin HTML in memory — read once, inject config, serve fast
const adminDir = path.join(__dirname, 'resource/frontend/admin');
const adminHtmlRaw = fs.readFileSync(path.join(adminDir, 'index.html'), 'utf8');
const adminHtmlInjected = adminHtmlRaw.replace(
  '</head>',
  `<script>window.__AV_SUPABASE_URL__="${process.env.SUPABASE_URL}";window.__AV_SUPABASE_ANON_KEY__="${process.env.SUPABASE_ANON_KEY}";</script>\n</head>`
);

app.use('/admin', express.static(adminDir, { index: false }));
app.get('/admin*', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(adminHtmlInjected);
});

app.use('/view', express.static(path.join(__dirname, 'resource/frontend/customer')));
app.get('/view*', (req, res) =>
  res.sendFile(path.join(__dirname, 'resource/frontend/customer/index.html'))
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AetherVisuals running on port ${PORT} [${isProd ? 'production' : 'development'}]`));
