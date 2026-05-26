const router = require('express').Router();
const admin = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const { adminLoginLimiter, generalLimiter } = require('../middleware/rateLimiter');

router.post('/login', adminLoginLimiter, admin.login);

router.use(authMiddleware);
router.use(generalLimiter);

router.get('/companies', admin.getCompanies);
router.post('/companies', admin.createCompany);
router.delete('/companies/:id', admin.deleteCompany);

router.get('/companies/:company_id/folders', admin.getFolders);
router.post('/folders', admin.createFolder);
router.delete('/folders/:id', admin.deleteFolder);

router.get('/folders/:folder_id/assets', admin.getAssets);
router.get('/assets/:id/preview', admin.getAssetPreview);
router.post('/assets', admin.uploadAsset);
router.delete('/assets/:id', admin.deleteAsset);

router.get('/link/company/:id', admin.getCompanyLink);
router.get('/link/folder/:id', admin.getFolderLink);
router.post('/link/regenerate/:type/:id', admin.regenerateToken);

module.exports = router;
