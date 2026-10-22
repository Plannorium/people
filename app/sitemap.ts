import type { MetadataRoute } from "next";
/** No public, indexable routes: keep staff and auth URLs out of search. */
export default function sitemap(): MetadataRoute.Sitemap { return []; }
