"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Title,
  Button,
  Group,
  Table,
  TextInput,
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
import type { ProductType, CreateProductTypeDto } from "@/types";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";

const emptyForm: CreateProductTypeDto = {
  name: "",
  description: "",
};

export default function ProductTypesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpened, { open: openForm, close: closeForm }] =
    useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateProductTypeDto>(emptyForm);

  const { data: productTypes = [], isLoading } = useQuery<ProductType[]>({
    queryKey: ["product-types"],
    queryFn: async () => {
      const { data } = await api.get("/product-types");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateProductTypeDto) => api.post("/product-types", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      notifications.show({
        title: "نجاح",
        message: "تم إنشاء نوع المنتج",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في إنشاء نوع المنتج",
        color: "red",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (dto: CreateProductTypeDto) =>
      api.patch(`/product-types/${editingId}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      notifications.show({
        title: "نجاح",
        message: "تم تحديث نوع المنتج",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في تحديث نوع المنتج",
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/product-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      notifications.show({
        title: "نجاح",
        message: "تم حذف نوع المنتج",
        color: "green",
      });
      closeDelete();
      setDeletingId(null);
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في حذف نوع المنتج",
        color: "red",
      });
    },
  });

  const handleOpenForm = (productType?: ProductType) => {
    if (productType) {
      setEditingId(productType.id);
      setForm({
        name: productType.name,
        description: productType.description || "",
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    openForm();
  };

  const handleCloseForm = () => {
    closeForm();
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleOpenDelete = (id: number) => {
    setDeletingId(id);
    openDelete();
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      notifications.show({
        title: "مطلوب",
        message: "اسم نوع المنتج مطلوب",
        color: "orange",
      });
      return;
    }

    if (editingId) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = productTypes.filter(
    (pt) =>
      pt.name.toLowerCase().includes(search.toLowerCase()) ||
      (pt.description?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>أنواع المنتجات</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => handleOpenForm()}
        >
          إنشاء نوع
        </Button>
      </Group>

      <Paper shadow="xs" p="md" radius="md" withBorder>
        <TextInput
          placeholder="البحث عن أنواع المنتجات..."
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
                  <Table.Th>الوصف</Table.Th>
                  <Table.Th>تاريخ الإنشاء</Table.Th>
                  <Table.Th>الإجراءات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text ta="center" c="dimmed" py="xl">
                        {isLoading ? "جاري التحميل..." : "لا توجد أنواع منتجات"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filtered.map((pt, idx) => (
                    <Table.Tr key={pt.id}>
                      <Table.Td>{idx + 1}</Table.Td>
                      <Table.Td fw={500}>{pt.name}</Table.Td>
                      <Table.Td>{pt.description || "-"}</Table.Td>
                      <Table.Td>
                        {new Date(pt.createdAt).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleOpenForm(pt)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleOpenDelete(pt.id)}
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

      {/* Form Modal */}
      <Modal
        opened={formOpened}
        onClose={handleCloseForm}
        title={editingId ? "تعديل نوع المنتج" : "إنشاء نوع المنتج"}
        centered
      >
        <Stack gap="md">
          <TextInput
            label="اسم نوع المنتج"
            placeholder="مثال: مزهرية، طبق، شاي..."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
          />
          <TextInput
            label="الوصف"
            placeholder="وصف اختياري..."
            value={form.description || ""}
            onChange={(e) =>
              setForm({ ...form, description: e.currentTarget.value })
            }
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={handleCloseForm}>
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "تحديث" : "إنشاء"}
            </Button>
          </Group>
        </Stack>
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
        message="هل أنت متأكد من حذف نوع المنتج هذا؟ لا يمكن التراجع عن هذا الإجراء."
      />
    </Box>
  );
}
