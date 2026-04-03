// Content label mappings for the CMS dashboard
// Maps raw content_keys to human-readable labels, descriptions, and input types

export interface PageInfoEntry {
  title: string;
  description: string;
}

export interface SectionInfoEntry {
  title: string;
  description: string;
}

export interface ContentLabelEntry {
  label: string;
  description?: string;
  type: "short" | "long" | "multiline";
}

// ─── Page Info ───────────────────────────────────────────────────────
export const PAGE_INFO: Record<string, PageInfoEntry> = {
  home: {
    title: "🏠 Home",
    description: "Hero section, services overview, and portfolio call-to-action on the landing page",
  },
  about: {
    title: "📖 About",
    description: "Company mission, values, and technology stack shown on the About page",
  },
  services: {
    title: "🛠️ Services",
    description: "Service offerings header and descriptions",
  },
  process: {
    title: "⚙️ Process",
    description: "The 6-phase development process (How We Work page)",
  },
  pricing: {
    title: "💰 Pricing",
    description: "Package names, descriptions, features, and pricing page layout",
  },
  contact: {
    title: "📬 Contact",
    description: "Contact form labels, placeholders, and step descriptions",
  },
  faq: {
    title: "❓ FAQ",
    description: "Frequently asked questions organized by category",
  },
  global: {
    title: "🌐 Global",
    description: "Navigation links, footer text, and site-wide content",
  },
  shop: {
    title: "🛒 Shop",
    description: "Module-based product catalog with names, descriptions, features, prices, and PayPal links",
  },
};

// ─── Section Info ────────────────────────────────────────────────────
export const SECTION_INFO: Record<string, SectionInfoEntry> = {
  // Home
  hero: {
    title: "🦸 Hero Section",
    description: "The main banner area visitors see first — headline, description, and CTA buttons",
  },
  services_overview: {
    title: "🛠️ Services Overview",
    description: "The services grid shown on the home page with 6 service cards",
  },
  portfolio_cta: {
    title: "📢 Call to Action",
    description: "Call-to-action section encouraging visitors to get in touch",
  },

  // About
  about_header: {
    title: "📖 About Header",
    description: "Page title, label, and introductory description",
  },
  about_mission: {
    title: "🎯 Mission & Tech",
    description: "Company mission statement and technology overview",
  },
  about_values: {
    title: "💎 Core Values",
    description: "The four core company values with titles and descriptions",
  },

  // Services
  services_header: {
    title: "🛠️ Services Header",
    description: "Page title and description for the services listing",
  },

  // Process
  process_header: {
    title: "⚙️ Process Header",
    description: "Page title and description for the process/workflow page",
  },
  process_phases: {
    title: "📋 Development Phases",
    description: "The 6 phases of the development process (Discovery → Launch)",
  },

  // Pricing
  pricing_header: {
    title: "💰 Pricing Header",
    description: "Page title, description, and category labels",
  },
  pricing_layout: {
    title: "📐 Pricing Layout",
    description: "Section headings, best value badge, and CTA text",
  },
  pkg_premium_web: {
    title: "🌐 Premium Web Package",
    description: "Name, description, and 7 features for the Premium Web package",
  },
  pkg_exclusive_web: {
    title: "🌐✨ Exclusive Web Package",
    description: "Name, description, and 7 features for the Exclusive Web package",
  },
  pkg_premium_app: {
    title: "📱 Premium App Package",
    description: "Name, description, and 7 features for the Premium App package",
  },
  pkg_exclusive_app: {
    title: "📱✨ Exclusive App Package",
    description: "Name, description, and 7 features for the Exclusive App package",
  },
  pkg_ultimate: {
    title: "🏆 Ultimate Package",
    description: "Name, description, and 7 features for the Ultimate (Web + App) package",
  },

  // Contact
  contact_header: {
    title: "📬 Contact Header",
    description: "Page title, label, and description",
  },
  contact_form: {
    title: "📝 Form Fields",
    description: "Input labels and placeholders for the contact form",
  },
  contact_steps: {
    title: "📍 Contact Steps",
    description: "Step labels and additional info shown alongside the form",
  },

  // FAQ
  faq_header: {
    title: "❓ FAQ Header",
    description: "Page title, description, and category tab labels",
  },
  faq_cta: {
    title: "📢 FAQ Call-to-Action",
    description: "CTA block at the bottom of the FAQ page",
  },
  faq_general: {
    title: "💡 General Questions",
    description: "General questions and answers about the company",
  },
  faq_services: {
    title: "🛠️ Services Questions",
    description: "Questions and answers about offered services",
  },
  faq_process: {
    title: "⚙️ Process Questions",
    description: "Questions and answers about the development process",
  },
  faq_pricing: {
    title: "💰 Pricing Questions",
    description: "Questions and answers about pricing and packages",
  },
  faq_support: {
    title: "🆘 Support Questions",
    description: "Questions and answers about support and maintenance",
  },

  // Global
  navigation: {
    title: "🧭 Navigation",
    description: "Main navigation menu labels used across the website",
  },
  footer: {
    title: "🦶 Footer",
    description: "Footer tagline, copyright text, and navigation labels",
  },

  // Shop
  shop_header: {
    title: "🛒 Shop Header",
    description: "Page title, label, and introductory description for the shop",
  },
  shop_module_1: {
    title: "📄 Module 1 — Landing Page",
    description: "Landing page / add-on page module details",
  },
  shop_module_2: {
    title: "📊 Module 2 — CMS System",
    description: "CMS system module details",
  },
  shop_module_3: {
    title: "🔍 Module 3 — SEO Engine",
    description: "SEO engine module details",
  },
  shop_module_4: {
    title: "📈 Module 4 — Analytics Dashboard",
    description: "Analytics dashboard module details",
  },
  shop_module_5: {
    title: "🔐 Module 5 — Authentication System",
    description: "Authentication system module details",
  },
  shop_module_6: {
    title: "💳 Module 6 — Payment Integration",
    description: "Payment integration module details",
  },
  shop_cta: {
    title: "📢 Shop CTA",
    description: "Call-to-action section at the bottom of the shop page",
  },

  // Social
  social: {
    title: "🔗 Social Links",
    description: "Social media and contact links",
  },
};

// ─── Content Labels ──────────────────────────────────────────────────
export const CONTENT_LABELS: Record<string, ContentLabelEntry> = {
  // ── Home: Hero ──
  hero_badge: { label: "Hero Badge", description: "Small badge text above the headline", type: "short" },
  hero_title: { label: "Hero Title", description: "Main headline on the landing page", type: "short" },
  hero_desc: { label: "Hero Description", description: "Supporting text below the headline", type: "long" },
  hero_cta: { label: "Primary CTA Button", description: "Main call-to-action button text", type: "short" },

  // ── Home: Services Overview ──
  services_label: { label: "Section Label", description: "Small label above the services title", type: "short" },
  services_title: { label: "Section Title", description: "Heading for the services section", type: "short" },
  services_desc: { label: "Section Description", description: "Introductory text for services", type: "long" },
  svc_web_title: { label: "Web Design — Title", type: "short" },
  svc_web_desc: { label: "Web Design — Description", type: "long" },
  svc_domain_title: { label: "Domain & Hosting — Title", type: "short" },
  svc_domain_desc: { label: "Domain & Hosting — Description", type: "long" },
  svc_seo_title: { label: "SEO — Title", type: "short" },
  svc_seo_desc: { label: "SEO — Description", type: "long" },
  svc_admin_title: { label: "Admin Panel — Title", type: "short" },
  svc_admin_desc: { label: "Admin Panel — Description", type: "long" },
  svc_training_title: { label: "Training — Title", type: "short" },
  svc_training_desc: { label: "Training — Description", type: "long" },
  svc_support_title: { label: "Support — Title", type: "short" },
  svc_support_desc: { label: "Support — Description", type: "long" },

  // ── Home: CTA ──
  portfolio_cta: { label: "CTA Section Title", description: "Heading for the CTA section", type: "short" },
  portfolio_cta_btn: { label: "CTA Button Text", type: "short" },
  portfolio_cta_desc: { label: "CTA Section Description", type: "long" },

  // ── About: Header ──
  about_label: { label: "Section Label", type: "short" },
  about_title: { label: "Page Title", type: "short" },
  about_desc: { label: "Page Description", type: "long" },

  // ── About: Mission & Tech ──
  about_mission: { label: "Mission Title", type: "short" },
  about_mission_desc: { label: "Mission Description", type: "multiline" },
  about_values: { label: "Values Section Title", type: "short" },
  about_tech: { label: "Technology Section Title", type: "short" },

  // ── About: Values ──
  value_quality: { label: "Quality — Title", type: "short" },
  value_quality_desc: { label: "Quality — Description", type: "long" },
  value_innovation: { label: "Innovation — Title", type: "short" },
  value_innovation_desc: { label: "Innovation — Description", type: "long" },
  value_transparency: { label: "Transparency — Title", type: "short" },
  value_transparency_desc: { label: "Transparency — Description", type: "long" },
  value_partnership: { label: "Partnership — Title", type: "short" },
  value_partnership_desc: { label: "Partnership — Description", type: "long" },

  // ── Process: Header ──
  process_label: { label: "Section Label", type: "short" },
  process_title: { label: "Page Title", type: "short" },
  process_desc: { label: "Page Description", type: "long" },

  // ── Process: Phases ──
  phase1_title: { label: "Phase 1 — Title", description: "Discovery & Planning", type: "short" },
  phase1_desc: { label: "Phase 1 — Description", type: "long" },
  phase2_title: { label: "Phase 2 — Title", description: "Design", type: "short" },
  phase2_desc: { label: "Phase 2 — Description", type: "long" },
  phase3_title: { label: "Phase 3 — Title", description: "Development", type: "short" },
  phase3_desc: { label: "Phase 3 — Description", type: "long" },
  phase4_title: { label: "Phase 4 — Title", description: "Testing", type: "short" },
  phase4_desc: { label: "Phase 4 — Description", type: "long" },
  phase5_title: { label: "Phase 5 — Title", description: "Launch", type: "short" },
  phase5_desc: { label: "Phase 5 — Description", type: "long" },
  phase6_title: { label: "Phase 6 — Title", description: "Support", type: "short" },
  phase6_desc: { label: "Phase 6 — Description", type: "long" },

  // ── Pricing: Header ──
  pricing_label: { label: "Section Label", type: "short" },
  pricing_title: { label: "Page Title", type: "short" },
  pricing_desc: { label: "Page Description", type: "long" },
  pricing_category_web: { label: "Web Category Tab", type: "short" },
  pricing_category_app: { label: "App Category Tab", type: "short" },
  pricing_category_complete: { label: "Complete Category Tab", type: "short" },

  // ── Pricing: Layout ──
  pricing_web_heading: { label: "Web Section Heading", type: "short" },
  pricing_app_heading: { label: "App Section Heading", type: "short" },
  pricing_best_value: { label: "Best Value Badge", type: "short" },
  pricing_cta: { label: "Pricing CTA Button", type: "short" },
  pricing_phase0_title: { label: "Phase 0 Title", description: "Pre-project phase title", type: "short" },
  pricing_phase0_desc: { label: "Phase 0 Description", type: "long" },

  // ── Pricing: Premium Web ──
  pkg_premium_web: { label: "Package Name", type: "short" },
  pkg_premium_web_price: { label: "Package Price", description: "Price in USD", type: "short" },
  pkg_premium_web_desc: { label: "Package Description", type: "long" },
  pkg_premium_web_f1: { label: "Feature 1", type: "short" },
  pkg_premium_web_f2: { label: "Feature 2", type: "short" },
  pkg_premium_web_f3: { label: "Feature 3", type: "short" },
  pkg_premium_web_f4: { label: "Feature 4", type: "short" },
  pkg_premium_web_f5: { label: "Feature 5", type: "short" },
  pkg_premium_web_f6: { label: "Feature 6", type: "short" },
  pkg_premium_web_f7: { label: "Feature 7", type: "short" },

  // ── Pricing: Exclusive Web ──
  pkg_exclusive_web: { label: "Package Name", type: "short" },
  pkg_exclusive_web_price: { label: "Package Price", description: "Price in USD", type: "short" },
  pkg_exclusive_web_desc: { label: "Package Description", type: "long" },
  pkg_exclusive_web_f1: { label: "Feature 1", type: "short" },
  pkg_exclusive_web_f2: { label: "Feature 2", type: "short" },
  pkg_exclusive_web_f3: { label: "Feature 3", type: "short" },
  pkg_exclusive_web_f4: { label: "Feature 4", type: "short" },
  pkg_exclusive_web_f5: { label: "Feature 5", type: "short" },
  pkg_exclusive_web_f6: { label: "Feature 6", type: "short" },
  pkg_exclusive_web_f7: { label: "Feature 7", type: "short" },

  // ── Pricing: Premium App ──
  pkg_premium_app: { label: "Package Name", type: "short" },
  pkg_premium_app_price: { label: "Package Price", description: "Price in USD", type: "short" },
  pkg_premium_app_desc: { label: "Package Description", type: "long" },
  pkg_premium_app_f1: { label: "Feature 1", type: "short" },
  pkg_premium_app_f2: { label: "Feature 2", type: "short" },
  pkg_premium_app_f3: { label: "Feature 3", type: "short" },
  pkg_premium_app_f4: { label: "Feature 4", type: "short" },
  pkg_premium_app_f5: { label: "Feature 5", type: "short" },
  pkg_premium_app_f6: { label: "Feature 6", type: "short" },
  pkg_premium_app_f7: { label: "Feature 7", type: "short" },

  // ── Pricing: Exclusive App ──
  pkg_exclusive_app: { label: "Package Name", type: "short" },
  pkg_exclusive_app_price: { label: "Package Price", description: "Price in USD", type: "short" },
  pkg_exclusive_app_desc: { label: "Package Description", type: "long" },
  pkg_exclusive_app_f1: { label: "Feature 1", type: "short" },
  pkg_exclusive_app_f2: { label: "Feature 2", type: "short" },
  pkg_exclusive_app_f3: { label: "Feature 3", type: "short" },
  pkg_exclusive_app_f4: { label: "Feature 4", type: "short" },
  pkg_exclusive_app_f5: { label: "Feature 5", type: "short" },
  pkg_exclusive_app_f6: { label: "Feature 6", type: "short" },
  pkg_exclusive_app_f7: { label: "Feature 7", type: "short" },

  // ── Pricing: Ultimate ──
  pkg_ultimate: { label: "Package Name", type: "short" },
  pkg_ultimate_price: { label: "Package Price", description: "Price in USD", type: "short" },
  pkg_ultimate_desc: { label: "Package Description", type: "long" },
  pkg_ultimate_f1: { label: "Feature 1", type: "short" },
  pkg_ultimate_f2: { label: "Feature 2", type: "short" },
  pkg_ultimate_f3: { label: "Feature 3", type: "short" },
  pkg_ultimate_f4: { label: "Feature 4", type: "short" },
  pkg_ultimate_f5: { label: "Feature 5", type: "short" },
  pkg_ultimate_f6: { label: "Feature 6", type: "short" },
  pkg_ultimate_f7: { label: "Feature 7", type: "short" },

  // ── Contact: Header ──
  contact_label: { label: "Section Label", type: "short" },
  contact_title: { label: "Page Title", type: "short" },
  contact_desc: { label: "Page Description", type: "long" },

  // ── Contact: Form Fields ──
  contact_name: { label: "Name Field Label", type: "short" },
  contact_email: { label: "Email Field Label", type: "short" },
  contact_subject: { label: "Subject Field Label", type: "short" },
  contact_message: { label: "Message Field Label", type: "short" },
  contact_package: { label: "Package Selector Label", type: "short" },
  contact_package_placeholder: { label: "Package Placeholder", type: "short" },
  contact_send: { label: "Send Button Text", type: "short" },
  contact_next: { label: "Next Step Button Text", type: "short" },

  // ── Contact: Steps ──
  contact_or_reach: { label: "Or Reach Us Text", type: "short" },
  contact_step1: { label: "Step 1 Label", type: "short" },
  contact_step2: { label: "Step 2 Label", type: "short" },
  contact_step3: { label: "Step 3 Label", type: "short" },
  contact_info: { label: "Contact Info", description: "Additional contact information", type: "long" },

  // ── FAQ: Header & Categories ──
  faq_label: { label: "Section Label", type: "short" },
  faq_title: { label: "Page Title", type: "short" },
  faq_desc: { label: "Page Description", type: "long" },
  faq_cat_general: { label: "General Category Tab", type: "short" },
  faq_cat_services: { label: "Services Category Tab", type: "short" },
  faq_cat_process: { label: "Process Category Tab", type: "short" },
  faq_cat_pricing: { label: "Pricing Category Tab", type: "short" },
  faq_cat_support: { label: "Support Category Tab", type: "short" },

  // ── FAQ: CTA ──
  faq_cta_title: { label: "CTA Title", type: "short" },
  faq_cta_desc: { label: "CTA Description", type: "long" },
  faq_cta_btn: { label: "CTA Button Text", type: "short" },

  // ── FAQ: General ──
  faq_general_1_q: { label: "General Q1 — Question", type: "long" },
  faq_general_1_a: { label: "General Q1 — Answer", type: "multiline" },
  faq_general_2_q: { label: "General Q2 — Question", type: "long" },
  faq_general_2_a: { label: "General Q2 — Answer", type: "multiline" },
  faq_general_3_q: { label: "General Q3 — Question", type: "long" },
  faq_general_3_a: { label: "General Q3 — Answer", type: "multiline" },
  faq_general_4_q: { label: "General Q4 — Question", type: "long" },
  faq_general_4_a: { label: "General Q4 — Answer", type: "multiline" },

  // ── FAQ: Services ──
  faq_services_1_q: { label: "Services Q1 — Question", type: "long" },
  faq_services_1_a: { label: "Services Q1 — Answer", type: "multiline" },
  faq_services_2_q: { label: "Services Q2 — Question", type: "long" },
  faq_services_2_a: { label: "Services Q2 — Answer", type: "multiline" },
  faq_services_3_q: { label: "Services Q3 — Question", type: "long" },
  faq_services_3_a: { label: "Services Q3 — Answer", type: "multiline" },
  faq_services_4_q: { label: "Services Q4 — Question", type: "long" },
  faq_services_4_a: { label: "Services Q4 — Answer", type: "multiline" },
  faq_services_5_q: { label: "Services Q5 — Question", type: "long" },
  faq_services_5_a: { label: "Services Q5 — Answer", type: "multiline" },

  // ── FAQ: Process ──
  faq_process_1_q: { label: "Process Q1 — Question", type: "long" },
  faq_process_1_a: { label: "Process Q1 — Answer", type: "multiline" },
  faq_process_2_q: { label: "Process Q2 — Question", type: "long" },
  faq_process_2_a: { label: "Process Q2 — Answer", type: "multiline" },
  faq_process_3_q: { label: "Process Q3 — Question", type: "long" },
  faq_process_3_a: { label: "Process Q3 — Answer", type: "multiline" },
  faq_process_4_q: { label: "Process Q4 — Question", type: "long" },
  faq_process_4_a: { label: "Process Q4 — Answer", type: "multiline" },

  // ── FAQ: Pricing ──
  faq_pricing_1_q: { label: "Pricing Q1 — Question", type: "long" },
  faq_pricing_1_a: { label: "Pricing Q1 — Answer", type: "multiline" },
  faq_pricing_2_q: { label: "Pricing Q2 — Question", type: "long" },
  faq_pricing_2_a: { label: "Pricing Q2 — Answer", type: "multiline" },
  faq_pricing_3_q: { label: "Pricing Q3 — Question", type: "long" },
  faq_pricing_3_a: { label: "Pricing Q3 — Answer", type: "multiline" },
  faq_pricing_4_q: { label: "Pricing Q4 — Question", type: "long" },
  faq_pricing_4_a: { label: "Pricing Q4 — Answer", type: "multiline" },

  // ── FAQ: Support ──
  faq_support_1_q: { label: "Support Q1 — Question", type: "long" },
  faq_support_1_a: { label: "Support Q1 — Answer", type: "multiline" },
  faq_support_2_q: { label: "Support Q2 — Question", type: "long" },
  faq_support_2_a: { label: "Support Q2 — Answer", type: "multiline" },
  faq_support_3_q: { label: "Support Q3 — Question", type: "long" },
  faq_support_3_a: { label: "Support Q3 — Answer", type: "multiline" },

  // ── Shop: Header ──
  shop_label: { label: "Section Label", description: "Small label above the shop title", type: "short" },
  shop_title: { label: "Page Title", type: "short" },
  shop_desc: { label: "Page Description", type: "long" },

  // ── Shop: Module 1 ──
  shop_module_1_name: { label: "Module Name", type: "short" },
  shop_module_1_desc: { label: "Module Description", type: "long" },
  shop_module_1_f1: { label: "Feature 1", type: "short" },
  shop_module_1_f2: { label: "Feature 2", type: "short" },
  shop_module_1_f3: { label: "Feature 3", type: "short" },
  shop_module_1_f4: { label: "Feature 4", type: "short" },
  shop_module_1_price: { label: "Price", description: "Display price (e.g. $90)", type: "short" },
  shop_module_1_paypal: { label: "PayPal Link", description: "PayPal payment URL", type: "short" },

  // ── Shop: Module 2 ──
  shop_module_2_name: { label: "Module Name", type: "short" },
  shop_module_2_desc: { label: "Module Description", type: "long" },
  shop_module_2_f1: { label: "Feature 1", type: "short" },
  shop_module_2_f2: { label: "Feature 2", type: "short" },
  shop_module_2_f3: { label: "Feature 3", type: "short" },
  shop_module_2_f4: { label: "Feature 4", type: "short" },
  shop_module_2_price: { label: "Price", description: "Display price (e.g. $500)", type: "short" },
  shop_module_2_paypal: { label: "PayPal Link", description: "PayPal payment URL", type: "short" },

  // ── Shop: Module 3 ──
  shop_module_3_name: { label: "Module Name", type: "short" },
  shop_module_3_desc: { label: "Module Description", type: "long" },
  shop_module_3_f1: { label: "Feature 1", type: "short" },
  shop_module_3_f2: { label: "Feature 2", type: "short" },
  shop_module_3_f3: { label: "Feature 3", type: "short" },
  shop_module_3_f4: { label: "Feature 4", type: "short" },
  shop_module_3_price: { label: "Price", description: "Display price (e.g. $300)", type: "short" },
  shop_module_3_paypal: { label: "PayPal Link", description: "PayPal payment URL", type: "short" },

  // ── Shop: Module 4 ──
  shop_module_4_name: { label: "Module Name", type: "short" },
  shop_module_4_desc: { label: "Module Description", type: "long" },
  shop_module_4_f1: { label: "Feature 1", type: "short" },
  shop_module_4_f2: { label: "Feature 2", type: "short" },
  shop_module_4_f3: { label: "Feature 3", type: "short" },
  shop_module_4_price: { label: "Price", description: "Display price (e.g. $200)", type: "short" },
  shop_module_4_paypal: { label: "PayPal Link", description: "PayPal payment URL", type: "short" },

  // ── Shop: Module 5 ──
  shop_module_5_name: { label: "Module Name", type: "short" },
  shop_module_5_desc: { label: "Module Description", type: "long" },
  shop_module_5_f1: { label: "Feature 1", type: "short" },
  shop_module_5_f2: { label: "Feature 2", type: "short" },
  shop_module_5_f3: { label: "Feature 3", type: "short" },
  shop_module_5_price: { label: "Price", description: "Display price (e.g. $160)", type: "short" },
  shop_module_5_paypal: { label: "PayPal Link", description: "PayPal payment URL", type: "short" },

  // ── Shop: Module 6 ──
  shop_module_6_name: { label: "Module Name", type: "short" },
  shop_module_6_desc: { label: "Module Description", type: "long" },
  shop_module_6_f1: { label: "Feature 1", type: "short" },
  shop_module_6_f2: { label: "Feature 2", type: "short" },
  shop_module_6_f3: { label: "Feature 3", type: "short" },
  shop_module_6_price: { label: "Price", description: "Display price (e.g. $200)", type: "short" },
  shop_module_6_paypal: { label: "PayPal Link", description: "PayPal payment URL", type: "short" },

  // ── Shop: CTA ──
  shop_cta_badge: { label: "CTA Badge", description: "Badge text above the CTA title", type: "short" },
  shop_cta_title: { label: "CTA Title", type: "short" },
  shop_cta_desc: { label: "CTA Description", type: "long" },
  shop_cta_pricing_btn: { label: "View Pricing Button", type: "short" },
  shop_cta_contact_btn: { label: "Contact Us Button", type: "short" },

  // ── Global: Navigation ──
  nav_home: { label: "Home Link", type: "short" },
  nav_about: { label: "About Link", type: "short" },
  nav_services: { label: "Services Link", type: "short" },
  nav_what_we_deliver: { label: "What We Deliver Link", type: "short" },
  nav_how_we_work: { label: "How We Work Link", type: "short" },
  nav_pricing: { label: "Pricing Link", type: "short" },
  nav_contact: { label: "Contact Link", type: "short" },
  nav_faq: { label: "FAQ Link", type: "short" },
  nav_framework: { label: "Framework Link", type: "short" },

  // ── Global: Footer ──
  footer_tagline: { label: "Footer Tagline", type: "long" },
  footer_rights: { label: "Copyright Text", type: "short" },
  footer_nav: { label: "Footer Nav Label", type: "short" },
  footer_framework: { label: "Footer Framework Label", type: "short" },
  footer_main: { label: "Footer Main Label", type: "short" },

  // ── Global: Social Links ──
  social_email: { label: "Contact Email", type: "short" },
  social_whatsapp: { label: "WhatsApp Number", type: "short" },
  social_instagram: { label: "Instagram URL", type: "short" },
  social_github: { label: "GitHub URL", type: "short" },
};

// ─── Helper: Group keys into logical sections ────────────────────────
export function getSectionGroup(key: string, _dbSection?: string): string {
  // Home sections
  if (/^hero_/.test(key)) return "hero";
  if (/^svc_/.test(key)) return "services_overview";
  if (/^portfolio_/.test(key)) return "portfolio_cta";

  // About sections
  if (/^about_(label|title|desc)$/.test(key)) return "about_header";
  if (/^about_(mission|values|tech)/.test(key)) return "about_mission";
  if (/^value_/.test(key)) return "about_values";

  // Services
  if (/^services_/.test(key)) return "services_header";

  // Process sections
  if (/^process_/.test(key)) return "process_header";
  if (/^phase\d+_/.test(key)) return "process_phases";

  // Pricing sections
  if (/^pricing_(label|title|desc|category)/.test(key)) return "pricing_header";
  if (/^pricing_(web_heading|app_heading|best_value|cta|phase0)/.test(key)) return "pricing_layout";
  if (/^pkg_premium_web/.test(key)) return "pkg_premium_web";
  if (/^pkg_exclusive_web/.test(key)) return "pkg_exclusive_web";
  if (/^pkg_premium_app/.test(key)) return "pkg_premium_app";
  if (/^pkg_exclusive_app/.test(key)) return "pkg_exclusive_app";
  if (/^pkg_ultimate/.test(key)) return "pkg_ultimate";

  // Contact sections
  if (/^contact_(label|title|desc)$/.test(key)) return "contact_header";
  if (/^contact_(name|email|subject|message|package|send|next)/.test(key)) return "contact_form";
  if (/^contact_(or_reach|step|info)/.test(key)) return "contact_steps";

  // FAQ sections
  if (/^faq_(label|title|desc|cat_)/.test(key)) return "faq_header";
  if (/^faq_cta/.test(key)) return "faq_cta";
  if (/^faq_general_/.test(key)) return "faq_general";
  if (/^faq_services_/.test(key)) return "faq_services";
  if (/^faq_process_/.test(key)) return "faq_process";
  if (/^faq_pricing_/.test(key)) return "faq_pricing";
  if (/^faq_support_/.test(key)) return "faq_support";

  // Shop sections
  if (/^shop_(label|title|desc)$/.test(key)) return "shop_header";
  if (/^shop_module_1/.test(key)) return "shop_module_1";
  if (/^shop_module_2/.test(key)) return "shop_module_2";
  if (/^shop_module_3/.test(key)) return "shop_module_3";
  if (/^shop_module_4/.test(key)) return "shop_module_4";
  if (/^shop_module_5/.test(key)) return "shop_module_5";
  if (/^shop_module_6/.test(key)) return "shop_module_6";
  if (/^shop_cta/.test(key)) return "shop_cta";

  // Global sections
  if (/^social_/.test(key)) return "social";
  if (/^nav_/.test(key)) return "navigation";
  if (/^footer_/.test(key)) return "footer";

  // Fallback to DB section
  return _dbSection || "other";
}

// ─── Helper: Get human label for a key ───────────────────────────────
export function getLabel(key: string): string {
  return CONTENT_LABELS[key]?.label || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Helper: Get input type for a key ────────────────────────────────
export function getType(key: string): "short" | "long" | "multiline" {
  return CONTENT_LABELS[key]?.type || (key.endsWith("_desc") || key.endsWith("_a") ? "long" : "short");
}
