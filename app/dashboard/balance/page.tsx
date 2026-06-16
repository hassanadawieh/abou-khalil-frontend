"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  Group,
  Stack,
  ThemeIcon,
  Loader,
  Center,
  Paper,
  Badge,
  Divider,
  Button,
  Select,
} from "@mantine/core";
import {
  IconCube,
  IconHeart,
  IconCoin,
  IconReceipt,
  IconFileInvoice,
  IconUsers,
  IconBriefcase,
  IconTrendingUp,
  IconTrendingDown,
  IconShoppingCart,
  IconFilter,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import api from "@/lib/api";
import { BalanceData, Expense, Invoice, EmployeeSalary } from "@/types";
import { useAuthStore } from "@/lib/auth-store";
import { isSuperAdminUser } from "@/lib/roles";

// ── helpers ──────────────────────────────────────────────────────────
function currency(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const CHART_COLORS = [
  "#228be6",
  "#40c057",
  "#fab005",
  "#fa5252",
  "#7950f2",
  "#15aabf",
  "#e64980",
  "#fd7e14",
  "#82c91e",
  "#be4bdb",
  "#20c997",
  "#4c6ef5",
];

// ── component ────────────────────────────────────────────────────────
export default function BalancePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = isSuperAdminUser(user);

  // Simple filter: Year + optional Month (applied via button)
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const y = String(currentYear - i);
        return { value: y, label: y };
      }),
    [currentYear],
  );

  const monthOptions = useMemo(
    () => [
      { value: "", label: "كل الأشهر" },
      ...Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        return { value: String(m), label: `شهر ${m}` };
      }),
    ],
    [],
  );

  const [draftYear, setDraftYear] = useState<string>(String(currentYear));
  const [draftMonth, setDraftMonth] = useState<string>("");
  const [appliedFilter, setAppliedFilter] = useState<{
    year?: number;
    month?: number;
  }>({ year: currentYear });

  const fromDate = useMemo(() => {
    if (!appliedFilter.year) return null;
    const year = appliedFilter.year;
    const month = appliedFilter.month;
    if (!month) return new Date(year, 0, 1, 0, 0, 0, 0);
    return new Date(year, month - 1, 1, 0, 0, 0, 0);
  }, [appliedFilter.year, appliedFilter.month]);

  const toDate = useMemo(() => {
    if (!appliedFilter.year) return null;
    const year = appliedFilter.year;
    const month = appliedFilter.month;
    if (!month) return new Date(year, 11, 31, 23, 59, 59, 999);
    const lastDay = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, lastDay, 23, 59, 59, 999);
  }, [appliedFilter.year, appliedFilter.month]);

  const isInRange = useMemo(() => {
    return (date: Date) => {
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    };
  }, [fromDate, toDate]);

  const shouldBlock = !!user && !isSuperAdmin;

  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [user, isSuperAdmin, router]);

  // 1. Balance API (products prices, ceramics, healthy, sold, customers)
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: [
      "balance",
      appliedFilter.year ?? null,
      appliedFilter.month ?? null,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.set("fromDate", fromDate.toISOString());
      if (toDate) params.set("toDate", toDate.toISOString());
      const url = `/balance/general${params.toString() ? `?${params.toString()}` : ""}`;
      const { data } = await api.get<BalanceData>(url);
      return data;
    },
    enabled: isSuperAdmin,
  });

  // 2. Expenses
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await api.get<Expense[]>("/expenses");
      return data;
    },
    enabled: isSuperAdmin,
  });

  // 3. Invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data } = await api.get<Invoice[]>("/invoices");
      return data;
    },
    enabled: isSuperAdmin,
  });

  // 4. Employee Salaries
  const { data: salaries, isLoading: salariesLoading } = useQuery({
    queryKey: ["employee-salaries"],
    queryFn: async () => {
      const { data } = await api.get<EmployeeSalary[]>("/employee-salaries");
      return data;
    },
    enabled: isSuperAdmin,
  });

  const isLoading =
    isSuperAdmin &&
    (balanceLoading || expensesLoading || invoicesLoading || salariesLoading);

  if (shouldBlock) {
    return (
      <Center h={400}>
        <Text c="dimmed">غير مصرح لك بعرض هذه الصفحة</Text>
      </Center>
    );
  }

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  // ── derived data ───────────────────────────────────────────────────
  const filteredExpenses = (expenses ?? []).filter((e) => {
    const d = new Date(e.createdAt);
    if (Number.isNaN(d.getTime())) return true;
    return isInRange(d);
  });

  const filteredInvoices = (invoices ?? []).filter((inv) => {
    const d = new Date(inv.createdAt);
    if (Number.isNaN(d.getTime())) return true;
    return isInRange(d);
  });

  const filteredSalaries = (salaries ?? []).filter((s) => {
    // Salary entries have (year, month). Filter by that period.
    const d = new Date(Number(s.year), Math.max(0, Number(s.month) - 1), 1);
    if (Number.isNaN(d.getTime())) return true;
    return isInRange(d);
  });

  const totalExpenses = filteredExpenses.reduce(
    (sum, e) => sum + Number(e.price),
    0,
  );

  const totalInvoices = filteredInvoices.length;

  const paidSalaries = filteredSalaries.filter((s) => s.paid);
  const unpaidSalaries = filteredSalaries.filter((s) => !s.paid);

  const employeesPaidAmount = paidSalaries.reduce(
    (sum, s) => sum + Number(s.amount),
    0,
  );
  const employeesUnpaidAmount = unpaidSalaries.reduce(
    (sum, s) => sum + Number(s.amount),
    0,
  );

  // All products prices (ceramics + healthy)
  const allProductsPrice =
    (balance?.ceramics.price ?? 0) + (balance?.healthy.price ?? 0);
  const allProductsMainPrice =
    (balance?.ceramics.main_price ?? 0) + (balance?.healthy.main_price ?? 0);

  // Invoice chart data – group invoices by month
  const invoicesByMonth: Record<string, { ceramic: number; healthy: number }> =
    {};
  for (const inv of filteredInvoices) {
    const d = new Date(inv.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!invoicesByMonth[key])
      invoicesByMonth[key] = { ceramic: 0, healthy: 0 };
    if (inv.type === "ceramic") invoicesByMonth[key].ceramic += 1;
    else invoicesByMonth[key].healthy += 1;
  }

  const invoiceChartData = Object.entries(invoicesByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({
      month,
      السيراميك: counts.ceramic,
      الصحية: counts.healthy,
    }));

  // Pie data for product distribution
  const productPieData = [
    { name: "السيراميك", value: balance?.ceramics.price ?? 0 },
    { name: "الصحية", value: balance?.healthy.price ?? 0 },
  ];

  // ── UI ─────────────────────────────────────────────────────────────
  return (
    <Container size="xl" py="md">
      <Group justify="space-between" align="flex-end" mb="xs" wrap="wrap">
        <div>
          <Title order={2}>نظرة عامة على الرصيد</Title>
          <Text c="dimmed" mt={4}>
            ملخص مالي لجميع الفئات
          </Text>
        </div>

        <Badge variant="light" color="gray" size="lg">
          {appliedFilter.year
            ? appliedFilter.month
              ? `الفترة: ${appliedFilter.year} / ${appliedFilter.month}`
              : `الفترة: ${appliedFilter.year}`
            : "الفترة: كل الوقت"}
        </Badge>
      </Group>

      {/* Year/Month filter */}
      <Paper withBorder radius="md" p="md" mb="lg">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Group gap="sm" wrap="wrap">
            <Text fw={600}>تصفية حسب السنة/الشهر</Text>
            <Text size="sm" c="dimmed">
              (المبيعات/الفواتير/المصروفات/الرواتب)
            </Text>
          </Group>

          <Group gap="sm" wrap="wrap">
            <Select
              label="السنة"
              data={yearOptions}
              value={draftYear}
              onChange={(v) => setDraftYear(v ?? "")}
              w={160}
              searchable
              nothingFoundMessage="لا توجد سنوات"
            />
            <Select
              label="الشهر"
              data={monthOptions}
              value={draftMonth}
              onChange={(v) => setDraftMonth(v ?? "")}
              w={160}
            />
            <Button
              leftSection={<IconFilter size={16} />}
              onClick={() => {
                const y = Number(draftYear);
                const m = Number(draftMonth);
                setAppliedFilter({
                  year: Number.isFinite(y) && y > 0 ? y : undefined,
                  month: draftMonth
                    ? Number.isFinite(m)
                      ? m
                      : undefined
                    : undefined,
                });
              }}
            >
              تطبيق
            </Button>
            <Button
              variant="default"
              leftSection={<IconX size={16} />}
              onClick={() => {
                setDraftYear(String(currentYear));
                setDraftMonth("");
                setAppliedFilter({ year: currentYear });
              }}
            >
              مسح
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* ──── ROW 1 : All products, Ceramics, Healthy ──── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" mb="lg">
        {/* 1 – All Products */}
        <StatCard
          icon={<IconShoppingCart size={28} />}
          color="blue"
          title="جميع المنتجات"
          main={`${currency(allProductsPrice)}`}
          sub={`التكلفة: ${currency(allProductsMainPrice)}`}
          badge={`الربح: ${currency(allProductsPrice - allProductsMainPrice)}`}
          badgeColor="green"
        />

        {/* 2 – Ceramics */}
        <StatCard
          icon={<IconCube size={28} />}
          color="violet"
          title="السيراميك"
          main={`${currency(balance?.ceramics.price ?? 0)}`}
          sub={`التكلفة: ${currency(balance?.ceramics.main_price ?? 0)}`}
          badge={`الربح: ${currency(balance?.ceramics.amount ?? 0)}`}
          badgeColor="green"
        />

        {/* 3 – Healthy Products */}
        <StatCard
          icon={<IconHeart size={28} />}
          color="red"
          title="المنتجات الصحية"
          main={`${currency(balance?.healthy.price ?? 0)}`}
          sub={`التكلفة: ${currency(balance?.healthy.main_price ?? 0)}`}
          badge={`الربح: ${currency(balance?.healthy.amount ?? 0)}`}
          badgeColor="green"
        />
      </SimpleGrid>

      {/* ──── ROW 2 : Sales Ceramics, Sales Healthy, Employees Paid ──── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" mb="lg">
        {/* 5 – Sales Ceramics */}
        <StatCard
          icon={<IconTrendingUp size={28} />}
          color="cyan"
          title="المبيعات – السيراميك"
          main={`${currency(balance?.sold.ceramics.price ?? 0)}`}
          sub={`التكلفة: ${currency(balance?.sold.ceramics.main_price ?? 0)} · الكمية: ${balance?.sold.ceramics.quantity ?? 0}`}
          badge={`الربح: ${currency(balance?.sold.ceramics.amount ?? 0)}`}
          badgeColor="teal"
        />

        {/* 6 – Sales Healthy */}
        <StatCard
          icon={<IconTrendingUp size={28} />}
          color="green"
          title="المبيعات – الصحية"
          main={`${currency(balance?.sold.healthy.price ?? 0)}`}
          sub={`التكلفة: ${currency(balance?.sold.healthy.main_price ?? 0)} · الكمية: ${balance?.sold.healthy.quantity ?? 0}`}
          badge={`الربح: ${currency(balance?.sold.healthy.amount ?? 0)}`}
          badgeColor="teal"
        />

        {/* 4 – Employees Paid Amount */}
        <StatCard
          icon={<IconBriefcase size={28} />}
          color="teal"
          title="الرواتب المدفوعة"
          main={`${currency(employeesPaidAmount)}`}
          sub={`${paidSalaries.length} سجل مدفوع`}
          badge={`غير مدفوع: ${currency(employeesUnpaidAmount)}`}
          badgeColor="orange"
        />
      </SimpleGrid>

      {/* ──── ROW 3 : Expenses, Customers, Unpaid Salaries ──── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" mb="lg">
        {/* 7 – Expenses Total */}
        <StatCard
          icon={<IconReceipt size={28} />}
          color="pink"
          title="إجمالي المصروفات"
          main={`${currency(totalExpenses)}`}
          sub={`${filteredExpenses.length} سجل مصروفات`}
        />

        {/* 9 – Customers Number */}
        <StatCard
          icon={<IconUsers size={28} />}
          color="blue"
          title="العملاء"
          main={`${balance?.number_customer ?? 0}`}
          sub={
            balance?.new_customers
              ? `${balance.new_customers} عميل جديد`
              : "إجمالي العملاء"
          }
        />

        {/* 10 – Unpaid Salaries */}
        <StatCard
          icon={<IconCoin size={28} />}
          color="orange"
          title="الرواتب غير المدفوعة"
          main={`${currency(employeesUnpaidAmount)}`}
          sub={`${unpaidSalaries.length} سجل غير مدفوع`}
          badge={`المدفوع: ${currency(employeesPaidAmount)}`}
          badgeColor="teal"
        />
      </SimpleGrid>

      {/* ──── ROW 4 : Invoices number + Chart ──── */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg" mb="lg">
        {/* 8a – Invoices overview */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Group mb="md">
            <ThemeIcon size={48} radius="md" variant="light" color="cyan">
              <IconFileInvoice size={26} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="sm" c="dimmed">
                إجمالي الفواتير
              </Text>
              <Text fw={700} size="xl">
                {totalInvoices}
              </Text>
            </Stack>
          </Group>
          <Divider mb="md" />

          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">
              فواتير السيراميك
            </Text>
            <Badge color="violet" variant="light">
              {filteredInvoices.filter((i) => i.type === "ceramic").length}
            </Badge>
          </Group>
          <Group justify="space-between" mb="md">
            <Text size="sm" c="dimmed">
              فواتير المنتجات الصحية
            </Text>
            <Badge color="red" variant="light">
              {filteredInvoices.filter((i) => i.type === "healthy").length}
            </Badge>
          </Group>

          {/* Mini pie chart */}
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={productPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {productPieData.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => currency(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* 8b – Invoices Bar Chart by Month */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">
            الفواتير حسب الشهر
          </Text>
          {invoiceChartData.length === 0 ? (
            <Center h={300}>
              <Text c="dimmed">لا توجد بيانات فواتير</Text>
            </Center>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={invoiceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="السيراميك" fill="#7950f2" radius={[4, 4, 0, 0]} />
                <Bar dataKey="الصحية" fill="#fa5252" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </SimpleGrid>

      {/* ──── ROW 5 : Summary banner ──── */}
      <Paper shadow="sm" radius="md" p="xl" withBorder>
        <Group justify="space-between" wrap="wrap">
          <SummaryItem
            label="إجمالي الإيرادات"
            value={currency(
              (balance?.sold.ceramics.price ?? 0) +
                (balance?.sold.healthy.price ?? 0),
            )}
            color="green"
          />
          <SummaryItem
            label="إجمالي الأرباح"
            value={currency(
              (balance?.sold.ceramics.amount ?? 0) +
                (balance?.sold.healthy.amount ?? 0),
            )}
            color="teal"
          />
          <SummaryItem
            label="إجمالي المصروفات"
            value={currency(totalExpenses)}
            color="red"
          />
          <SummaryItem
            label="صافي الربح"
            value={currency(
              (balance?.sold.ceramics.amount ?? 0) +
                (balance?.sold.healthy.amount ?? 0) -
                totalExpenses -
                employeesPaidAmount,
            )}
            color={
              (balance?.sold.ceramics.amount ?? 0) +
                (balance?.sold.healthy.amount ?? 0) -
                totalExpenses -
                employeesPaidAmount >=
              0
                ? "green"
                : "red"
            }
            icon={
              (balance?.sold.ceramics.amount ?? 0) +
                (balance?.sold.healthy.amount ?? 0) -
                totalExpenses -
                employeesPaidAmount >=
              0 ? (
                <IconTrendingUp size={18} />
              ) : (
                <IconTrendingDown size={18} />
              )
            }
          />
        </Group>
      </Paper>
    </Container>
  );
}

// ── Reusable stat card ──────────────────────────────────────────────
function StatCard({
  icon,
  color,
  title,
  main,
  sub,
  badge,
  badgeColor,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  main: string;
  sub: string;
  badge?: string;
  badgeColor?: string;
}) {
  const accentMap: Record<string, string> = {
    blue: "var(--mantine-color-blue-6)",
    violet: "var(--mantine-color-violet-6)",
    red: "var(--mantine-color-red-6)",
    cyan: "var(--mantine-color-cyan-6)",
    green: "var(--mantine-color-green-6)",
    teal: "var(--mantine-color-teal-6)",
    pink: "var(--mantine-color-pink-6)",
    orange: "var(--mantine-color-orange-6)",
    lime: "var(--mantine-color-lime-6)",
    gray: "var(--mantine-color-gray-6)",
  };

  const accent = accentMap[color] ?? "var(--mantine-color-blue-6)";
  console.log("testing for the badge color:", badgeColor);
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        borderInlineStart: `4px solid ${accent}`,
        background:
          "linear-gradient(180deg, var(--mantine-color-gray-0) 0%, var(--mantine-color-gray-0) 60%, rgba(0,0,0,0.01) 100%)",
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <ThemeIcon size={44} radius="md" variant="light" color={color}>
            {icon}
          </ThemeIcon>
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
              {title}
            </Text>
            <Text fw={800} size="xl" style={{ lineHeight: 1.2 }}>
              {main}
            </Text>
            <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }} mt={4}>
              {sub}
            </Text>
          </Stack>
        </Group>

        {badge && (
          //   <Badge
          //     variant="light"
          //     color={badgeColor ?? "gray"}
          //     size="xl"
          //     styles={{
          //       root: {
          //         whiteSpace: "nowrap",
          //         paddingInline: 12,
          //         paddingBlock: 8,
          //         height: "auto",
          //       },
          //       label: {
          //         lineHeight: 1.45,
          //         fontSize: 13,
          //         fontWeight: 700,
          //       },
          //     }}
          //   >
          //     {badge}
          //   </Badge>
          <div
            className={`flex items-center text-sm p-2 rounded-md font-bold text-white`}
            style={{ background: badgeColor || "green" }}
          >
            <p>{badge}</p>
          </div>
        )}
      </Group>
    </Card>
  );
}

// ── Summary row item ────────────────────────────────────────────────
function SummaryItem({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <Stack gap={0} align="center" style={{ minWidth: 140 }}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Group gap={4}>
        {icon}
        <Text fw={700} size="lg" c={color}>
          {value}
        </Text>
      </Group>
    </Stack>
  );
}
