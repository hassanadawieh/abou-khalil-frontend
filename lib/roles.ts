import type { User } from "@/types";

const normalizeRoleName = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return (
    value
      .trim()
      .toLowerCase()
      // remove common separators so `super_admin`, `super-admin`, etc match
      .replace(/[\s_-]+/g, "")
  );
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const isSuperAdminUser = (user: User | null | undefined): boolean => {
  if (!user) return false;

  // Backend currently returns `role_id` (snake_case). Frontend types use `roleId`.
  const anyUser = user as unknown as {
    roleId?: unknown;
    role_id?: unknown;
    role?: { id?: unknown; name?: unknown };
    roleName?: unknown;
    role_name?: unknown;
  };

  const roleId =
    toNumberOrNull(anyUser.roleId) ??
    toNumberOrNull(anyUser.role_id) ??
    toNumberOrNull(anyUser.role?.id);

  if (roleId === 2) return true;

  const roleName =
    normalizeRoleName(anyUser.role?.name) ||
    normalizeRoleName(anyUser.roleName) ||
    normalizeRoleName(anyUser.role_name);

  return roleName === "superadmin";
};
