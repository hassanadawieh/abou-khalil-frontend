"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  NavLink,
  Divider,
  Text,
  Button,
  Box,
} from "@mantine/core";
import {
  IconDashboard,
  IconUsers,
  IconBriefcase,
  IconTruck,
  IconCube,
  IconHeart,
  IconFileInvoice,
  IconLogout,
  IconTags,
  IconReceipt,
  IconBell,
  IconCreditCard,
  IconScale,
  IconUserCog,
} from "@tabler/icons-react";
import { useAuthStore } from "@/lib/auth-store";
import { isSuperAdminUser } from "@/lib/roles";
import api from "@/lib/api";
import NotificationsBell from "./notifications-bell";

const baseNavItems = [
  { label: "لوحة التحكم", href: "/dashboard", icon: IconDashboard },
  { label: "العملاء", href: "/dashboard/customers", icon: IconUsers },
  { label: "الموظفين", href: "/dashboard/employees", icon: IconBriefcase },
  {
    label: "رواتب الموظفين",
    href: "/dashboard/employee-salaries",
    icon: IconCreditCard,
  },
  { label: "الموردين", href: "/dashboard/suppliers", icon: IconTruck },
  { label: "السيراميك", href: "/dashboard/ceramics", icon: IconCube },
  { label: "المنتجات الصحية", href: "/dashboard/healthy", icon: IconHeart },
  { label: "أنواع المنتجات", href: "/dashboard/product-types", icon: IconTags },
  { label: "المصروفات", href: "/dashboard/expenses", icon: IconReceipt },
  { label: "الإشعارات", href: "/dashboard/notifications", icon: IconBell },
  { label: "الفواتير", href: "/dashboard/invoices", icon: IconFileInvoice },
];

const balanceNavItem = {
  label: "الرصيد",
  href: "/dashboard/balance",
  icon: IconScale,
};

const usersNavItem = {
  label: "المستخدمون",
  href: "/dashboard/users",
  icon: IconUserCog,
};

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const isSuperAdmin = isSuperAdminUser(user);

  const navItems = isSuperAdmin
    ? [...baseNavItems, usersNavItem, balanceNavItem]
    : baseNavItems;

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore errors on logout
    }
    logout();
    router.push("/login");
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  return (
    <Box
      className="sidebar-root"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box p="md" className="sidebar-header">
        <Text size="xl" c="dimmed" ta="center" fw={500} className="sidebar-username">
          {user?.username || "مستخدم"}
        </Text>
        <div style={{ marginTop: 8 }}>
          <NotificationsBell />
        </div>
      </Box>
      <Divider />

      <Box p="xs" className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            label={item.label}
            leftSection={<item.icon size={20} />}
            active={pathname === item.href}
            onClick={() => handleNavClick(item.href)}
            variant="light"
            mb={2}
            className="sidebar-nav-link"
            style={{ borderRadius: 8 }}
          />
        ))}
      </Box>

      <Divider />
      <Box p="md" className="sidebar-footer">
        <Button
          variant="subtle"
          color="red"
          leftSection={<IconLogout size={18} />}
          onClick={() => {
            handleLogout();
            onNavigate?.();
          }}
          fullWidth
          justify="start"
        >
          تسجيل الخروج
        </Button>
      </Box>
    </Box>
  );
}
