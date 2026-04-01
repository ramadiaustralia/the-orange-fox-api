import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const EN_TO_ID: Record<string, string> = {
  "home": "beranda", "about": "tentang", "about us": "tentang kami",
  "services": "layanan", "our services": "layanan kami", "contact": "kontak",
  "contact us": "hubungi kami", "pricing": "harga", "process": "proses",
  "our process": "proses kami", "faq": "pertanyaan umum",
  "frequently asked questions": "pertanyaan yang sering diajukan",
  "get started": "mulai sekarang", "learn more": "pelajari lebih lanjut",
  "read more": "baca selengkapnya", "see more": "lihat selengkapnya",
  "view all": "lihat semua", "submit": "kirim", "send": "kirim",
  "name": "nama", "email": "surel", "phone": "telepon", "message": "pesan",
  "subject": "subjek", "address": "alamat", "company": "perusahaan",
  "website": "situs web", "portfolio": "portofolio", "blog": "blog",
  "team": "tim", "our team": "tim kami", "careers": "karier",
  "privacy policy": "kebijakan privasi", "terms of service": "syarat layanan",
  "terms and conditions": "syarat dan ketentuan",
  "welcome": "selamat datang", "hello": "halo", "thank you": "terima kasih",
  "thanks": "terima kasih", "yes": "ya", "no": "tidak",
  "web design": "desain web", "web development": "pengembangan web",
  "mobile app": "aplikasi seluler", "mobile app development": "pengembangan aplikasi seluler",
  "ui/ux design": "desain ui/ux", "branding": "pencitraan merek",
  "digital marketing": "pemasaran digital", "seo optimization": "optimasi seo",
  "social media": "media sosial", "social media marketing": "pemasaran media sosial",
  "content creation": "pembuatan konten", "graphic design": "desain grafis",
  "e-commerce": "e-commerce", "e-commerce development": "pengembangan e-commerce",
  "custom software": "perangkat lunak kustom",
  "we build digital experiences": "kami membangun pengalaman digital",
  "your vision, our craft": "visi anda, keahlian kami",
  "premium web solutions": "solusi web premium",
  "crafting digital excellence": "menciptakan keunggulan digital",
  "innovative solutions": "solusi inovatif",
  "creative agency": "agensi kreatif", "web agency": "agensi web",
  "digital agency": "agensi digital",
  "discovery": "penemuan", "planning": "perencanaan", "design": "desain",
  "development": "pengembangan", "testing": "pengujian", "launch": "peluncuran",
  "support": "dukungan", "maintenance": "pemeliharaan",
  "starter": "pemula", "professional": "profesional", "enterprise": "perusahaan",
  "basic": "dasar", "premium": "premium", "custom": "kustom",
  "per month": "per bulan", "per year": "per tahun",
  "free consultation": "konsultasi gratis",
  "schedule a call": "jadwalkan panggilan",
  "book a meeting": "pesan pertemuan",
  "our clients": "klien kami", "testimonials": "testimoni",
  "case studies": "studi kasus", "results": "hasil",
  "years of experience": "tahun pengalaman",
  "projects completed": "proyek selesai",
  "happy clients": "klien puas",
  "awards won": "penghargaan diraih",
  "footer": "footer", "header": "header",
  "navigation": "navigasi", "menu": "menu",
  "copyright": "hak cipta", "all rights reserved": "hak cipta dilindungi",
  "follow us": "ikuti kami", "stay connected": "tetap terhubung",
  "newsletter": "buletin", "subscribe": "berlangganan",
  "search": "cari", "filter": "filter", "sort": "urutkan",
  "save": "simpan", "cancel": "batal", "delete": "hapus",
  "edit": "ubah", "update": "perbarui", "create": "buat",
  "back": "kembali", "next": "selanjutnya", "previous": "sebelumnya",
  "loading": "memuat", "error": "kesalahan", "success": "berhasil",
  "warning": "peringatan", "info": "informasi",
};

const ID_TO_EN: Record<string, string> = {};
for (const [en, id] of Object.entries(EN_TO_ID)) {
  ID_TO_EN[id] = en;
}

function translateText(text: string, from: string, to: string): string {
  const dict = from === "en" ? EN_TO_ID : ID_TO_EN;
  const lower = text.toLowerCase().trim();

  // Direct match
  if (dict[lower]) {
    const result = dict[lower];
    if (text[0] === text[0].toUpperCase()) {
      return result.charAt(0).toUpperCase() + result.slice(1);
    }
    return result;
  }

  // Try to translate word by word for longer texts
  let result = text;
  // Sort by length descending so longer phrases match first
  const entries = Object.entries(dict).sort((a, b) => b[0].length - a[0].length);
  for (const [source, target] of entries) {
    const regex = new RegExp(`\\b${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      if (match[0] === match[0].toUpperCase()) {
        return target.charAt(0).toUpperCase() + target.slice(1);
      }
      return target;
    });
  }

  return result;
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

  const translated = translateText(text, from, to);
  return NextResponse.json({ translated });
}
