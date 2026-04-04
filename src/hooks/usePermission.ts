import { useAuth } from "@/context/AuthContext";

/**
 * Check if the current user has access to a dashboard section.
 * Owner always has full access.
 * Board has access to everything except settings.
 * Manager/Staff need explicit permission in can_edit.
 */
export function usePermission(section: string) {
  const { user } = useAuth();

  if (!user) return { hasAccess: false, canEdit: false, isOwner: false, isBoard: false, isManager: false, isStaff: false, user: null };

  const isOwner = user.badge === "owner";
  const isBoard = user.badge === "board";
  const isManager = user.badge === "manager";
  const isStaff = user.badge === "staff";

  let canEdit: boolean;
  if (isOwner) {
    canEdit = true;
  } else if (isBoard) {
    // Board has access to everything EXCEPT settings
    canEdit = section !== "settings";
  } else {
    // Manager and Staff need explicit can_edit permission
    canEdit = (user.permissions?.can_edit || []).includes(section);
  }

  return { hasAccess: canEdit, canEdit, isOwner, isBoard, isManager, isStaff, user };
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
