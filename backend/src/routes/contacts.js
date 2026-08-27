const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const upload = require('../middlewares/upload');
const isAdmin = require('../middlewares/isAdmin');
const { list, getHistory, updateContact, getMedia, create, getTags, importExcel, deleteContact, clearHistory } = require('../controllers/contactController');

router.use(authenticate);
router.get('/', list);
router.post('/', create);
router.post('/import', upload.single('file'), importExcel);
router.get('/tags', getTags);
router.get('/:id/history', getHistory);
router.patch('/:id', updateContact);
router.get('/:id/media', getMedia);
router.delete('/:id/history', isAdmin, clearHistory);
router.delete('/:id', deleteContact);

module.exports = router;
