const router = require('express').Router();
const client = require('../controllers/clientController');
const { clientAccessLimiter } = require('../middleware/rateLimiter');

router.get('/view', clientAccessLimiter, client.getAssetsByToken);
router.get('/image/:id', clientAccessLimiter, client.getWatermarkedImage);

module.exports = router;
