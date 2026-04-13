import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/dashboard", "/settings", "/assignments", "/flashcards", "/notes", "/grades", "/citations", "/timer", "/research", "/essay", "/calendar", "/events", "/discounts", "/feed", "/groups", "/messages", "/modules", "/analytics", "/referrals", "/pricing"],
      },
    ],
    sitemap: "https://study-hq.co.uk/sitemap.xml",
  };
}
