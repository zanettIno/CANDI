// src/aws/aws-local.config.ts
//
// Configuração centralizada dos clientes AWS.
//
// - Sem as variáveis *_ENDPOINT, os clientes falam com a AWS real (comportamento original).
// - Com DYNAMODB_ENDPOINT / S3_ENDPOINT definidos (ex.: docker-compose do monorepo),
//   os clientes apontam para os emuladores locais (amazon/dynamodb-local e luofuxiang/local-s3).
//
// Obs.: as variáveis são lidas em tempo de execução (funções), e não no import,
// porque o ConfigModule só carrega o .env depois que os módulos são importados.

const clean = (v?: string) =>
  v && v.trim() !== '' ? v.trim().replace(/\/+$/, '') : undefined;

export const dynamoEndpoint = () => clean(process.env.DYNAMODB_ENDPOINT);
export const s3Endpoint = () => clean(process.env.S3_ENDPOINT);
/** URL pela qual o app (emulador/navegador) consegue baixar os arquivos do S3 local. */
export const s3PublicUrl = () => clean(process.env.S3_PUBLIC_URL) ?? s3Endpoint();

export const isLocalS3 = (): boolean => !!s3Endpoint();

/** Credenciais vindas do .env (no modo local qualquer valor serve). */
export function awsCredentials() {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  };
}

/** Opções extras para o DynamoDBClient quando ele aponta para o DynamoDB Local. */
export function localDynamoClientOptions() {
  const endpoint = dynamoEndpoint();
  return endpoint ? { endpoint } : {};
}

/** Opções extras para o S3Client quando ele aponta para o LocalS3. */
export function localS3ClientOptions() {
  const endpoint = s3Endpoint();
  if (!endpoint) return {};
  return {
    endpoint,
    // O LocalS3 trabalha com URLs no formato http://host:porta/bucket/chave
    forcePathStyle: true,
    // Evita o envio de checksums/aws-chunked, desnecessários no emulador
    requestChecksumCalculation: 'WHEN_REQUIRED' as const,
    responseChecksumValidation: 'WHEN_REQUIRED' as const,
  };
}

/**
 * Monta a URL pública de um objeto do S3.
 * - AWS real: https://{bucket}.s3.{region}.amazonaws.com/{key} (formato original)
 * - Local:    {S3_PUBLIC_URL}/{bucket}/{key}
 */
export function s3ObjectUrl(bucket: string, key: string, region?: string): string {
  const publicUrl = s3PublicUrl();
  if (publicUrl) return `${publicUrl}/${bucket}/${key}`;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
