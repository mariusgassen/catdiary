import { randomUUID } from "crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";

const BUCKET = process.env.MINIO_BUCKET ?? "cat-diary-photos";

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? "",
  },
});

const UPLOAD_URL_TTL_SECONDS = 60 * 5;
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;
const THUMBNAIL_WIDTH = 480;

export function generateObjectKey(ownerId: string, extension: string): string {
  return `cat-entries/${ownerId}/${randomUUID()}.${extension}`;
}

export function thumbnailKeyFor(photoKey: string): string {
  return photoKey.replace(/(\.[^./]+)$/, "-thumb$1");
}

export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS }
  );
}

export async function getDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: DOWNLOAD_URL_TTL_SECONDS,
  });
}

/** Generates a thumbnail for an uploaded photo and stores it alongside the original. */
export async function processAndStoreThumbnail(originalBuffer: Buffer, photoKey: string): Promise<string> {
  const thumbKey = thumbnailKeyFor(photoKey);
  const thumbnail = await sharp(originalBuffer)
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: thumbKey,
      Body: thumbnail,
      ContentType: "image/jpeg",
    })
  );

  return thumbKey;
}
