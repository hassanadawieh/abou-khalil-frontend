"use client";

import { use, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Image,
} from "@mantine/core";
import { IconArrowLeft, IconPrinter } from "@tabler/icons-react";
import api from "@/lib/api";
import type { Invoice, InvoiceType } from "@/types";
import styles from "./page.module.css";

type PrintTemplate = "client" | "warehouse";

function formatMoney(n: number) {
  return Number(n || 0).toFixed(2);
}

function safeText(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function formatInvoiceDate(value: string | Date) {
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

export default function StandalonePrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const invoiceId = Number(id);

  const router = useRouter();
  const searchParams = useSearchParams();

  const template = (searchParams.get("type") as PrintTemplate) || "client";
  const auto = searchParams.get("auto") === "1";

  const printedRef = useRef(false);

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["invoice", invoiceId, "print"],
    queryFn: async () => {
      const { data } = await api.get(`/invoices/${invoiceId}`);
      return data;
    },
    enabled: Number.isFinite(invoiceId) && invoiceId > 0,
  });

  const items = useMemo(() => {
    const list = invoice?.items ?? [];
    return list.map((it) => {
      const raw = it as unknown as Record<string, unknown>;
      const itemType = (raw.item_type as InvoiceType) || invoice?.type;
      return {
        item_type: itemType,
        title: safeText(raw.title) || "-",
        quantity: Number(raw.quantity) || 0,
        place: safeText(raw.place) || "",
        unitPrice: Number(raw.price) || 0,
      };
    });
  }, [invoice]);

  const customerName = invoice?.customer
    ? `${invoice.customer.firstName} ${invoice.customer.lastName}`
    : "-";

  const customerPhone = invoice?.customer
    ? invoice.customer.phoneNumber1 || invoice.customer.phoneNumber2 || "-"
    : "-";

  const customerCity = invoice?.customer ? invoice.customer.city || "-" : "-";

  useEffect(() => {
    if (!auto) return;
    if (isLoading) return;
    if (!invoice) return;
    if (printedRef.current) return;

    printedRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [auto, isLoading, invoice]);

  const setTemplate = (next: PrintTemplate) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("type", next);
    router.replace(`/print/invoices/${invoiceId}?${qs.toString()}`);
  };

  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">رقم فاتورة غير صالح</Text>
      </Center>
    );
  }

  if (isLoading || !invoice) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <>
      <Box className={styles.printPage} p="md">
        <Paper
          withBorder
          shadow="xs"
          radius="md"
          p="md"
          className={styles.noPrint}
        >
          <Group justify="space-between" wrap="wrap">
            <Group>
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => router.push("/dashboard/invoices")}
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

            <SegmentedControl
              value={template}
              onChange={(v) => setTemplate(v as PrintTemplate)}
              data={[
                { label: "فاتورة العميل", value: "client" },
                { label: "كشف تجهيز", value: "warehouse" },
              ]}
            />
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
          <Stack gap="sm">
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
                    {template === "client" ? "فاتورة" : "كشف تجهيز"}
                  </Title>
                  <Text size="sm" c="dimmed" fw={500}>
                    رقم الفاتورة: {invoice.invoice_number}
                  </Text>
                  <Text size="sm" c="dimmed" fw={500}>
                    التاريخ: {formatInvoiceDate(invoice.createdAt)}
                  </Text>
                </div>
              </Group>
            </Group>

            <Divider />

            <Group justify="space-between" wrap="wrap" gap="sm">
              <Text size="sm">
                <b>العميل:</b> {customerName}
              </Text>
              <Text size="sm">
                <b>الهاتف:</b> {customerPhone}
              </Text>
              <Text size="sm">
                <b>المدينة:</b> {customerCity}
              </Text>
            </Group>

            <Divider />

            {template === "client" ? (
              <table className={styles.printTable}>
                <thead>
                  <tr>
                    <th style={{ width: "42%" }}>المنتج</th>
                    <th style={{ width: "10%" }}>الكمية</th>
                    <th style={{ width: "23%" }}>المكان</th>
                    <th style={{ width: "12%" }}>السعر</th>
                    <th style={{ width: "13%" }}>المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={`${idx}-${it.title}`}>
                      <td>{it.title}</td>
                      <td>{it.quantity}</td>
                      <td>{it.place || "-"}</td>
                      <td>${formatMoney(it.unitPrice)}</td>
                      <td>${formatMoney(it.unitPrice * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className={styles.printTable}>
                <thead>
                  <tr>
                    <th style={{ width: "55%" }}>المنتج</th>
                    <th style={{ width: "15%" }}>الكمية</th>
                    <th style={{ width: "30%" }}>المكان</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={`${idx}-${it.title}`}>
                      <td>{it.title}</td>
                      <td>{it.quantity}</td>
                      <td>{it.place || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {template === "client" && (
              <>
                <Divider />
                <Group justify="flex-end" wrap="wrap" gap="xs">
                  <Stack gap={2} style={{ minWidth: 280 }}>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        المجموع الفرعي
                      </Text>
                      <Text size="sm" fw={600}>
                        ${formatMoney(Number(invoice.amount))}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        الخصم
                      </Text>
                      <Text size="sm" fw={600}>
                        ${formatMoney(Number(invoice.discount))}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        سعر التوصيل
                      </Text>
                      <Text size="sm" fw={600}>
                        ${formatMoney(Number(invoice.delivery_price || 0))}
                      </Text>
                    </Group>
                    <Divider my={4} />
                    <Group justify="space-between">
                      <Text size="md" fw={800}>
                        الإجمالي
                      </Text>
                      <Text size="md" fw={800}>
                        ${formatMoney(Number(invoice.total_amount))}
                      </Text>
                    </Group>
                  </Stack>
                </Group>
              </>
            )}

            <Divider className={styles.noPrint} />

            <Text size="xs" c="dimmed" className={styles.noPrint}>
              ملاحظة: يمكنك تغيير نوع الطباعة من الأعلى (فاتورة العميل / كشف
              تجهيز).
            </Text>
          </Stack>
        </Paper>
      </Box>
    </>
  );
}
