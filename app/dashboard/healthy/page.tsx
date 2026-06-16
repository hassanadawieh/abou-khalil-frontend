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
  Select,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconEdit, IconTrash, IconSearch } from "@tabler/icons-react";
import api from "@/lib/api";
import type { HealthyItem, CreateHealthyItemDto, ProductType } from "@/types";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";

const emptyForm: CreateHealthyItemDto = {
  title: "",
  quantity: 0,
  color: "",
  price: 0,
  main_price: 0,
  type_id: undefined,
};

export default function HealthyPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpened, { open: openForm, close: closeForm }] =
    useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateHealthyItemDto>(emptyForm);

  const { data: items = [], isLoading } = useQuery<HealthyItem[]>({
    queryKey: ["healthy-items"],
    queryFn: async () => {
      const { data } = await api.get("/items/healthy");
      return data;
    },
  });

  const { data: productTypes = [] } = useQuery<ProductType[]>({
    queryKey: ["product-types"],
    queryFn: async () => {
      const { data } = await api.get("/product-types");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateHealthyItemDto) => api.post("/items/healthy", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healthy-items"] });
      notifications.show({
        title: "نجاح",
        message: "تم إنشاء المنتج الصحي",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في إنشاء المنتج الصحي",
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
      dto: Partial<CreateHealthyItemDto>;
    }) => api.patch(`/items/healthy/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healthy-items"] });
      notifications.show({
        title: "نجاح",
        message: "تم تحديث المنتج الصحي",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في تحديث المنتج الصحي",
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/items/healthy/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healthy-items"] });
      notifications.show({
        title: "نجاح",
        message: "تم حذف المنتج الصحي",
        color: "green",
      });
      closeDelete();
      setDeletingId(null);
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في حذف المنتج الصحي",
        color: "red",
      });
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    openForm();
  };

  const handleOpenEdit = (item: HealthyItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      quantity: item.quantity,
      color: item.color,
      price: Number(item.price),
      main_price: Number(item.main_price),
      type_id: item.type_id,
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
    if (!form.title || !form.color) {
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

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.color.toLowerCase().includes(q)
    );
  });

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>المنتجات الصحية</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={handleOpenCreate}>
          إضافة منتج صحي
        </Button>
      </Group>

      <Paper shadow="xs" p="md" radius="md" withBorder>
        <TextInput
          placeholder="البحث عن المنتجات الصحية..."
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
                  <Table.Th>الكمية</Table.Th>
                  <Table.Th>اللون</Table.Th>
                  <Table.Th>السعر</Table.Th>
                  <Table.Th>سعر التكلفة</Table.Th>
                  <Table.Th>الإجراءات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text ta="center" c="dimmed" py="xl">
                        {isLoading ? "جاري التحميل..." : "لا توجد منتجات صحية"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filtered.map((item, idx) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{idx + 1}</Table.Td>
                      <Table.Td fw={500}>{item.title}</Table.Td>
                      <Table.Td>{item.quantity}</Table.Td>
                      <Table.Td>{item.color}</Table.Td>
                      <Table.Td>{Number(item.price).toFixed(2)}</Table.Td>
                      <Table.Td>{Number(item.main_price).toFixed(2)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleOpenDelete(item.id)}
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
        title={editingId ? "تعديل منتج صحي" : "إضافة منتج صحي"}
        centered
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="العنوان"
              placeholder="شاي أخضر عضوي"
              required
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.currentTarget.value })
              }
            />
            <Group grow>
              <NumberInput
                label="الكمية"
                placeholder="0"
                min={0}
                value={form.quantity}
                onChange={(val) =>
                  setForm({ ...form, quantity: Number(val) || 0 })
                }
              />
              <TextInput
                label="اللون"
                placeholder="أخضر"
                required
                value={form.color}
                onChange={(e) =>
                  setForm({ ...form, color: e.currentTarget.value })
                }
              />
            </Group>
            <Group grow>
              <NumberInput
                label="سعر البيع"
                placeholder="0.00"
                decimalScale={2}
                min={0}
                value={form.price}
                onChange={(val) =>
                  setForm({ ...form, price: Number(val) || 0 })
                }
              />
              <NumberInput
                label="سعر التكلفة"
                placeholder="0.00"
                decimalScale={2}
                min={0}
                value={form.main_price}
                onChange={(val) =>
                  setForm({ ...form, main_price: Number(val) || 0 })
                }
              />
            </Group>
            <Select
              label="نوع المنتج"
              placeholder="اختر نوع المنتج"
              data={productTypes.map((pt) => ({
                value: String(pt.id),
                label: pt.name,
              }))}
              value={form.type_id ? String(form.type_id) : null}
              onChange={(val) =>
                setForm({ ...form, type_id: val ? Number(val) : undefined })
              }
              clearable
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
        message="هل أنت متأكد من حذف هذا المنتج؟"
      />
    </Box>
  );
}
