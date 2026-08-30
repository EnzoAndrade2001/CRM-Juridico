const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const { getEquipments, addEquipment, updateEquipment, deleteEquipment, getOSList, createOS, getOSStatus, updateOS, draftOS, getOSTypes, getOSTechnicians } = require('../controllers/osController');
const { sendManagerCopy } = require('../controllers/serviceOrderManagerController');

router.use(authenticate);

// OS Metadata
router.get('/types', getOSTypes);
router.get('/technicians', getOSTechnicians);

// Equipments (can be managed here or under contacts)
router.get('/contacts/:contactId/equipments', getEquipments);
router.post('/contacts/:contactId/equipments', addEquipment);
router.patch('/equipments/:id', updateEquipment);
router.delete('/equipments/:id', deleteEquipment);

// OS CRUD
router.get('/', getOSList);
router.post('/', createOS);
router.post('/draft', draftOS);
router.get('/:id/status', getOSStatus);
router.post('/:id/send-manager-copy', sendManagerCopy);
router.patch('/:id', updateOS);
// Rota de PDF de O.S. removida: recurso legado do CRM da LCD Digital, sem uso
// no juridico. Era o unico fluxo que passava o JWT em ?token= na URL (vazava
// nos logs); a remocao fecha a origem do achado M-1 do pentest.

module.exports = router;
