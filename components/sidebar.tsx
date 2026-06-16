"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  NavLink,
  Divider,
  Text,
  Button,
  Box,
  Title,
  Image,
  Group,
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

export default function Sidebar() {
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

  console.log("testing user:", user);

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box p="md">
        <Text size="xl" c="dimmed" ta="center" fw={500}>
          {user?.username || "مستخدم"}
        </Text>
        <div style={{ marginTop: 8 }}>
          <NotificationsBell />
        </div>
      </Box>
      <Divider />

      <Box p="xs" style={{ flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            label={item.label}
            leftSection={<item.icon size={20} />}
            active={pathname === item.href}
            onClick={() => router.push(item.href)}
            variant="light"
            mb={2}
            style={{ borderRadius: 8 }}
          />
        ))}
      </Box>

      <Divider />
      <Box p="md">
        <Button
          variant="subtle"
          color="red"
          leftSection={<IconLogout size={18} />}
          onClick={handleLogout}
          fullWidth
          justify="start"
        >
          تسجيل الخروج
        </Button>
      </Box>
    </Box>
  );
}
