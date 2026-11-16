import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No R2 incremental cache: every data-driven route reads MongoDB at request
// time (force-dynamic semantics); static pages are served from worker assets.
export default defineCloudflareConfig({});
