const router = require('express').Router();
const { handleWebhook } = require('../controllers/webhookController');
const { verifyWebhookSecret } = require('../utils/webhookSecurity');

router.post('/', (req, res, next) => {
  if (!verifyWebhookSecret(req)) {
    console.warn(`[webhook] requisição rejeitada: segredo ausente ou inválido (ip=${req.ip})`);
    return res.sendStatus(401);
  }
  return handleWebhook(req, res, next);
});

module.exports = router;
