// Prod'da Apache /lottery-admin prefiksi ostida proksi qiladi (BASE_PATH=/lottery-admin).
module.exports = (process.env.BASE_PATH || '').replace(/\/$/, '');
