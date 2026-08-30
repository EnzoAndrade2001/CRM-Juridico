const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
// Reaproveita o multer endurecido (allowlist de extensao, nome aleatorio e
// limite de tamanho). A versao anterior gravava com a extensao original, sem
// filtro nem limite, num diretorio servido publicamente por express.static —
// permitindo upload de .html/.svg com script e esgotamento de disco.
const upload = require('../middlewares/upload');

router.post('/', authenticate, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(err.statusCode || 400).json({ error: err.message || 'Falha no upload' });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    // O multer compartilhado grava em uploads/media/, entao a URL publica
    // precisa do prefixo /uploads/media.
    res.json({ url: `/uploads/media/${req.file.filename}` });
  });
});

module.exports = router;
