import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cat Diary",
    short_name: "Cat Diary",
    description: "Collect cats you've met all around the world. Connect to other cat lovers.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5efe3",
    theme_color: "#b4451f",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
