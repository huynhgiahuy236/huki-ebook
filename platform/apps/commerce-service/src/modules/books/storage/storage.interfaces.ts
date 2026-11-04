export const COVER_STORAGE = Symbol('COVER_STORAGE');
export const EBOOK_STORAGE = Symbol('EBOOK_STORAGE');

export interface CoverUploadResult {
  url: string;
  key: string;
}

export interface CoverStorage {
  upload(buffer: Buffer, key: string): Promise<CoverUploadResult>;
  delete(key: string): Promise<void>;
}

export interface EbookStreamResult {
  stream: any;
  contentLength?: number;
  contentType?: string;
  contentRange?: string;
}

export interface EbookStorage {
  upload(buffer: Buffer, key: string, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  getStream?(key: string, range?: string): Promise<EbookStreamResult>;
}
