const { supabaseAdmin } = require('../config/supabaseClient');
const { generateSharingToken } = require('../utils/tokenGen');
const { memoryStorage } = require('multer');
const multer = require('multer');
const sharp = require('sharp');

const upload = multer({ storage: memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

// Compress image: max 1800px wide, WebP at quality 82
async function compressImage(buffer, mimetype) {
  if (!IMAGE_TYPES.includes(mimetype)) return buffer;
  return sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();
}

// Thumbnail: max 400px wide, WebP at quality 70
async function makeThumbnail(buffer) {
  return sharp(buffer)
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 60 })
    .toBuffer();
}

// AUTH
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ access_token: data.session.access_token, user: data.user });
};

// COMPANIES
exports.getCompanies = async (req, res) => {
  const { data, error } = await supabaseAdmin.from('companies').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error });
  res.json(data);
};

exports.createCompany = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Company name is required' });
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const { data, error } = await supabaseAdmin
    .from('companies')
    .insert({ name, slug, sharing_token: generateSharingToken() })
    .select().single();
  if (error) return res.status(500).json({ error });
  res.status(201).json(data);
};

exports.deleteCompany = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin.from('companies').delete().eq('id', id);
  if (error) return res.status(500).json({ error });
  res.json({ success: true });
};

// FOLDERS
exports.getFolders = async (req, res) => {
  const { company_id } = req.params;
  const { data, error } = await supabaseAdmin.from('folders').select('*').eq('company_id', company_id);
  if (error) return res.status(500).json({ error });
  res.json(data);
};

exports.createFolder = async (req, res) => {
  const { company_id, name } = req.body;
  if (!company_id || !name) return res.status(400).json({ error: 'company_id and name are required' });
  const { data, error } = await supabaseAdmin
    .from('folders')
    .insert({ company_id, name, sharing_token: generateSharingToken() })
    .select().single();
  if (error) return res.status(500).json({ error });
  res.status(201).json(data);
};

exports.deleteFolder = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin.from('folders').delete().eq('id', id);
  if (error) return res.status(500).json({ error });
  res.json({ success: true });
};

// ASSETS
exports.getAssets = async (req, res) => {
  const { folder_id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('assets').select('*').eq('folder_id', folder_id).order('uploaded_at', { ascending: false });
  if (error) return res.status(500).json({ error });

  // Batch generate all signed URLs in parallel (thumbnails for images, original for others)
  const expiresIn = 300; // 5 min for admin previews
  const withUrls = await Promise.all(data.map(async (a) => {
    const path = a.thumb_path || a.storage_path;
    const { data: signed } = await supabaseAdmin.storage
      .from('aethervisuals-assets')
      .createSignedUrl(path, expiresIn);
    return { ...a, preview_url: signed?.signedUrl || null };
  }));

  res.json(withUrls);
};

exports.uploadAsset = [
  upload.single('file'),
  async (req, res) => {
    const { folder_id, company_id } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file provided' });
    if (!folder_id || !company_id) return res.status(400).json({ error: 'folder_id and company_id are required' });

    const isImage = IMAGE_TYPES.includes(file.mimetype);
    const ts = Date.now();
    const baseName = file.originalname.replace(/\.[^.]+$/, '');

    // Compress image or use raw buffer for non-images
    const [uploadBuffer, uploadMime] = isImage
      ? [await compressImage(file.buffer, file.mimetype), 'image/webp']
      : [file.buffer, file.mimetype];

    const ext = isImage ? 'webp' : file.originalname.split('.').pop();
    const storagePath = `${company_id}/${folder_id}/${ts}_${baseName}.${ext}`;

    // Upload main file
    const { error: storageError } = await supabaseAdmin.storage
      .from('aethervisuals-assets')
      .upload(storagePath, uploadBuffer, { contentType: uploadMime });
    if (storageError) return res.status(500).json({ error: storageError.message });

    // Upload thumbnail for images
    let thumbPath = null;
    if (isImage) {
      const thumbBuffer = await makeThumbnail(uploadBuffer);
      thumbPath = `${company_id}/${folder_id}/thumbs/${ts}_${baseName}.webp`;
      await supabaseAdmin.storage
        .from('aethervisuals-assets')
        .upload(thumbPath, thumbBuffer, { contentType: 'image/webp' });
    }

    const { data, error: dbError } = await supabaseAdmin.from('assets').insert({
      folder_id, company_id,
      file_name: file.originalname,
      storage_path: storagePath,
      thumb_path: thumbPath,
      mime_type: isImage ? 'image/webp' : file.mimetype,
      size_bytes: uploadBuffer.length
    }).select().single();

    if (dbError) return res.status(500).json({ error: dbError.message });
    res.status(201).json(data);
  }
];

exports.getAssetPreview = async (req, res) => {
  const { id } = req.params;
  const { data: asset } = await supabaseAdmin.from('assets').select('storage_path, thumb_path').eq('id', id).single();
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const path = asset.thumb_path || asset.storage_path;
  const { data: signedData } = await supabaseAdmin.storage
    .from('aethervisuals-assets').createSignedUrl(path, 300);
  res.json({ url: signedData?.signedUrl || null });
};

exports.deleteAsset = async (req, res) => {
  const { id } = req.params;
  const { data: asset } = await supabaseAdmin.from('assets').select('storage_path, thumb_path').eq('id', id).single();
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const paths = [asset.storage_path, asset.thumb_path].filter(Boolean);
  await supabaseAdmin.storage.from('aethervisuals-assets').remove(paths);
  await supabaseAdmin.from('assets').delete().eq('id', id);
  res.json({ success: true });
};

// LOGS
exports.getLogs = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const { data, error } = await supabaseAdmin
    .from('access_logs')
    .select('id, sharing_token, ip_address, accessed_at')
    .order('accessed_at', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error });
  res.json(data);
};

// LINKS
exports.getCompanyLink = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from('companies').select('sharing_token').eq('id', id).single();
  if (error || !data) return res.status(404).json({ error: 'Company not found' });
  res.json({ link: `${process.env.BASE_URL}/view?token=${data.sharing_token}` });
};

exports.getFolderLink = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from('folders').select('sharing_token').eq('id', id).single();
  if (error || !data) return res.status(404).json({ error: 'Folder not found' });
  res.json({ link: `${process.env.BASE_URL}/view?token=${data.sharing_token}` });
};

exports.regenerateToken = async (req, res) => {
  const { type, id } = req.params;
  const table = type === 'company' ? 'companies' : 'folders';
  const { data, error } = await supabaseAdmin
    .from(table).update({ sharing_token: generateSharingToken() })
    .eq('id', id).select('sharing_token').single();
  if (error) return res.status(500).json({ error });
  res.json({ link: `${process.env.BASE_URL}/view?token=${data.sharing_token}` });
};
