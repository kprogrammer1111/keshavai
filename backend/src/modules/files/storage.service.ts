import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/**
 * S3-compatible storage service for file uploads.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('app.s3.bucket') ?? 'keshavai';
    this.client = new S3Client({
      endpoint: this.configService.get<string>('app.s3.endpoint'),
      region: this.configService.get<string>('app.s3.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('app.s3.accessKey') ?? '',
        secretAccessKey: this.configService.get<string>('app.s3.secretKey') ?? '',
      },
      forcePathStyle: true,
    });
  }

  /**
   * Upload a file buffer to S3.
   */
  async upload(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder = 'uploads',
  ): Promise<{ key: string; url: string }> {
    const key = `${folder}/${randomUUID()}-${fileName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    const url = await this.getSignedUrl(key);
    return { key, url };
  }

  /**
   * Download file content from S3.
   */
  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const stream = response.Body;
    if (!stream) throw new Error('Empty response body');

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Delete a file from S3.
   */
  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  /**
   * Generate a presigned URL for file access.
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }
}
