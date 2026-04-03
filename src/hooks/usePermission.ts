import { useAuth } from "@/context/AuthContext";

/**
 * Check if the current user has access to a dashboard section.
 * Owner always has full access. Workers need explicit permission in can_edit.
 */
export function usePermission(section: string) {
  const { user } = useAuth();

  if (!user) return { hasAccess: false, canEdit: false, isOwner: false, user: null };

  const isOwner = user.role === "owner";
  const canEdit = isOwner || (user.permissions?.can_edit || []).includes(section);

  return { hasAccess: canEdit, canEdit, isOwner, user };
}

/**
 * Map a dashboard path segment to a permission key.
 */
export const SECTION_PERMISSION_MAP: Record<string, string> = {
  content: "content",
  seo: "seo",
  shop: "shop",
  orders: "orders",
  menus: "menus",
  pricing: "pricing",
  contact: "contact",
  "tech-stack": "tech-stack",
  messages: "messages",
  settings: "settings",
};
