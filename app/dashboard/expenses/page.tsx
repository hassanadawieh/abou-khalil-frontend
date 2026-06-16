"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Title,
  Button,
  Group,
  Table,
  TextInput,
  NumberInput,
  Modal,
  Stack,
  ActionIcon,
  Text,
  Paper,
  LoadingOverlay,
  Box,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconEdit, IconTrash, IconSearch } from "@tabler/icons-react";
import api from "@/lib/api";
import type { Expense, CreateExpenseDto } from "@/types";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";

const emptyForm: CreateExpenseDto = {
  title: "",
  price: 0,
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpened, { open: openForm, close: closeForm }] =
    useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateExpenseDto>(emptyForm);

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await api.get("/expenses");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateExpenseDto) => api.post("/expenses", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      notifications.show({
        title: "نجاح",
        message: "تم إنشاء المصروف",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في إنشاء المصروف",
        color: "red",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateExpenseDto> }) =>
      api.patch(`/expenses/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      notifications.show({
        title: "نجاح",
        message: "تم تحديث المصروف",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في تحديث المصروف",
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      notifications.show({
        title: "نجاح",
        message: "تم حذف المصروف",
        color: "green",
      });
      closeDelete();
      setDeletingId(null);
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في حذف المصروف",
        color: "red",
      });
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    openForm();
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({
      title: expense.title,
      price: Number(expense.price),
    });
    openForm();
  };

  const handleCloseForm = () => {
    closeForm();
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      notifications.show({
        title: "تحقق",
        message: "يرجى ملء جميع الحقول المطلوبة",
        color: "orange",
      });
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, dto: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleOpenDelete = (id: number) => {
    setDeletingId(id);
    openDelete();
  };

  const filtered = expenses.filter((expense) => {
    const q = search.toLowerCase();
    return expense.title.toLowerCase().includes(q);
  });

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>المصروفات</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={handleOpenCreate}>
          إضافة مصروف
        </Button>
      </Group>

      <Paper shadow="xs" p="md" radius="md" withBorder>
        <TextInput
          placeholder="البحث عن مصروفات..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          mb="md"
        />

        <Box pos="relative" mih={200}>
          <LoadingOverlay visible={isLoading} />
          <ScrollArea>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>العنوان</Table.Th>
                  <Table.Th>السعر</Table.Th>
                  <Table.Th>تاريخ الإنشاء</Table.Th>
                  <Table.Th>الإجراءات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text ta="center" c="dimmed" py="xl">
                        {isLoading ? "جاري التحميل..." : "لا توجد مصروفات"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filtered.map((expense, idx) => (
                    <Table.Tr key={expense.id}>
                      <Table.Td>{idx + 1}</Table.Td>
                      <Table.Td fw={500}>{expense.title}</Table.Td>
                      <Table.Td>${Number(expense.price).toFixed(2)}</Table.Td>
                      <Table.Td>
                        {new Date(expense.createdAt).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleOpenEdit(expense)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleOpenDelete(expense.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
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

      {/* Create/Edit Modal */}
      <Modal
        opened={formOpened}
        onClose={handleCloseForm}
        title={editingId ? "تعديل مصروف" : "إضافة مصروف"}
        centered
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="العنوان"
              placeholder="لوازم مكتبية، مرافق، إلخ."
              required
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.currentTarget.value })
              }
            />
            <NumberInput
              label="السعر"
              placeholder="0.00"
              decimalScale={2}
              min={0}
              value={form.price}
              onChange={(val) => setForm({ ...form, price: Number(val) || 0 })}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseForm}>
                إلغاء
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? "تحديث" : "إنشاء"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        opened={deleteOpened}
        onClose={() => {
          closeDelete();
          setDeletingId(null);
        }}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        loading={deleteMutation.isPending}
        message="هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء."
      />
    </Box>
  );
}
