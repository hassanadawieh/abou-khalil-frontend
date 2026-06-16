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
import type { CeramicItem, CreateCeramicItemDto, ProductType } from "@/types";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";

const emptyForm: CreateCeramicItemDto = {
  title: "",
  quantity: 0,
  bag: "",
  bag_quantity: 0,
  width: 0,
  height: 0,
  price: 0,
  main_price: 0,
  type_id: undefined,
};

export default function CeramicsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpened, { open: openForm, close: closeForm }] =
    useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateCeramicItemDto>(emptyForm);

  const { data: items = [], isLoading } = useQuery<CeramicItem[]>({
    queryKey: ["ceramic-items"],
    queryFn: async () => {
      const { data } = await api.get("/items/ceramic");
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
    mutationFn: (dto: CreateCeramicItemDto) => api.post("/items/ceramic", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ceramic-items"] });
      notifications.show({
        title: "نجاح",
        message: "تم إنشاء منتج السيراميك",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في إنشاء منتج السيراميك",
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
      dto: Partial<CreateCeramicItemDto>;
    }) => api.patch(`/items/ceramic/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ceramic-items"] });
      notifications.show({
        title: "نجاح",
        message: "تم تحديث منتج السيراميك",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في تحديث منتج السيراميك",
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/items/ceramic/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ceramic-items"] });
      notifications.show({
        title: "نجاح",
        message: "تم حذف منتج السيراميك",
        color: "green",
      });
      closeDelete();
      setDeletingId(null);
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في حذف منتج السيراميك",
        color: "red",
      });
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    openForm();
  };

  const handleOpenEdit = (item: CeramicItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      quantity: item.quantity,
      bag: item.bag,
      bag_quantity: item.bag_quantity,
      width: item.width,
      height: item.height,
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
    if (!form.title || !form.bag) {
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
      item.title.toLowerCase().includes(q) || item.bag.toLowerCase().includes(q)
    );
  });

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>منتجات السيراميك</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={handleOpenCreate}>
          إضافة منتج سيراميك
        </Button>
      </Group>

      <Paper shadow="xs" p="md" radius="md" withBorder>
        <TextInput
          placeholder="البحث عن منتجات السيراميك..."
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
                  <Table.Th>الصندوق</Table.Th>
                  <Table.Th>كمية الصندوق</Table.Th>
                  <Table.Th>العرض</Table.Th>
                  <Table.Th>الارتفاع</Table.Th>
                  <Table.Th>السعر</Table.Th>
                  <Table.Th>سعر التكلفة</Table.Th>
                  <Table.Th>الإجراءات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={10}>
                      <Text ta="center" c="dimmed" py="xl">
                        {isLoading
                          ? "جاري التحميل..."
                          : "لا توجد منتجات سيراميك"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filtered.map((item, idx) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{idx + 1}</Table.Td>
                      <Table.Td fw={500}>{item.title}</Table.Td>
                      <Table.Td>{item.quantity}</Table.Td>
                      <Table.Td>{item.bag}</Table.Td>
                      <Table.Td>{item.bag_quantity}</Table.Td>
                      <Table.Td>{item.width} سم</Table.Td>
                      <Table.Td>{item.height} سم</Table.Td>
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
        title={editingId ? "تعديل منتج سيراميك" : "إضافة منتج سيراميك"}
        centered
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="العنوان"
              placeholder="طبق سيراميك أبيض"
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
                label="الصندوق"
                placeholder="كبير"
                required
                value={form.bag}
                onChange={(e) =>
                  setForm({ ...form, bag: e.currentTarget.value })
                }
              />
              <NumberInput
                label="كمية الصندوق"
                placeholder="0"
                min={0}
                value={form.bag_quantity}
                onChange={(val) =>
                  setForm({ ...form, bag_quantity: Number(val) || 0 })
                }
              />
            </Group>
            <Group grow>
              <NumberInput
                label="العرض (سم)"
                placeholder="0"
                min={0}
                value={form.width}
                onChange={(val) =>
                  setForm({ ...form, width: Number(val) || 0 })
                }
              />
              <NumberInput
                label="الارتفاع (سم)"
                placeholder="0"
                min={0}
                value={form.height}
                onChange={(val) =>
                  setForm({ ...form, height: Number(val) || 0 })
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
