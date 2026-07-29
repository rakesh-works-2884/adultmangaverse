import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#e11d2e",
    icons: [{ src: "/favicon.ico", sizes: "256x256", type: "image/x-icon" }],
  };
}
