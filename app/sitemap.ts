import type { MetadataRoute } from "next";
import { listClinics, listDoctors } from "@/lib/network";

export const revalidate = 3600;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dentaldesk.uz";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [doctors, clinics] = await Promise.all([listDoctors({}), listClinics()]);
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/shifokorlar`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/klinikalar`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/klinika-uchun`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...staticPages,
    ...doctors.map((doctor) => ({
      url: `${siteUrl}/shifokorlar/${doctor.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...clinics.map((clinic) => ({
      url: `${siteUrl}/klinikalar/${clinic.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
