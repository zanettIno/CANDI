// Endereços dos serviços usados pelo app.
//
// No monorepo, tudo roda localmente (docker-compose). Os valores podem ser
// sobrescritos pelo arquivo mobile/.env (variáveis EXPO_PUBLIC_*). Veja o README da raiz.
//
// Emulador Android: rode `npm run android:portas` (na raiz do monorepo) para que "localhost" dentro do
// emulador aponte para o computador (adb reverse). Celular físico via Wi-Fi:
// use o IP da máquina na rede (ex.: http://192.168.0.10:3000) no mobile/.env.

const trimSlash = (url: string) => url.replace(/\/+$/, '');

// Backend NestJS (REST + Socket.IO) — antes rodava na EC2
export const API_BASE_URL = trimSlash(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000');

// API de IA (Gemini) — antes era a Function URL da AWS Lambda
export const IA_API_URL = trimSlash(process.env.EXPO_PUBLIC_IA_URL || 'http://localhost:8001');

// Armazenamento de arquivos (LocalS3) — antes era o bucket S3 na AWS
export const S3_PUBLIC_URL = trimSlash(process.env.EXPO_PUBLIC_S3_URL || 'http://localhost:8080');
export const S3_IMAGE_BUCKET = process.env.EXPO_PUBLIC_S3_IMAGE_BUCKET || 'awscandi-image-uploads';

// Fotos de perfil: {S3}/{bucket}/profile-images/{profile_id}.jpg
export const S3_PROFILE_IMAGES_URL = `${S3_PUBLIC_URL}/${S3_IMAGE_BUCKET}/profile-images`;
