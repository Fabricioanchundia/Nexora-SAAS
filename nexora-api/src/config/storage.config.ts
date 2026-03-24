import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
    driver: process.env.STORAGE_DRIVER || 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || './storage',
}));