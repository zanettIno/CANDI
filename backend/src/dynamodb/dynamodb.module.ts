import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoBootstrapService } from './dynamo-bootstrap.service';
import { localDynamoClientOptions } from '../aws/aws-local.config';

@Module({
  providers: [
    {
      provide: 'DYNAMO_RAW_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new DynamoDBClient({
          region: config.get<string>('AWS_REGION')!,
          credentials: {
            accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID')!,
            secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY')!,
          },
          // DynamoDB Local (docker-compose) quando DYNAMODB_ENDPOINT estiver definido
          ...localDynamoClientOptions(),
        }),
    },
    {
      provide: 'DYNAMO_CLIENT',
      inject: ['DYNAMO_RAW_CLIENT'],
      useFactory: (raw: DynamoDBClient) => DynamoDBDocumentClient.from(raw),
    },
    DynamoBootstrapService,
  ],
  exports: ['DYNAMO_CLIENT', 'DYNAMO_RAW_CLIENT'],
})
export class DynamoDBModule {}
