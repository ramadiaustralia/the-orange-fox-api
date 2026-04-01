import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// Common phrase dictionary for instant results on known terms
const PHRASE_DICT: Record<string, Record<string, string>> = {
  "en-id": {
    "home": "Beranda", "about": "Tentang", "about us": "Tentang Kami",
    "services": "Layanan", "our services": "Layanan Kami", "contact": "Kontak",
    "contact us": "Hubungi Kami", "pricing": "Harga", "process": "Proses",
    "faq": "Pertanyaan Umum", "get started": "Mulai Sekarang",
    "learn more": "Pelajari Lebih Lanjut", "read more": "Baca Selengkapnya",
    "submit": "Kirim", "send": "Kirim", "save": "Simpan",
    "cancel": "Batal", "delete": "Hapus", "edit": "Ubah",
    "name": "Nama", "email": "Surel", "phone": "Telepon", "message": "Pesan",
    "subject": "Subjek", "address": "Alamat", "search": "Cari",
  },
  "id-en": {
    "beranda": "Home", "tentang": "About", "tentang kami": "About Us",
    "layanan": "Services", "layanan kami": "Our Services", "kontak": "Contact",
    "hubungi kami": "Contact Us", "harga": "Pricing", "proses": "Process",
    "pertanyaan umum": "FAQ", "mulai sekarang": "Get Started",
    "kirim": "Send", "simpan": "Save", "batal": "Cancel",
    "hapus": "Delete", "ubah": "Edit", "nama": "Name",
    "surel": "Email", "telepon": "Phone", "pesan": "Message",
    "subjek": "Subject", "alamat": "Address", "cari": "Search",
  },
};

async function translateWithMyMemory(text: string, from: string, to: string): Promise<string> {
  const langPair = `${from === "en" ? "en" : "id"}|${to === "en" ? "en" : "id"}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}&de=theorgfox@outlook.com`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    const data = await res.json();
    clearTimeout(timeout);

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      let translated = data.responseData.translatedText;
      // MyMemory sometimes returns ALL CAPS for short text — fix casing
      if (translated === translated.toUpperCase() && translated.length < 100) {
        translated = translated.charAt(0).toUpperCase() + translated.slice(1).toLowerCase();
      }
      return translated;
    }
    return text;
  } catch {
    clearTimeout(timeout);
    return text;
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await verifyToken(token);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, from, to } = await req.json();
  if (!text || !from || !to) {
    return NextResponse.json({ error: "text, from, and to are required" }, { status: 400 });
  }

  // 1. Check phrase dictionary first (instant)
  const dictKey = `${from}-${to}`;
  const dict = PHRASE_DICT[dictKey] || {};
  const lower = text.toLowerCase().trim();
  if (dict[lower]) {
    const result = dict[lower];
    // Preserve original casing
    if (text[0] === text[0].toUpperCase()) {
      return NextResponse.json({ translated: result.charAt(0).toUpperCase() + result.slice(1) });
    }
    return NextResponse.json({ translated: result });
  }

  // 2. Use MyMemory API for real translation (free, no key needed)
  const translated = await translateWithMyMemory(text, from, to);
  return NextResponse.json({ translated });
}
