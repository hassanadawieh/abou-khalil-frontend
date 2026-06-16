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
  Badge,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconEdit, IconTrash, IconSearch } from "@tabler/icons-react";
import api from "@/lib/api";
import type { Supplier, CreateSupplierDto } from "@/types";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";

const emptyForm: CreateSupplierDto = {
  name: "",
  phoneNumber: "",
  amount: 0,
};

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpened, { open: openForm, close: closeForm }] =
    useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateSupplierDto>(emptyForm);

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await api.get("/suppliers");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateSupplierDto) => api.post("/suppliers", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      notifications.show({
        title: "نجاح",
        message: "تم إنشاء المورد",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في إنشاء المورد",
        color: "red",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: number;
      dto: Partial<CreateSupplierDto>;
    }) => api.patch(`/suppliers/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      notifications.show({
        title: "نجاح",
        message: "تم تحديث المورد",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في تحديث المورد",
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      notifications.show({
        title: "نجاح",
        message: "تم حذف المورد",
        color: "green",
      });
      closeDelete();
      setDeletingId(null);
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في حذف المورد",
        color: "red",
      });
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    openForm();
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      phoneNumber: supplier.phoneNumber,
      amount: supplier.amount,
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
    if (!form.name || !form.phoneNumber) {
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

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.phoneNumber.includes(q);
  });

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>الموردين</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={handleOpenCreate}>
          إضافة مورد
        </Button>
      </Group>

      <Paper shadow="xs" p="md" radius="md" withBorder>
        <TextInput
          placeholder="البحث عن موردين..."
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
                  <Table.Th>الاسم</Table.Th>
                  <Table.Th>رقم الهاتف</Table.Th>
                  <Table.Th>المبلغ</Table.Th>
                  <Table.Th>تاريخ الإنشاء</Table.Th>
                  <Table.Th>الإجراءات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed" py="xl">
                        {isLoading ? "جاري التحميل..." : "لا يوجد موردين"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filtered.map((supplier, idx) => (
                    <Table.Tr key={supplier.id}>
                      <Table.Td>{idx + 1}</Table.Td>
                      <Table.Td fw={500}>{supplier.name}</Table.Td>
                      <Table.Td>{supplier.phoneNumber}</Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={Number(supplier.amount) >= 0 ? "green" : "red"}
                        >
                          {Number(supplier.amount).toFixed(2)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {new Date(supplier.createdAt).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleOpenEdit(supplier)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleOpenDelete(supplier.id)}
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
        title={editingId ? "تعديل مورد" : "إضافة مورد"}
        centered
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="الاسم"
              placeholder="شركة التوريدات"
              required
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.currentTarget.value })
              }
            />
            <TextInput
              label="رقم الهاتف"
              placeholder="0123456789"
              required
              value={form.phoneNumber}
              onChange={(e) =>
                setForm({ ...form, phoneNumber: e.currentTarget.value })
              }
            />
            <NumberInput
              label="المبلغ"
              placeholder="0.00"
              decimalScale={2}
              value={form.amount}
              onChange={(val) => setForm({ ...form, amount: Number(val) || 0 })}
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
        message="هل أنت متأكد من حذف هذا المورد؟"
      />
    </Box>
  );
}
