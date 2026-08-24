import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from "cloudinary";
import { randomUUID } from "crypto";
import { MessageAttachmentDto } from "./dto/chat.dto";

@Injectable()
export class ChatAttachmentStorage {
  constructor(config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get<string>("storage.cloudinary.cloudName"),
      api_key: config.get<string>("storage.cloudinary.apiKey"),
      api_secret: config.get<string>("storage.cloudinary.apiSecret"),
      secure: true,
    });
  }

  async uploadMany(
    conversationId: string,
    files: Express.Multer.File[] = [],
  ): Promise<MessageAttachmentDto[]> {
    return Promise.all(files.map((file) => this.upload(conversationId, file)));
  }

  private upload(
    conversationId: string,
    file: Express.Multer.File,
  ): Promise<MessageAttachmentDto> {
    const isImage = file.mimetype.startsWith("image/");
    const type = isImage ? "IMAGE" : "FILE";
    if (!file.buffer?.length) {
      throw new BadRequestException("Attachment file is empty");
    }

    return new Promise((resolve, reject) => {
      const publicId = `chat/${conversationId}/${randomUUID()}`;
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: isImage ? "image" : "raw",
          overwrite: false,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error || !result) {
            reject(error ?? new Error("Attachment upload failed"));
            return;
          }
          resolve({
            type,
            url: result.secure_url,
            name: file.originalname,
            size: file.size,
            ...(isImage
              ? {
                  thumbnail: cloudinary.url(result.public_id, {
                    width: 400,
                    height: 400,
                    crop: "limit",
                    secure: true,
                  }),
                }
              : {}),
          });
        },
      );
      stream.end(file.buffer);
    });
  }
}
