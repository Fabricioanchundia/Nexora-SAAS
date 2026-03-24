// src/modules/storage/storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: string;
  private readonly localPath: string;

  constructor(private readonly configService: ConfigService) {
    this.driver = this.configService.get('STORAGE_DRIVER', 'local');
    this.localPath = this.configService.get('STORAGE_LOCAL_PATH', './storage');
  }

  async upload(filePath: string, buffer: Buffer): Promise<string> {
    if (this.driver === 'local') {
      return this.uploadLocal(filePath, buffer);
    }
    // TODO: implementar S3 cuando se migre a producción en la nube
    throw new Error(`Driver de storage no soportado: ${this.driver}`);
  }

  async download(filePath: string): Promise<Buffer> {
    if (this.driver === 'local') {
      return this.downloadLocal(filePath);
    }
    throw new Error(`Driver de storage no soportado: ${this.driver}`);
  }

  async getUrl(filePath: string): Promise<string> {
    if (this.driver === 'local') {
      return `file://${path.join(this.localPath, filePath)}`;
    }
    throw new Error(`Driver de storage no soportado: ${this.driver}`);
  }

  private async uploadLocal(filePath: string, buffer: Buffer): Promise<string> {
    const fullPath = path.join(this.localPath, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    this.logger.debug(`Archivo guardado: ${fullPath}`);
    return filePath;
  }

  private async downloadLocal(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.localPath, filePath);
    return fs.readFile(fullPath);
  }
}