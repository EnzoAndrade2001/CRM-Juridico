const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const {
  getLegalConfig,
  getLegalSummary,
  listLegalLeads,
  getLegalLead,
  createLegalLead,
  updateLegalLead,
  listLegalMatters,
  getLegalMatter,
  createLegalMatter,
  updateLegalMatter,
  listLegalTasks,
  createLegalTask,
  updateLegalTask,
  handleLegalError,
} = require('../controllers/legalController');

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.use(authenticate);

router.get('/config', asyncRoute(getLegalConfig));
router.get('/summary', asyncRoute(getLegalSummary));

router.get('/leads', asyncRoute(listLegalLeads));
router.post('/leads', asyncRoute(createLegalLead));
router.get('/leads/:id', asyncRoute(getLegalLead));
router.patch('/leads/:id', asyncRoute(updateLegalLead));

router.get('/matters', asyncRoute(listLegalMatters));
router.post('/matters', asyncRoute(createLegalMatter));
router.get('/matters/:id', asyncRoute(getLegalMatter));
router.patch('/matters/:id', asyncRoute(updateLegalMatter));

router.get('/tasks', asyncRoute(listLegalTasks));
router.post('/tasks', asyncRoute(createLegalTask));
router.patch('/tasks/:id', asyncRoute(updateLegalTask));

router.use(handleLegalError);

module.exports = router;
