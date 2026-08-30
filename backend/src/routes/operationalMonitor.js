const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const {
  getOverview,
  markResolved,
  ingestPublicEvent,
} = require('../controllers/operationalMonitorController');

const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', authenticate, asyncHandler(getOverview));
router.patch('/:id', authenticate, asyncHandler(markResolved));
router.post('/public-events', asyncHandler(ingestPublicEvent));

module.exports = router;
