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
const {
  listLegalClients,
  getLegalClient,
  createLegalClient,
  updateLegalClient,
} = require('../controllers/legalClientController');
const {
  listLegalDocuments,
  getLegalDocument,
  createLegalDocument,
  uploadLegalDocumentFile,
  updateLegalDocument,
  downloadLegalDocument,
} = require('../controllers/legalDocumentController');
const { legalDocumentUpload, handleUploadError } = require('../middlewares/legalDocumentUpload');

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.use(authenticate);

router.get('/config', asyncRoute(getLegalConfig));
router.get('/summary', asyncRoute(getLegalSummary));

router.get('/clients', asyncRoute(listLegalClients));
router.post('/clients', asyncRoute(createLegalClient));
router.get('/clients/:id', asyncRoute(getLegalClient));
router.patch('/clients/:id', asyncRoute(updateLegalClient));

router.get('/leads', asyncRoute(listLegalLeads));
router.post('/leads', asyncRoute(createLegalLead));
router.get('/leads/:id', asyncRoute(getLegalLead));
router.patch('/leads/:id', asyncRoute(updateLegalLead));

router.get('/matters', asyncRoute(listLegalMatters));
router.post('/matters', asyncRoute(createLegalMatter));
router.get('/matters/:id', asyncRoute(getLegalMatter));
router.patch('/matters/:id', asyncRoute(updateLegalMatter));

router.get('/documents', asyncRoute(listLegalDocuments));
router.post('/documents', legalDocumentUpload.single('file'), handleUploadError, asyncRoute(createLegalDocument));
router.get('/documents/:id', asyncRoute(getLegalDocument));
router.patch('/documents/:id', asyncRoute(updateLegalDocument));
router.get('/documents/:id/file', asyncRoute(downloadLegalDocument));
router.post('/documents/:id/file', legalDocumentUpload.single('file'), handleUploadError, asyncRoute(uploadLegalDocumentFile));

router.get('/tasks', asyncRoute(listLegalTasks));
router.post('/tasks', asyncRoute(createLegalTask));
router.patch('/tasks/:id', asyncRoute(updateLegalTask));

router.use(handleLegalError);

module.exports = router;
