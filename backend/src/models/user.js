'use strict';
const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const config = require('../config');

module.exports = (sequelize) => {
  class User extends Model {
    async validatePassword(plain) {
      return bcrypt.compare(plain, this.passwordHash);
    }

    async setPassword(plain) {
      this.passwordHash = await bcrypt.hash(plain, config.security.bcryptRounds);
    }

    toSafeJSON() {
      const { id, email, name, role, status, requiresPasswordChange, emailVerified, lastLoginAt, createdAt } = this;
      return { id, email, name, role, status, requiresPasswordChange, emailVerified, lastLoginAt, createdAt };
    }
  }

  User.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
        set(v) {
          this.setDataValue('email', String(v || '').trim().toLowerCase());
        },
      },
      name: { type: DataTypes.STRING, allowNull: false },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      // superadmin | admin | officer | viewer
      role: {
        type: DataTypes.ENUM('superadmin', 'admin', 'officer', 'viewer'),
        allowNull: false,
        defaultValue: 'officer',
      },
      department: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.ENUM('active', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
      },
      requiresPasswordChange: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      defaultScope: { attributes: { exclude: ['passwordHash'] } },
      scopes: { withSecret: { attributes: {} } },
    }
  );

  return User;
};
