'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Seeds the initial superadmin.
 *
 * SECURITY: the password is NEVER stored in this file or the repository.
 * It is read from SUPERADMIN_INITIAL_PASSWORD at seed time and the account is
 * flagged requiresPasswordChange = true, forcing a reset on first login.
 *
 *   SUPERADMIN_EMAIL=pskipchumba@gmail.com \
 *   SUPERADMIN_INITIAL_PASSWORD='<set-a-strong-one-off-value>' \
 *   npm run db:seed:admin
 */
module.exports = {
  async up(queryInterface) {
    const email = (process.env.SUPERADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'pskipchumba@gmail.com').toLowerCase();
    const name = process.env.SUPERADMIN_NAME || process.env.SUPER_ADMIN_NAME || 'Super Administrator';
    const password = process.env.SUPERADMIN_INITIAL_PASSWORD || process.env.SUPER_ADMIN_PASSWORD;
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

    if (!password) {
      throw new Error(
        'SUPERADMIN_INITIAL_PASSWORD is not set. Refusing to seed a superadmin with a default/blank password. ' +
          'Set it in the environment (outside the repository) and re-run the seed.'
      );
    }

    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      { replacements: { email }, type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (existing) {
      // eslint-disable-next-line no-console
      console.log('Superadmin already exists; skipping.');
      return;
    }

    const passwordHash = await bcrypt.hash(password, rounds);
    const now = new Date();
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        email,
        name,
        passwordHash,
        role: 'superadmin',
        status: 'active',
        requiresPasswordChange: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    const email = (process.env.SUPERADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'pskipchumba@gmail.com').toLowerCase();
    await queryInterface.bulkDelete('users', { email });
  },
};
