"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { isSuperAdminUser } from "@/lib/roles";
import {
  SimpleGrid,
  Card,
  Text,
  Title,
  ThemeIcon,
  Group,
  Stack,
  Box,
} from "@mantine/core";
import {
  IconUsers,
  IconBriefcase,
  IconTruck,
  IconCube,
  IconHeart,
  IconFileInvoice,
  IconTags,
  IconReceipt,
  IconBell,
  IconCreditCard,
  IconScale,
  IconUserCog,
} from "@tabler/icons-react";

const baseCards = [
  {
    title: "العملاء",
    description: "إدارة العملاء وجهات الاتصال والأرصدة",
    href: "/dashboard/customers",
    icon: IconUsers,
    color: "blue",
  },
  {
    title: "الموظفين",
    description: "إدارة سجلات الموظفين والرواتب",
    href: "/dashboard/employees",
    icon: IconBriefcase,
    color: "green",
  },
  {
    title: "رواتب الموظفين",
    description: "تتبع وإدارة دفعات الرواتب الشهرية",
    href: "/dashboard/employee-salaries",
    icon: IconCreditCard,
    color: "teal",
  },
  {
    title: "الموردين",
    description: "إدارة معلومات الموردين والأرصدة",
    href: "/dashboard/suppliers",
    icon: IconTruck,
    color: "orange",
  },
  {
    title: "السيراميك",
    description: "إدارة مخزون منتجات السيراميك",
    href: "/dashboard/ceramics",
    icon: IconCube,
    color: "violet",
  },
  {
    title: "المنتجات الصحية",
    description: "إدارة مخزون المنتجات الصحية",
    href: "/dashboard/healthy",
    icon: IconHeart,
    color: "red",
  },
  {
    title: "أنواع المنتجات",
    description: "إدارة أنواع المنتجات والفئات",
    href: "/dashboard/product-types",
    icon: IconTags,
    color: "indigo",
  },
  {
    title: "المصروفات",
    description: "تتبع وإدارة المصروفات",
    href: "/dashboard/expenses",
    icon: IconReceipt,
    color: "pink",
  },
  {
    title: "الإشعارات",
    description: "إرسال وإدارة الإشعارات",
    href: "/dashboard/notifications",
    icon: IconBell,
    color: "orange",
  },
  {
    title: "الفواتير",
    description: "عرض وإدارة جميع الفواتير",
    href: "/dashboard/invoices",
    icon: IconFileInvoice,
    color: "cyan",
  },
];

const balanceCard = {
  title: "الرصيد",
  description: "نظرة عامة مالية وتقارير الرصيد",
  href: "/dashboard/balance",
  icon: IconScale,
  color: "lime",
};

const usersCard = {
  title: "المستخدمون",
  description: "إدارة حسابات المستخدمين والصلاحيات",
  href: "/dashboard/users",
  icon: IconUserCog,
  color: "grape",
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = isSuperAdminUser(user);

  const cards = isSuperAdmin
    ? [...baseCards, usersCard, balanceCard]
    : baseCards;

  return (
    <Box>
      <Title order={2} mb="xs">
        لوحة التحكم
      </Title>
      <Text c="dimmed" mb="xl">
        مرحباً بك في نظام إدارة المستودع
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {cards.map((card) => (
          <Card
            key={card.title}
            shadow="sm"
            padding="xl"
            radius="md"
            withBorder
            style={{
              cursor: "pointer",
              transition: "transform 150ms ease, box-shadow 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "var(--mantine-shadow-md)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "";
            }}
            onClick={() => router.push(card.href)}
          >
            <Group>
              <ThemeIcon
                size={56}
                radius="md"
                variant="light"
                color={card.color}
              >
                <card.icon size={30} />
              </ThemeIcon>
              <Stack gap={4}>
                <Text fw={600} size="lg">
                  {card.title}
                </Text>
                <Text size="sm" c="dimmed">
                  {card.description}
                </Text>
              </Stack>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  );
}
