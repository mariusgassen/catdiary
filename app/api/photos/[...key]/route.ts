import { NextResponse } from "next/server";
import { getObject } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const objectKey = key.join("/");

  try {
    const object = await getObject(objectKey);
    if (!object.Body) {
      return new NextResponse(null, { status: 404 });
    }

    const headers = new Headers();
    if (object.ContentType) headers.set("Content-Type", object.ContentType);
    if (object.ContentLength) headers.set("Content-Length", String(object.ContentLength));
    headers.set("Cache-Control", "private, max-age=3600");

    return new NextResponse(object.Body.transformToWebStream(), { headers });
  } catch (err: unknown) {
    const code = (err as { Code?: string; name?: string }).Code ?? (err as { name?: string }).name;
    if (code === "NoSuchKey") return new NextResponse(null, { status: 404 });
    throw err;
  }
}
