import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { CoverStorage, CoverUploadResult } from './storage.interfaces';

@Injectable()
export class CloudinaryCoverStorage implements CoverStorage {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.get<string>('storage.cloudinary.cloudName'),
      api_key: configService.get<string>('storage.cloudinary.apiKey'),
      api_secret: configService.get<string>('storage.cloudinary.apiSecret'),
      secure: true,
    });
  }

  upload(buffer: Buffer, key: string): Promise<CoverUploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: key, resource_type: 'image', overwrite: false },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
          resolve({ url: result.secure_url, key: result.public_id });
        },
      );
      stream.end(buffer);
    });
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key, { resource_type: 'image', invalidate: true });
  }
}
