import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EbookStorage } from './storage.interfaces';

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
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
