"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Title,
  Group,
  Table,
  TextInput,
  Text,
  Paper,
  LoadingOverlay,
  Box,
  Badge,
  ActionIcon,
  Button,
  Tooltip,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconSearch,
  IconTrash,
  IconEdit,
  IconPlus,
  IconPrinter,
} from "@tabler/icons-react";
import api from "@/lib/api";
import type { Invoice } from "@/types";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";

export default function InvoicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data } = await api.get("/invoices");
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      notifications.show({
        title: "نجاح",
        message: "تم حذف الفاتورة",
        color: "green",
      });
      closeDelete();
      setDeletingId(null);
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في حذف الفاتورة",
        color: "red",
      });
    },
  });

  const handleOpenDelete = (id: number) => {
    setDeletingId(id);
    openDelete();
  };

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.type.toLowerCase().includes(q) ||
      (inv.customer &&
        `${inv.customer.firstName} ${inv.customer.lastName}`
          .toLowerCase()
          .includes(q))
    );
  });

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>الفواتير</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => router.push("/dashboard/invoices/create")}
        >
          إنشاء فاتورة
        </Button>
      </Group>

      <Paper shadow="xs" p="md" radius="md" withBorder>
        <TextInput
          placeholder="البحث عن فواتير..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          mb="md"
        />

        <Box pos="relative" mih={200}>
          <LoadingOverlay visible={isLoading} />
          <ScrollArea offsetScrollbars>
            <Table striped highlightOnHover withTableBorder miw={1100}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>رقم الفاتورة</Table.Th>
                  <Table.Th>العميل</Table.Th>
                  <Table.Th>النوع</Table.Th>
                  <Table.Th>المبلغ</Table.Th>
                  <Table.Th>الخصم</Table.Th>
                  <Table.Th>سعر التوصيل</Table.Th>
                  <Table.Th>الإجمالي</Table.Th>
                  <Table.Th>التاريخ</Table.Th>
                  <Table.Th>الإجراءات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={10}>
                      <Text ta="center" c="dimmed" py="xl">
                        {isLoading ? "جاري التحميل..." : "لا توجد فواتير"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filtered.map((invoice, idx) => (
                    <Table.Tr key={invoice.id}>
                      <Table.Td>{idx + 1}</Table.Td>
                      <Table.Td fw={500}>{invoice.invoice_number}</Table.Td>
                      <Table.Td>
                        {invoice.customer
                          ? `${invoice.customer.firstName} ${invoice.customer.lastName}`
                          : "-"}
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={invoice.type === "ceramic" ? "violet" : "teal"}
                        >
                          {invoice.type}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{Number(invoice.amount).toFixed(2)}</Table.Td>
                      <Table.Td>{Number(invoice.discount).toFixed(2)}</Table.Td>
                      <Table.Td>
                        {Number(invoice.delivery_price || 0).toFixed(2)}
                      </Table.Td>
                      <Table.Td fw={600}>
                        {Number(invoice.total_amount).toFixed(2)}
                      </Table.Td>
                      <Table.Td>
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <Tooltip label="طباعة الفاتورة">
                            <ActionIcon
                              variant="light"
                              color="gray"
                              onClick={() => {
                                window.open(
                                  `/print/invoices/${invoice.id}?type=client&auto=1`,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              }}
                            >
                              <IconPrinter size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="تعديل الفاتورة">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() =>
                                router.push(
                                  `/dashboard/invoices/${invoice.id}/edit`,
                                )
                              }
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="حذف الفاتورة">
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => handleOpenDelete(invoice.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Box>
      </Paper>

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        opened={deleteOpened}
        onClose={() => {
          closeDelete();
          setDeletingId(null);
        }}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        loading={deleteMutation.isPending}
        message="هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء."
      />
    </Box>
  );
}
