import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5050', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'treasure_hunt_secret_key_default',
  adminUsername: process.env.ADMIN_DEFAULT_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'adminpassword123',
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
  uploadDir: path.resolve(__dirname, '../../uploads'),
};
