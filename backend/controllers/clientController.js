const { supabaseAdmin } = require('../config/supabaseClient');
const { applyWatermark } = require('../utils/watermark');
const fetch = require('node-fetch');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In-memory watermark cache: `assetId:token` → { buffer, expires }
const wmCache = new Map();
const WM_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function setNoStore(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

exports.getAssetsByToken = async (req, res) => {
  setNoStore(res);

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });
  if (!UUID_REGEX.test(token)) return res.status(400).json({ error: 'Invalid token format' });

  let companyData = null;
  let folderIds = [];
  let folderMap = {};

  const { data: company } = await supabaseAdmin
    .from('companies').select('id, name').eq('sharing_token', token).single();

  if (company) {
    companyData = { name: company.name };
    const { data: folders } = await supabaseAdmin
      .from('folders').select('id, name').eq('company_id', company.id);
    folderIds = (folders || []).map(f => f.id);
    (folders || []).forEach(f => { folderMap[f.id] = f.name; });
  } else {
    const { data: folder } = await supabaseAdmin
      .from('folders').select('id, name, company_id').eq('sharing_token', token).single();
    if (!folder) return res.status(404).json({ error: 'Invalid or expired token' });

    const { data: parentCompany } = await supabaseAdmin
      .from('companies').select('name').eq('id', folder.company_id).single();

    companyData = { name: parentCompany?.name || 'Unknown' };
    folderIds = [folder.id];
    folderMap[folder.id] = folder.name;
  }

  if (!folderIds.length) {
    return res.json({ company: companyData, assets: [], expires_in: parseInt(process.env.SIGNED_URL_EXPIRY || '3600') });
  }

  const { data: assets, error: assetsError } = await supabaseAdmin
    .from('assets').select('*').in('folder_id', folderIds);
  if (assetsError) return res.status(500).json({ error: 'Failed to fetch assets' });

  // Don't generate signed URLs here — images are served via watermark proxy
  const assetList = (assets || []).map(asset => ({
    id: asset.id,
    file_name: asset.file_name,
    folder_id: asset.folder_id,
    folder_name: folderMap[asset.folder_id] || '',
    mime_type: asset.mime_type,
    size_bytes: asset.size_bytes,
    url: null,
  }));

  const expiresIn = parseInt(process.env.SIGNED_URL_EXPIRY || '3600');

  // Log access (fire and forget)
  supabaseAdmin.from('access_logs').insert({ sharing_token: token, ip_address: req.ip });

  res.json({ company: companyData, assets: assetList, expires_in: expiresIn });
};

// Watermarked image proxy with in-memory cache
exports.getWatermarkedImage = async (req, res) => {
  const { id } = req.params;
  const { token } = req.query;

  if (!token || !UUID_REGEX.test(token)) return res.status(400).end();

  const cacheKey = `${id}:${token}`;

  // Serve from cache if available
  const cached = wmCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    res.set('Content-Type', 'image/webp');
    setNoStore(res);
    return res.send(cached.buffer);
  }

  // Single query — get asset + folder + company in one join
  const { data: asset } = await supabaseAdmin
    .from('assets')
    .select('storage_path, mime_type, folder_id, folders(company_id, sharing_token, companies(name, sharing_token))')
    .eq('id', id)
    .single();

  if (!asset) return res.status(404).end();

  const folderToken = asset.folders?.sharing_token;
  const companyToken = asset.folders?.companies?.sharing_token;
  const companyName = asset.folders?.companies?.name || 'AetherVisuals';
  if (token !== folderToken && token !== companyToken) return res.status(403).end();

  const { data: signedData } = await supabaseAdmin.storage
    .from('aethervisuals-assets').createSignedUrl(asset.storage_path, 120);
  if (!signedData?.signedUrl) return res.status(500).end();

  const imageRes = await fetch(signedData.signedUrl);
  if (!imageRes.ok) return res.status(502).end();

  const buffer = Buffer.from(await imageRes.arrayBuffer());

  // Per-client watermark — embeds company, date, IP so leaks are traceable
  const ip = req.ip?.replace('::ffff:', '') || 'unknown';
  const date = new Date().toISOString().slice(0, 10);
  const watermarkLines = [
    companyName,
    `${date}  •  ${ip}`,
    process.env.WATERMARK_TEXT || 'AetherVisuals Preview',
  ];

  const watermarked = await applyWatermark(buffer, watermarkLines);

  // Cache per token so each client gets their own watermarked version
  wmCache.set(cacheKey, { buffer: watermarked, expires: Date.now() + WM_CACHE_TTL });

  res.set('Content-Type', 'image/webp');
  setNoStore(res);
  res.send(watermarked);
};
