import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { EbookStorage, EbookStreamResult } from './storage.interfaces';

@Injectable()
export class R2EbookStorage implements EbookStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    this.bucket = configService.get<string>('storage.r2.bucket', 'huki-ebooks');
    this.client = new S3Client({
      region: 'auto',
      endpoint: configService.get<string>('storage.r2.endpoint'),
      credentials: {
        accessKeyId: configService.get<string>('storage.r2.accessKeyId', ''),
        secretAccessKey: configService.get<string>('storage.r2.secretAccessKey', ''),
      },
    });
  }

  async upload(buffer: Buffer, key: string, contentType: string): Promise<void> {
    let r2Success = false;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
      r2Success = true;
    } catch (r2Err: any) {
      console.warn(`[R2EbookStorage] R2 S3 PutObject failed: ${r2Err?.message || r2Err}`);
    }

    // Save a local disk backup in assets
    try {
      const candidatesDirs = [
        path.resolve(process.cwd(), 'platform/apps/commerce-service/assets', path.dirname(key)),
        path.resolve(process.cwd(), 'apps/commerce-service/assets', path.dirname(key)),
      ];
      for (const d of candidatesDirs) {
        if (!fs.existsSync(d)) {
          fs.mkdirSync(d, { recursive: true });
        }
        const filePath = path.resolve(d, path.basename(key));
        fs.writeFileSync(filePath, buffer);
      }
    } catch (fsErr) {
      console.warn(`[R2EbookStorage] Local asset backup write failed: ${fsErr}`);
    }

    if (!r2Success) {
      const localCandidates = [
        path.resolve(process.cwd(), 'platform/apps/commerce-service/assets', key),
        path.resolve(process.cwd(), 'apps/commerce-service/assets', key),
      ];
      const hasLocalCopy = localCandidates.some((c) => fs.existsSync(c));
      if (!hasLocalCopy) {
        throw new Error('Ebook upload failed on both R2 cloud storage and local filesystem.');
      }
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getStream(key: string, range?: string): Promise<EbookStreamResult> {
    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(range ? { Range: range } : {}),
      }),
    );
    return {
      stream: res.Body,
      contentLength: res.ContentLength,
      contentType: res.ContentType,
      contentRange: res.ContentRange,
    };
  }
}
