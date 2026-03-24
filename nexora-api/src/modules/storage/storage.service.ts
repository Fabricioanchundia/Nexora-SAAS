import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: string;
  private readonly localPath: string;

  constructor(private readonly cfg: ConfigService) {
    this.driver = this.cfg.get<string>('STORAGE_DRIVER', 'local');
    this.localPath = this.cfg.get<string>('STORAGE_LOCAL_PATH', './storage');
  }

  async upload(filePath: string, buffer: Buffer): Promise<string> {
    if (this.driver === 'local') return this.uploadLocal(filePath, buffer);
    throw new Error(`Driver de storage no soportado: ${this.driver}`);
  }

  async download(filePath: string): Promise<Buffer> {
    if (this.driver === 'local') return this.downloadLocal(filePath);
    throw new Error(`Driver de storage no soportado: ${this.driver}`);
  }

  async getUrl(filePath: string): Promise<string> {
    return path.join(this.localPath, filePath);
  }

  private async uploadLocal(filePath: string, buffer: Buffer): Promise<string> {
    const full = path.join(this.localPath, filePath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
    return filePath;
  }

  private async downloadLocal(filePath: string): Promise<Buffer> {
    return fs.readFile(path.join(this.localPath, filePath));
  }
}