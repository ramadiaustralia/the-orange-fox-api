"use client";
import { Shield } from "lucide-react";
import Link from "next/link";

export default function AccessDenied({ section }: { section?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-[#D4692A]/10 flex items-center justify-center mb-6">
        <Shield size={36} className="text-[#D4692A]" strokeWidth={1.5} />
      </div>
      <h2
        className="text-2xl font-bold text-[#2c2c2c] mb-2"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Access Restricted
      </h2>
      <p className="text-[#999] text-sm max-w-md mb-6">
        You don&apos;t have permission to access{" "}
        {section ? (
          <span className="font-medium text-[#2c2c2c]">{section}</span>
        ) : (
          "this section"
        )}
        . Contact your administrator to request access.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4692A] text-white text-sm font-medium hover:bg-[#c05e25] transition-colors duration-200"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
