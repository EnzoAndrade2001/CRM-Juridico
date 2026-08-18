const multer = require('multer');

const { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = require('../utils/legalStorage');

// Armazenamento em memória: o arquivo só chega ao disco depois que o vínculo com o
// escritório autenticado, o tipo e o tamanho foram validados, evitando arquivos órfãos.
const legalDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const error = new Error('Formato de arquivo não aceito para documentos jurídicos');
      error.statusCode = 415;
      error.details = [{ field: 'file', code: 'unsupported_media_type', allowed: ALLOWED_MIME_TYPES }];
      return cb(error);
    }
    return cb(null, true);
  },
});

function handleUploadError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'O arquivo excede o limite de 20 MB'
      : 'Falha ao receber o arquivo enviado';
    return res.status(400).json({ error: message, details: [{ field: 'file', code: error.code }] });
  }
  return next(error);
}

module.exports = { legalDocumentUpload, handleUploadError };
