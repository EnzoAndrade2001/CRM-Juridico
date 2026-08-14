const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const {
  getSummary,
  listCustomers,
  getCustomer,
  getCustomerContracts,
  getCustomerServiceOrders,
  listEquipments,
} = require('../controllers/crmController');

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/customers', listCustomers);
router.get('/customers/:id', getCustomer);
router.get('/customers/:id/contracts', getCustomerContracts);
router.get('/customers/:id/service-orders', getCustomerServiceOrders);
router.get('/equipments', listEquipments);

module.exports = router;
