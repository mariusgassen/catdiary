import { env, AutoProcessor, CLIPVisionModelWithProjection, RawImage } from "@huggingface/transformers";

// Cache downloaded model files on disk so container restarts don't re-download
env.cacheDir = "/tmp/hf-cache";

const MODEL_ID = "Xenova/clip-vit-base-patch32";

// Singletons — loaded once per process, shared across all requests
let processorP: Promise<AutoProcessor> | null = null;
let modelP: Promise<CLIPVisionModelWithProjection> | null = null;

function getProcessor(): Promise<AutoProcessor> {
  processorP ??= AutoProcessor.from_pretrained(MODEL_ID) as Promise<AutoProcessor>;
  return processorP;
}

function getModel(): Promise<CLIPVisionModelWithProjection> {
  modelP ??= CLIPVisionModelWithProjection.from_pretrained(MODEL_ID) as Promise<CLIPVisionModelWithProjection>;
  return modelP;
}

/** Returns a 512-dimensional CLIP embedding for the given image buffer. */
export async function getImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
  const [processor, model] = await Promise.all([getProcessor(), getModel()]);
  const blob = new Blob([imageBuffer]);
  const image = await RawImage.fromBlob(blob);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputs = await (processor as any)(image);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { image_embeds } = await (model as any)(inputs);
  return Array.from(image_embeds.data as Float32Array);
}
