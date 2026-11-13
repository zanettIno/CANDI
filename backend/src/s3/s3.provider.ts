// src/s3/s3.provider.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { isLocalS3, localS3ClientOptions } from '../aws/aws-local.config';

@Injectable()
export class S3Provider implements OnModuleInit {
  private readonly logger = new Logger(S3Provider.name);
  public client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_S3_REGION || process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      // LocalS3 (docker-compose) quando S3_ENDPOINT estiver definido
      ...localS3ClientOptions(),
    });
  }

  // Na AWS os buckets já existiam; no S3 local eles são criados no startup,
  // do mesmo jeito que o DynamoBootstrapService faz com as tabelas.
  async onModuleInit() {
    if (!isLocalS3()) return;

    const buckets = [
      process.env.AWS_S3_BUCKET_PROFILE || 'awscandi-image-uploads',
      process.env.AWS_S3_BUCKET_FILE || 'awscandi-file-uploads',
    ];

    for (const Bucket of new Set(buckets)) {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket }));
        this.logger.debug(`   bucket ${Bucket} já existe`);
      } catch {
        try {
          await this.client.send(new CreateBucketCommand({ Bucket }));
          this.logger.log(`✅ Bucket criado no S3 local: ${Bucket}`);
        } catch (err: any) {
          this.logger.error(`❌ Erro ao criar bucket ${Bucket}: ${err?.message}`);
        }
      }
    }
  }
}
