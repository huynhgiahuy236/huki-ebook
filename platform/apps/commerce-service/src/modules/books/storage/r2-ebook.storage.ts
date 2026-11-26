import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { EbookStorage, EbookStreamResult } from './storage.interfaces';

@Injectable()
export class R2EbookStorage implements EbookStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly hasR2Config: boolean;
  private readonly existsCache = new Map<string, { value: boolean; expiresAt: number }>();

  constructor(configService: ConfigService) {
    const accountId = process.env.R2_ACCOUNT_ID?.trim();
    const rawEndpoint =
      configService.get<string>('storage.r2.endpoint')?.trim() ||
      process.env.CLOUDFLARE_R2_ENDPOINT?.trim() ||
      process.env.R2_ENDPOINT?.trim() ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
    const accessKeyId =
      configService.get<string>('storage.r2.accessKeyId')?.trim() ||
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() ||
      process.env.R2_ACCESS_KEY_ID?.trim() ||
      '';
    const secretAccessKey =
      configService.get<string>('storage.r2.secretAccessKey')?.trim() ||
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim() ||
      process.env.R2_SECRET_ACCESS_KEY?.trim() ||
      '';
    this.bucket =
      configService.get<string>('storage.r2.bucket')?.trim() ||
      process.env.CLOUDFLARE_R2_BUCKET?.trim() ||
      process.env.R2_BUCKET_NAME?.trim() ||
      'huki-ebooks';
    const normalizedEndpoint = rawEndpoint
      .replace(/\/+$/, '')
      .replace(new RegExp(`/${this.bucket}$`, 'i'), '');
    this.hasR2Config = Boolean(normalizedEndpoint && accessKeyId && secretAccessKey);
    if (!this.hasR2Config) {
      console.warn('[R2EbookStorage] R2 credentials/endpoint are not configured; falling back to local assets only.');
    }
    this.client = new S3Client({
      region: 'auto',
      endpoint: normalizedEndpoint || undefined,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private isNotFoundError(err: any): boolean {
    const status = err?.$metadata?.httpStatusCode;
    const code = err?.name || err?.Code || err?.code;
    return status === 404 || code === 'NotFound' || code === 'NoSuchKey';
  }

  private findLocalAssetPath(key: string): string | null {
    if (!key) return null;
    const relativeKey = key.replace(/^ebooks[\/\\]/, '');
    const candidates = [
      path.resolve(process.cwd(), 'apps/commerce-service/assets', key),
      path.resolve(process.cwd(), 'apps/commerce-service/assets', relativeKey),
      path.resolve(process.cwd(), 'platform/apps/commerce-service/assets', key),
      path.resolve(process.cwd(), 'platform/apps/commerce-service/assets', relativeKey),
      path.resolve(__dirname, '../../assets', key),
      path.resolve(__dirname, '../../assets', relativeKey),
      path.resolve(process.cwd(), '../web/public/ebooks', relativeKey),
      path.resolve(process.cwd(), 'web/public/ebooks', relativeKey),
    ];
    if (key.includes('con-duong-phia-truoc') || key.includes('Con_duong_phia_truoc')) {
      candidates.push(
        path.resolve(process.cwd(), '../web/public/ebooks/Con_duong_phia_truoc__Bill_Gates.pdf'),
        path.resolve(process.cwd(), 'web/public/ebooks/Con_duong_phia_truoc__Bill_Gates.pdf'),
      );
    }
    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      } catch {
        // ignore fs error
      }
    }
    return null;
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
    const candidatesDirs = [
      path.resolve(process.cwd(), 'apps/commerce-service/assets', path.dirname(key)),
      path.resolve(process.cwd(), 'platform/apps/commerce-service/assets', path.dirname(key)),
      path.resolve(__dirname, '../../assets', path.dirname(key)),
    ];
    for (const d of candidatesDirs) {
      try {
        if (!fs.existsSync(d)) {
          fs.mkdirSync(d, { recursive: true });
        }
        const filePath = path.resolve(d, path.basename(key));
        fs.writeFileSync(filePath, buffer);
      } catch (fsErr) {
        // Continue to next candidate directory
      }
    }

    if (!r2Success) {
      const localCandidates = [
        path.resolve(process.cwd(), 'apps/commerce-service/assets', key),
        path.resolve(process.cwd(), 'platform/apps/commerce-service/assets', key),
        path.resolve(__dirname, '../../assets', key),
      ];
      const hasLocalCopy = localCandidates.some((c) => fs.existsSync(c));
      if (!hasLocalCopy) {
        throw new Error('Ebook upload failed on both R2 cloud storage and local filesystem.');
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!key) return false;
    if (this.findLocalAssetPath(key)) {
      return true;
    }

    const now = Date.now();
    const cached = this.existsCache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    if (!this.hasR2Config) {
      return false;
    }

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.existsCache.set(key, { value: true, expiresAt: now + 60_000 });
      return true;
    } catch (err: any) {
      const notFound = this.isNotFoundError(err);
      if (!notFound) {
        console.warn(`[R2EbookStorage] HeadObject failed for ${key}: ${err?.name || ''} ${err?.message || err}`);
      }
      this.existsCache.set(key, { value: false, expiresAt: now + (notFound ? 30_000 : 5_000) });
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    this.existsCache.delete(key);
    if (this.hasR2Config) {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    }
  }

  async getStream(key: string, range?: string): Promise<EbookStreamResult> {
    if (this.hasR2Config) {
      try {
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
      } catch (err) {
        const localPath = this.findLocalAssetPath(key);
        if (!localPath) throw err;
      }
    }

    const localPath = this.findLocalAssetPath(key);
    if (!localPath) {
      throw new Error(`Ebook file not found for key: ${key}`);
    }

    const stat = fs.statSync(localPath);
    const fileSize = stat.size;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      return {
        stream: fs.createReadStream(localPath, { start, end }),
        contentLength: end - start + 1,
        contentType: 'application/pdf',
        contentRange: `bytes ${start}-${end}/${fileSize}`,
      };
    }

    return {
      stream: fs.createReadStream(localPath),
      contentLength: fileSize,
      contentType: 'application/pdf',
    };
  }
}
