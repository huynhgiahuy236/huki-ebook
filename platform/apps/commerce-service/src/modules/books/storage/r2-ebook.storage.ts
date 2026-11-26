import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { EbookStorage, EbookStreamResult } from './storage.interfaces';

interface R2ClientCandidate {
  label: string;
  endpoint: string;
  endpointHost: string;
  bucket: string;
  forcePathStyle: boolean;
  client: S3Client;
}

function cleanEnv(val?: string | null): string {
  if (!val) return '';
  return String(val)
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function isPlaceholderValue(val: string): boolean {
  if (!val) return true;
  const lower = val.toLowerCase();
  return (
    lower.includes('your-') ||
    lower.includes('placeholder') ||
    lower.includes('example.com') ||
    lower === 'changeme'
  );
}

function normalizeS3Endpoint(raw: string, bucket: string): { endpoint: string; host: string } {
  if (!raw || isPlaceholderValue(raw)) return { endpoint: '', host: '' };
  let candidate = cleanEnv(raw);
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  try {
    const parsed = new URL(candidate);
    // Reject public r2.dev CDN domains as S3 API endpoints (Signature V4 calls fail against r2.dev)
    if (parsed.hostname.endsWith('.r2.dev')) {
      return { endpoint: '', host: '' };
    }
    const cleanPath = parsed.pathname
      .replace(/\/+$/, '')
      .replace(new RegExp(`/${bucket}$`, 'i'), '');
    const normalized = `${parsed.protocol}//${parsed.host}${cleanPath}`;
    return { endpoint: normalized, host: parsed.host };
  } catch {
    return { endpoint: '', host: '' };
  }
}

@Injectable()
export class R2EbookStorage implements EbookStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly hasR2Config: boolean;
  private readonly candidates: R2ClientCandidate[] = [];
  private readonly publicBaseUrls: string[] = [];
  private readonly existsCache = new Map<string, { value: boolean; expiresAt: number }>();
  private activeCandidateIndex = 0;
  private circuitOpenUntil = 0;
  private lastErrorInfo: {
    code?: string;
    name?: string;
    httpStatus?: number;
    message?: string;
    candidate?: string;
    at?: string;
  } | null = null;

  constructor(configService: ConfigService) {
    const cfBucket = cleanEnv(
      configService.get<string>('storage.r2.bucket') || process.env.CLOUDFLARE_R2_BUCKET,
    );
    const r2Bucket = cleanEnv(process.env.R2_BUCKET_NAME);
    this.bucket = cfBucket || r2Bucket || 'huki-ebooks';

    const accountId = cleanEnv(process.env.R2_ACCOUNT_ID);
    const r2DefaultEndpoint =
      accountId && !isPlaceholderValue(accountId)
        ? `https://${accountId}.r2.cloudflarestorage.com`
        : '';

    const cfEndpointRaw = cleanEnv(
      configService.get<string>('storage.r2.endpoint') || process.env.CLOUDFLARE_R2_ENDPOINT,
    );
    const cfKey = cleanEnv(
      configService.get<string>('storage.r2.accessKeyId') || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    );
    const cfSecret = cleanEnv(
      configService.get<string>('storage.r2.secretAccessKey') || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    );

    const r2EndpointRaw = cleanEnv(process.env.R2_ENDPOINT) || r2DefaultEndpoint;
    const r2Key = cleanEnv(process.env.R2_ACCESS_KEY_ID);
    const r2Secret = cleanEnv(process.env.R2_SECRET_ACCESS_KEY);

    const addCandidatePair = (
      baseLabel: string,
      rawEndpoint: string,
      accessKeyId: string,
      secretAccessKey: string,
      bucket: string,
    ) => {
      if (isPlaceholderValue(accessKeyId) || isPlaceholderValue(secretAccessKey)) return;
      const { endpoint, host } = normalizeS3Endpoint(rawEndpoint, bucket);
      const effectiveEndpoint = endpoint || normalizeS3Endpoint(r2DefaultEndpoint, bucket).endpoint;
      const effectiveHost = host || normalizeS3Endpoint(r2DefaultEndpoint, bucket).host;
      if (!effectiveEndpoint) return;

      for (const forcePathStyle of [true, false]) {
        const dup = this.candidates.some(
          (c) =>
            c.endpoint === effectiveEndpoint &&
            c.bucket === bucket &&
            c.forcePathStyle === forcePathStyle &&
            (c.client as any).__keyId === accessKeyId,
        );
        if (dup) continue;
        const client = new S3Client({
          region: 'auto',
          endpoint: effectiveEndpoint,
          forcePathStyle,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
        (client as any).__keyId = accessKeyId;
        this.candidates.push({
          label: `${baseLabel}:${forcePathStyle ? 'path' : 'vhost'}`,
          endpoint: effectiveEndpoint,
          endpointHost: effectiveHost,
          bucket,
          forcePathStyle,
          client,
        });
      }
    };

    addCandidatePair('cf', cfEndpointRaw, cfKey, cfSecret, cfBucket || this.bucket);
    addCandidatePair('r2', r2EndpointRaw, r2Key, r2Secret, r2Bucket || this.bucket);

    for (const domain of [
      cleanEnv(configService.get<string>('storage.r2.publicDomain')),
      cleanEnv(process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN),
      cleanEnv(process.env.R2_PUBLIC_URL),
    ]) {
      if (!domain || isPlaceholderValue(domain)) continue;
      const normalized = (/^https?:\/\//i.test(domain) ? domain : `https://${domain}`).replace(/\/+$/, '');
      if (!this.publicBaseUrls.includes(normalized)) {
        this.publicBaseUrls.push(normalized);
      }
    }

    this.hasR2Config = this.candidates.length > 0 || this.publicBaseUrls.length > 0;
    this.client =
      this.candidates[0]?.client ??
      new S3Client({
        region: 'auto',
        forcePathStyle: true,
        credentials: { accessKeyId: '', secretAccessKey: '' },
      });

    if (!this.hasR2Config) {
      console.warn('[R2EbookStorage] R2 credentials/endpoint are not configured; falling back to local assets only.');
    }
  }

  getDiagnostics(): Record<string, any> {
    return {
      configured: this.hasR2Config,
      bucket: this.bucket,
      candidateCount: this.candidates.length,
      candidateHosts: Array.from(new Set(this.candidates.map((c) => c.endpointHost))),
      publicDomainCount: this.publicBaseUrls.length,
      activeCandidate: this.candidates[this.activeCandidateIndex]?.label || null,
      circuitOpen: Date.now() < this.circuitOpenUntil,
      lastError: this.lastErrorInfo,
    };
  }

  private recordStorageError(err: any, candidateLabel: string) {
    const httpStatus = err?.$metadata?.httpStatusCode;
    const code = err?.Code || err?.code || err?.name;
    this.lastErrorInfo = {
      name: err?.name,
      code: code ? String(code) : undefined,
      httpStatus: typeof httpStatus === 'number' ? httpStatus : undefined,
      message: err?.message ? String(err.message).slice(0, 180) : undefined,
      candidate: candidateLabel,
      at: new Date().toISOString(),
    };
  }

  private isNotFoundError(err: any): boolean {
    const status = err?.$metadata?.httpStatusCode;
    const code = err?.name || err?.Code || err?.code;
    return status === 404 || code === 'NotFound' || code === 'NoSuchKey';
  }

  private orderedCandidates(): Array<{ idx: number; item: R2ClientCandidate }> {
    const list = this.candidates.map((item, idx) => ({ idx, item }));
    if (this.activeCandidateIndex > 0 && this.activeCandidateIndex < list.length) {
      const [active] = list.splice(this.activeCandidateIndex, 1);
      list.unshift(active);
    }
    return list;
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

  private async fetchFromPublicUrl(key: string, range?: string): Promise<EbookStreamResult | null> {
    if (this.publicBaseUrls.length === 0) return null;
    const cleanKey = key.replace(/^\/+/, '');
    for (const base of this.publicBaseUrls) {
      try {
        const res = await fetch(`${base}/${cleanKey}`, {
          headers: range ? { Range: range } : undefined,
          signal: AbortSignal.timeout(8_000),
        });
        if ((res.ok || res.status === 206) && res.body) {
          const contentLengthHeader = res.headers.get('content-length');
          return {
            stream: Readable.fromWeb(res.body as any),
            contentLength: contentLengthHeader ? Number(contentLengthHeader) : undefined,
            contentType: res.headers.get('content-type') || 'application/pdf',
            contentRange: res.headers.get('content-range') || undefined,
          };
        }
      } catch {
        // try next public CDN domain
      }
    }
    return null;
  }

  private async headPublicUrl(key: string): Promise<boolean> {
    if (this.publicBaseUrls.length === 0) return false;
    const cleanKey = key.replace(/^\/+/, '');
    for (const base of this.publicBaseUrls) {
      try {
        const res = await fetch(`${base}/${cleanKey}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(4_000),
        });
        if (res.ok) return true;
      } catch {
        // ignore
      }
    }
    return false;
  }

  async upload(buffer: Buffer, key: string, contentType: string): Promise<void> {
    let r2Success = false;
    for (const { idx, item } of this.orderedCandidates()) {
      try {
        await item.client.send(
          new PutObjectCommand({
            Bucket: item.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
          }),
        );
        this.activeCandidateIndex = idx;
        r2Success = true;
        break;
      } catch (r2Err: any) {
        this.recordStorageError(r2Err, item.label);
        console.warn(`[R2EbookStorage] R2 PutObject (${item.label}) failed: ${r2Err?.message || r2Err}`);
      }
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
      } catch {
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

    if (now < this.circuitOpenUntil) {
      return false;
    }

    let sawNon404Failure = false;
    let sawExplicit404 = false;

    for (const { idx, item } of this.orderedCandidates()) {
      try {
        await item.client.send(
          new HeadObjectCommand({
            Bucket: item.bucket,
            Key: key,
          }),
        );
        this.activeCandidateIndex = idx;
        this.circuitOpenUntil = 0;
        this.existsCache.set(key, { value: true, expiresAt: now + 60_000 });
        return true;
      } catch (err: any) {
        if (this.isNotFoundError(err)) {
          sawExplicit404 = true;
          if (item.forcePathStyle) {
            continue;
          }
          break;
        }
        sawNon404Failure = true;
        this.recordStorageError(err, item.label);
        console.warn(`[R2EbookStorage] HeadObject (${item.label}) failed for ${key}: ${err?.name || ''} ${err?.message || err}`);
      }
    }

    if (await this.headPublicUrl(key)) {
      this.circuitOpenUntil = 0;
      this.existsCache.set(key, { value: true, expiresAt: now + 60_000 });
      return true;
    }

    if (sawNon404Failure && !sawExplicit404) {
      // Open brief 15s circuit breaker to protect /books/:id & Flash Sale catalog lookups
      this.circuitOpenUntil = now + 15_000;
    }
    this.existsCache.set(key, { value: false, expiresAt: now + (sawExplicit404 ? 30_000 : 5_000) });
    return false;
  }

  async delete(key: string): Promise<void> {
    this.existsCache.delete(key);
    for (const { item } of this.orderedCandidates()) {
      try {
        await item.client.send(new DeleteObjectCommand({ Bucket: item.bucket, Key: key }));
        return;
      } catch {
        // try next candidate
      }
    }
  }

  async getStream(key: string, range?: string): Promise<EbookStreamResult> {
    let lastErr: any = null;
    if (this.candidates.length > 0) {
      for (const { idx, item } of this.orderedCandidates()) {
        try {
          const res = await item.client.send(
            new GetObjectCommand({
              Bucket: item.bucket,
              Key: key,
              ...(range ? { Range: range } : {}),
            }),
          );
          this.activeCandidateIndex = idx;
          this.circuitOpenUntil = 0;
          return {
            stream: res.Body,
            contentLength: res.ContentLength,
            contentType: res.ContentType,
            contentRange: res.ContentRange,
          };
        } catch (err: any) {
          lastErr = err;
          if (!this.isNotFoundError(err)) {
            this.recordStorageError(err, item.label);
          }
        }
      }
    }

    const publicStream = await this.fetchFromPublicUrl(key, range);
    if (publicStream) {
      return publicStream;
    }

    const localPath = this.findLocalAssetPath(key);
    if (!localPath) {
      if (lastErr) throw lastErr;
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
