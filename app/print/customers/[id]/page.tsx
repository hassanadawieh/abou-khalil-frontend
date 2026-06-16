"use client";

import { use, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Center,
  Divider,
  Group,
  Image,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconPrinter } from "@tabler/icons-react";
import api from "@/lib/api";
import type { CustomerHistoryResponse } from "@/types";
import styles from "./page.module.css";

function formatMoney(value: number) {
  return Number(value || 0).toFixed(2);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(value));
}

function getEntryTypeLabel(type: string) {
  switch (type) {
    case "invoice":
      return "فاتورة";
    case "payment":
      return "دفعة";
    case "adjustment":
      return "إضافة مبلغ";
    default:
      return type;
  }
}

export default function CustomerHistoryPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const customerId = Number(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const auto = searchParams.get("auto") === "1";
  const printedRef = useRef(false);

  const { data, isLoading } = useQuery<CustomerHistoryResponse>({
    queryKey: ["customer-history", customerId, "print"],
    queryFn: async () => {
      const response = await api.get(`/customers/${customerId}/history`);
      return response.data;
    },
    enabled: Number.isFinite(customerId) && customerId > 0,
  });

  useEffect(() => {
    if (!auto || isLoading || !data || printedRef.current) {
      return;
    }

    printedRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [auto, data, isLoading]);

  const customer = data?.customer;
  const history = data?.history ?? [];

  if (!Number.isFinite(customerId) || customerId <= 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">رقم عميل غير صالح</Text>
      </Center>
    );
  }

  if (isLoading || !data || !customer) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Box className={styles.printPage} p="md">
      <Paper
        className={styles.noPrint}
        withBorder
        shadow="xs"
        radius="md"
        p="md"
      >
        <Group justify="space-between" wrap="wrap">
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => router.push("/dashboard/customers")}
            >
              رجوع
            </Button>
            <Button
              leftSection={<IconPrinter size={16} />}
              onClick={() => window.print()}
            >
              طباعة
            </Button>
          </Group>
        </Group>
      </Paper>

      <Paper
        withBorder
        shadow="sm"
        radius="md"
        p="lg"
        mt="md"
        className={styles.printCard}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Group gap="md" align="center">
              <Image
                src="/assets/logo-ak.svg"
                alt="Logo"
                h={48}
                w="auto"
                style={{ flexShrink: 0 }}
              />
              <div>
                <Title order={2} mb={8} c="gray.9">
                  كشف حساب العميل
                </Title>
                <Text size="sm" c="dimmed" fw={500}>
                  التاريخ: {formatDate(new Date().toISOString())}
                </Text>
              </div>
            </Group>
          </Group>

          <Divider />

          <SimpleGrid cols={{ base: 1, md: 4 }}>
            <Text size="sm">
              <b>العميل:</b> {customer.firstName} {customer.lastName}
            </Text>
            <Text size="sm">
              <b>الهاتف:</b> {customer.phoneNumber1}
            </Text>
            <Text size="sm">
              <b>المدينة:</b> {customer.city}
            </Text>
            <Text size="sm">
              <b>الرصيد الحالي:</b> {formatMoney(Number(data.current_amount))}
            </Text>
          </SimpleGrid>

          <Divider />

          <table className={styles.printTable}>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>النوع</th>
                <th>رقم الفاتورة</th>
                <th>ملاحظة</th>
                <th>مدين</th>
                <th>دفع</th>
                <th>الرصيد بعد العملية</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7}>لا يوجد سجل لهذا العميل</td>
                </tr>
              ) : (
                history.map((entry) => {
                  const isCredit = Number(entry.amount) < 0;
                  const absoluteAmount = Math.abs(Number(entry.amount));

                  return (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.createdAt)}</td>
                      <td>{getEntryTypeLabel(entry.type)}</td>
                      <td>{entry.invoice_number || "-"}</td>
                      <td>{entry.note || "-"}</td>
                      <td>{isCredit ? "-" : formatMoney(absoluteAmount)}</td>
                      <td>{isCredit ? formatMoney(absoluteAmount) : "-"}</td>
                      <td>{formatMoney(Number(entry.balance_after))}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Stack>
      </Paper>
    </Box>
  );
}
