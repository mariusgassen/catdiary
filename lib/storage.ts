import { randomUUID } from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const BUCKET = process.env.MINIO_BUCKET ?? "cat-diary-photos";

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER ?? "",
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "",
  },
});

const THUMBNAIL_WIDTH = 480;

export function generateObjectKey(ownerId: string, extension: string): string {
  return `cat-entries/${ownerId}/${randomUUID()}.${extension}`;
}

export function thumbnailKeyFor(photoKey: string): string {
  return photoKey.replace(/(\.[^./]+)$/, "-thumb$1");
}

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key: string): Promise<GetObjectCommandOutput> {
  return s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function processAndStoreThumbnail(originalBuffer: Buffer, photoKey: string): Promise<string> {
  const thumbKey = thumbnailKeyFor(photoKey);
  const thumbnail = await sharp(originalBuffer)
    .rotate()
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  await uploadObject(thumbKey, thumbnail, "image/jpeg");
  return thumbKey;
}
