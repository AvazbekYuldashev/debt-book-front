const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Foydalanish: node src/generate-hash.js <parol>');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 10));
