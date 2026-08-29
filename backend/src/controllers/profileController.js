const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { BCRYPT_ROUNDS, checkPassword } = require('../domain/passwordPolicy');

async function updateProfile(req, res) {
  const { name, email, password } = req.body;
  const userId = req.user.userId;

  const data = {
    ...(name && { name }),
    ...(email && { email }),
  };

  if (password) {
    const passwordProblems = checkPassword(password, { email, name });
    if (passwordProblems.length) return res.status(400).json({ error: passwordProblems.join(' ') });
    data.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, role: true },
  });

  res.json(user);
}

module.exports = { updateProfile };
