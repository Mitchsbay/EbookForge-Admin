import path from 'path';

export interface StoredImageUploadResult {
  storagePath: string;
  previewUrl?: string;
  storageProvider: 'supabase';
  mimeType: string;
  extension: string;
}

export interface ExportImageData {
  buffer: Buffer;
  base64: string;
  dataUri: string;
  mimeType: string;
  extension: string;
  filename: string;
}

const DEFAULT_BUCKET = 'ebookforge-images';
const DEFAULT_MIME_TYPE = 'image/png';
const DEFAULT_EXTENSION = 'png';

function getSupabaseUrl(): string | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? url.replace(/\/+$/, '') : null;
}

function getServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

function getBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
}

function encodeStoragePath(storagePath: string): string {
  return storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function normaliseStoragePath(storagePath: string): string {
  return storagePath.replace(/^\/+/, '').replace(/\.\./g, '');
}

function getSupabaseConfig() {
  const url = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url,
    serviceRoleKey,
    bucket: getBucketName(),
  };
}

function getAuthHeaders(serviceRoleKey: string): HeadersInit {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(getSupabaseConfig());
}

export function getImageMimeType(image: any): string {
  if (typeof image?.mimeType === 'string' && image.mimeType.startsWith('image/')) {
    return image.mimeType;
  }

  const extensionSources = [image?.extension, image?.storagePath, image?.filename, image?.generatedUrl, image?.previewUrl]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  for (const source of extensionSources) {
    const cleanSource = source.split('?')[0].toLowerCase();
    const extension = cleanSource.includes('.')
      ? cleanSource.split('.').pop()?.replace(/^\./, '')
      : cleanSource.replace(/^\./, '');

    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
    if (extension === 'webp') return 'image/webp';
    if (extension === 'png') return 'image/png';
  }

  return DEFAULT_MIME_TYPE;
}

export function getImageExtension(image: any): string {
  if (typeof image?.extension === 'string' && image.extension.trim()) {
    const extension = image.extension.toLowerCase().replace(/^\./, '');
    if (extension === 'jpeg') return 'jpg';
    if (['png', 'jpg', 'webp'].includes(extension)) return extension;
  }

  const mimeType = getImageMimeType(image);
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  return DEFAULT_EXTENSION;
}

export function getSafeImageId(image: any): string {
  const rawId = String(image?.id || image?.imageId || crypto.randomUUID());
  return rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function getSafeImageFileName(image: any): string {
  return `${getSafeImageId(image)}.${getImageExtension(image)}`;
}

export function buildImageStoragePath(params: {
  projectId?: string;
  chapterId?: string;
  imageId: string;
  extension?: string;
}): string {
  const projectId = (params.projectId || 'default-project').replace(/[^a-zA-Z0-9_-]/g, '_');
  const chapterId = (params.chapterId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
  const imageId = params.imageId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const extension = (params.extension || DEFAULT_EXTENSION).replace(/^\./, '');

  return path.posix.join('projects', projectId, 'chapters', chapterId, `${imageId}.${extension}`);
}

export async function uploadBase64ImageToSupabaseStorage(params: {
  base64Data: string;
  projectId?: string;
  chapterId?: string;
  imageId: string;
  mimeType?: string;
  extension?: string;
}): Promise<StoredImageUploadResult> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase Storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const mimeType = params.mimeType || DEFAULT_MIME_TYPE;
  const extension = params.extension || (mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png');
  const storagePath = buildImageStoragePath({
    projectId: params.projectId,
    chapterId: params.chapterId,
    imageId: params.imageId,
    extension,
  });

  const buffer = Buffer.from(params.base64Data, 'base64');
  const uploadUrl = `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodeStoragePath(storagePath)}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(config.serviceRoleKey),
      'Content-Type': mimeType,
      'Cache-Control': '3600',
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase image upload failed: ${response.status} ${errorText}`);
  }

  let previewUrl: string | undefined;
  try {
    previewUrl = await createSignedImageUrl(storagePath, 60 * 60 * 24);
  } catch (error) {
    console.warn('Could not create Supabase signed image URL:', error);
  }

  return {
    storagePath,
    previewUrl,
    storageProvider: 'supabase',
    mimeType,
    extension,
  };
}

function resolveSupabaseSignedUrl(supabaseUrl: string, signedUrl: string): string {
  if (signedUrl.startsWith('http://') || signedUrl.startsWith('https://')) {
    return signedUrl;
  }

  // Supabase Storage returns relative signed URLs such as:
  // /object/sign/<bucket>/<path>?token=...
  // Browser image tags need the full Storage API prefix:
  // https://project.supabase.co/storage/v1/object/sign/<bucket>/<path>?token=...
  if (signedUrl.startsWith('/storage/v1/')) {
    return `${supabaseUrl}${signedUrl}`;
  }

  if (signedUrl.startsWith('/object/')) {
    return `${supabaseUrl}/storage/v1${signedUrl}`;
  }

  if (signedUrl.startsWith('object/')) {
    return `${supabaseUrl}/storage/v1/${signedUrl}`;
  }

  return `${supabaseUrl}/${signedUrl.replace(/^\/+/, '')}`;
}

export async function createSignedImageUrl(storagePath: string, expiresIn = 60 * 60): Promise<string> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase Storage is not configured.');
  }

  const safePath = normaliseStoragePath(storagePath);
  const signUrl = `${config.url}/storage/v1/object/sign/${encodeURIComponent(config.bucket)}/${encodeStoragePath(safePath)}`;

  const response = await fetch(signUrl, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(config.serviceRoleKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase signed URL failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const signedUrl = data.signedURL || data.signedUrl || data.signed_url;

  if (!signedUrl || typeof signedUrl !== 'string') {
    throw new Error('Supabase did not return a signed URL.');
  }

  return resolveSupabaseSignedUrl(config.url, signedUrl);
}

export async function downloadImageFromSupabaseStorage(storagePath: string): Promise<Buffer> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase Storage is not configured.');
  }

  const safePath = normaliseStoragePath(storagePath);
  const downloadUrl = `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodeStoragePath(safePath)}`;

  const response = await fetch(downloadUrl, {
    method: 'GET',
    headers: getAuthHeaders(config.serviceRoleKey),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase image download failed: ${response.status} ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function deleteImageFromSupabaseStorage(storagePath: string): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase Storage is not configured.');
  }

  const safePath = normaliseStoragePath(storagePath);
  const deleteUrl = `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}`;

  const response = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(config.serviceRoleKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: [safePath] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase image delete failed: ${response.status} ${errorText}`);
  }
}

export async function resolveImageForExport(image: any): Promise<ExportImageData | null> {
  if (!image) return null;

  const mimeType = getImageMimeType(image);
  const extension = getImageExtension(image);
  let buffer: Buffer | null = null;

  if (typeof image.base64Data === 'string' && image.base64Data.trim()) {
    const cleanBase64 = image.base64Data.includes(',')
      ? image.base64Data.split(',').pop() || ''
      : image.base64Data;
    buffer = Buffer.from(cleanBase64, 'base64');
  } else if (typeof image.storagePath === 'string' && image.storagePath.trim()) {
    buffer = await downloadImageFromSupabaseStorage(image.storagePath);
  }

  if (!buffer || buffer.length === 0) {
    return null;
  }

  const base64 = buffer.toString('base64');

  return {
    buffer,
    base64,
    dataUri: `data:${mimeType};base64,${base64}`,
    mimeType,
    extension,
    filename: getSafeImageFileName({ ...image, extension, mimeType }),
  };
}
