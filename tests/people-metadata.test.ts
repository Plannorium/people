import { describe, expect, it } from "vitest";
import sitemap from "../app/sitemap";
import robots from "../app/robots";
import {pageMetadata,SITE_URL} from "../components/brand/metadata";
describe("private People metadata",()=>{
 it("publishes no staff or auth URLs in the sitemap",()=>{expect(sitemap()).toEqual([]);});
 it("keeps the complete portal excluded from indexing",()=>{expect(robots().rules).toEqual({userAgent:"*",disallow:"/"});});
 it("uses the page's own canonical and new image, always noindex",()=>{
  for(const path of ["/sign-in","/privacy","/me","/verify-admin"]){
   const metadata=pageMetadata(path,"Page","Description");
   expect(metadata.alternates?.canonical).toBe(SITE_URL+path);
   expect(metadata.robots).toEqual({index:false,follow:false});
   expect(metadata.openGraph?.images).toEqual([{url:"/favicon-people-og.png",width:1200,height:630,alt:"Plannorium People — Keystone Bars wordmark on obsidian"}]);
  }
 });
});
