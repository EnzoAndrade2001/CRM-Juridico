const router = require('express').Router();
const { createCalculatorSubmission } = require('../controllers/publicCalculatorController');

router.post('/calculator-leads', createCalculatorSubmission);

module.exports = router;
