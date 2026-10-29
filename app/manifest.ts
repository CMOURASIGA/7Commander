import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
 return {
  name: "7Commander — Gestão de projetos",
  short_name: "7Commander",
  description: "Gestão de projetos e operações",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#003B73",
  icons: [{src:"/icon",sizes:"192x192",type:"image/png",purpose:"any"}]
 };
}
