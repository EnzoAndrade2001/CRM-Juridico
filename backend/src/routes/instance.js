const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const isAdmin = require('../middlewares/isAdmin');
const { list, create, getQrCode, repair, remove } = require('../controllers/instanceController');

router.use(authenticate);
router.get('/list', list);
router.post('/create', isAdmin, create);
router.post('/:id/repair', isAdmin, repair);
router.get('/qrcode/:id', isAdmin, getQrCode);
router.delete('/:id', isAdmin, remove);

module.exports = router;
