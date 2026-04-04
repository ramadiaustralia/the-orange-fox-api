import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badge = admin.badge || "staff";
  if (badge === "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = req.nextUrl.searchParams.get("url") || "https://the-orange-fox-web.vercel.app";
  const strategy = req.nextUrl.searchParams.get("strategy") || "mobile";
  
  try {
    // Try to get user's Google API key from settings
    let apiKeyParam = "";
    try {
      const { data } = await supabase
        .from("site_content")
        .select("content_value")
        .eq("content_key", "google_api_key")
        .eq("locale", "en")
        .single();
      if (data?.content_value) {
        apiKeyParam = `&key=${data.content_value}`;
      }
    } catch {
      // No API key configured, use free tier
    }
    
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=seo&category=accessibility&category=best-practices${apiKeyParam}`;
    
    const res = await fetch(apiUrl, { next: { revalidate: 3600 } });
    const data = await res.json();
    
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }
    
    const categories = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits || {};
    
    const result = {
      scores: {
        performance: Math.round((categories.performance?.score || 0) * 100),
        seo: Math.round((categories.seo?.score || 0) * 100),
        accessibility: Math.round((categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((categories["best-practices"]?.score || 0) * 100),
      },
      coreWebVitals: {
        lcp: audits["largest-contentful-paint"]?.displayValue || "N/A",
        fid: audits["max-potential-fid"]?.displayValue || "N/A",
        cls: audits["cumulative-layout-shift"]?.displayValue || "N/A",
        fcp: audits["first-contentful-paint"]?.displayValue || "N/A",
        tbt: audits["total-blocking-time"]?.displayValue || "N/A",
        si: audits["speed-index"]?.displayValue || "N/A",
      },
      seoAudits: {
        metaDescription: audits["meta-description"]?.score === 1,
        documentTitle: audits["document-title"]?.score === 1,
        httpStatusCode: audits["http-status-code"]?.score === 1,
        isLinkCrawlable: audits["link-text"]?.score === 1,
        isMobileFriendly: audits["viewport"]?.score === 1,
        robotsTxt: audits["robots-txt"]?.score === 1,
        canonical: audits["canonical"]?.score === 1,
        hreflang: audits["hreflang"]?.score === 1,
        structured: audits["structured-data"]?.score === 1 || audits["structured-data"]?.score === null,
      },
      strategy,
      url,
      fetchedAt: new Date().toISOString(),
      hasApiKey: apiKeyParam !== "",
    };
    
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch PageSpeed data" }, { status: 500 });
  }
}
