import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || "https://the-orange-fox-web.vercel.app";
  const strategy = req.nextUrl.searchParams.get("strategy") || "mobile";
  
  try {
    // Google PageSpeed Insights API is FREE and requires NO API key for basic usage
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=seo&category=accessibility&category=best-practices`;
    
    const res = await fetch(apiUrl, { next: { revalidate: 3600 } }); // Cache for 1 hour
    const data = await res.json();
    
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }
    
    const categories = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits || {};
    
    // Extract Core Web Vitals
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
      strategy,
      url,
      fetchedAt: new Date().toISOString(),
    };
    
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch PageSpeed data" }, { status: 500 });
  }
}
