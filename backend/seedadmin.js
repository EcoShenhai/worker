require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { Sequelize } = require('sequelize');
const useSsl = ['1','true','yes','on'].includes(String(process.env.DB_SSL||'').toLowerCase());
const seq = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT||'5432',10), dialect:'postgres',
  logging:false, dialectOptions: useSsl ? { ssl:{ require:true, rejectUnauthorized:false } } : {},
});
(async()=>{
  const email=(process.env.SUPER_ADMIN_EMAIL||process.env.SUPERADMIN_EMAIL||'pskipchumba@gmail.com').toLowerCase();
  const pw=process.env.SUPER_ADMIN_PASSWORD||process.env.SUPERADMIN_INITIAL_PASSWORD;
  if(!pw){console.error('No SUPER_ADMIN_PASSWORD in env');process.exit(1);}
  const rounds=parseInt(process.env.BCRYPT_ROUNDS||'12',10);
  const hash=await bcrypt.hash(pw,rounds);
  await seq.query(
    'INSERT INTO users (id,email,name,"passwordHash",role,status,"requiresPasswordChange","createdAt","updatedAt") '+
    "VALUES (:id,:email,:name,:hash,'superadmin','active',true,now(),now()) "+
    'ON CONFLICT (email) DO UPDATE SET "passwordHash"=EXCLUDED."passwordHash", role=\'superadmin\', status=\'active\', "requiresPasswordChange"=true, "updatedAt"=now()',
    { replacements:{ id:randomUUID(), email, name:(process.env.SUPER_ADMIN_NAME||'Super Administrator'), hash } }
  );
  const [rows]=await seq.query('SELECT email,role,status,"requiresPasswordChange" AS must_change FROM users');
  console.log('users now:', JSON.stringify(rows));
  console.log('password verifies:', await bcrypt.compare(pw, hash));
  await seq.close();
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
