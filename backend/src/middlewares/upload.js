const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const { mediaPath } = require('../utils/uploads');

// O diretório de mídias é servido pelo navegador. Bloquear extensões
// executáveis/documentos HTML evita que um upload seja transformado em
// conteúdo ativo caso alguém abra a URL diretamente.
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.mp4', '.mov', '.mkv', '.webm', '.3gp',
  '.mp3', '.ogg', '.wav', '.m4a',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.rtf', '.zip',
  '.heic', '.heif',
]);

const storage = multer.diskStorage({
  destination: mediaPath,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) return cb(null, true);
    const error = new Error('Tipo de arquivo não permitido');
    error.statusCode = 400;
    return cb(error, false);
  },
}); // 20MB
