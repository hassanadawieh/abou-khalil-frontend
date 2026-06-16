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
  Badge,
  Textarea,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications as notifs } from "@mantine/notifications";
import { IconPlus, IconTrash, IconSearch } from "@tabler/icons-react";
import api from "@/lib/api";
import type { Notification, CreateNotificationDto } from "@/types";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";

const emptyForm: CreateNotificationDto = {
  title: "",
  message: "",
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpened, { open: openForm, close: closeForm }] =
    useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateNotificationDto>(emptyForm);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await api.get("/notifications");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateNotificationDto) => api.post("/notifications", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      notifs.show({
        title: "نجاح",
        message: "تم إنشاء الإشعار",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifs.show({
        title: "خطأ",
        message: "فشل في إنشاء الإشعار",
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      notifs.show({
        title: "نجاح",
        message: "تم حذف الإشعار",
        color: "green",
      });
      closeDelete();
      setDeletingId(null);
    },
    onError: () => {
      notifs.show({
        title: "خطأ",
        message: "فشل في حذف الإشعار",
        color: "red",
      });
    },
  });

  const handleCloseForm = () => {
    closeForm();
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) {
      notifs.show({
        title: "تحقق",
        message: "يرجى ملء جميع الحقول المطلوبة",
        color: "orange",
      });
      return;
    }
    createMutation.mutate(form);
  };

  const handleOpenDelete = (id: number) => {
    setDeletingId(id);
    openDelete();
  };

  const filtered = notifications.filter((notification) => {
    const q = search.toLowerCase();
    return (
      notification.title.toLowerCase().includes(q) ||
      notification.message.toLowerCase().includes(q)
    );
  });

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>الإشعارات</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={openForm}>
          إرسال إشعار
        </Button>
      </Group>

      <Paper shadow="xs" p="md" radius="md" withBorder>
        <TextInput
          placeholder="البحث عن إشعارات..."
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
                  <Table.Th>الرسالة</Table.Th>
                  <Table.Th>الحالة</Table.Th>
                  <Table.Th>التاريخ</Table.Th>
                  <Table.Th>الإجراءات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed" py="xl">
                        {isLoading ? "جاري التحميل..." : "لا توجد إشعارات"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filtered.map((notification, idx) => (
                    <Table.Tr key={notification.id}>
                      <Table.Td>{idx + 1}</Table.Td>
                      <Table.Td fw={500}>{notification.title}</Table.Td>
                      <Table.Td>{notification.message}</Table.Td>
                      <Table.Td>
                        <Badge
                          color={notification.read ? "gray" : "red"}
                          variant="light"
                        >
                          {notification.read ? "مقروء" : "غير مقروء"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {new Date(notification.createdAt).toLocaleString()}
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleOpenDelete(notification.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Box>
      </Paper>

      {/* Create Modal */}
      <Modal
        opened={formOpened}
        onClose={handleCloseForm}
        title="إرسال إشعار"
        centered
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="العنوان"
              placeholder="عنوان الإشعار..."
              required
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.currentTarget.value })
              }
            />
            <Textarea
              label="الرسالة"
              placeholder="رسالة الإشعار..."
              required
              minRows={3}
              value={form.message}
              onChange={(e) =>
                setForm({ ...form, message: e.currentTarget.value })
              }
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseForm}>
                إلغاء
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                إرسال
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
        message="هل أنت متأكد من حذف هذا الإشعار؟ لا يمكن التراجع عن هذا الإجراء."
      />
    </Box>
  );
}
