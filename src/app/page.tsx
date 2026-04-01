"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace("/login"); }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark">
      <div className="animate-pulse-orange w-4 h-4 rounded-full bg-orange" />
    </div>
  );
}
