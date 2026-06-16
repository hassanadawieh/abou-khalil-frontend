"use client";

import { Modal, Text, Group, Button, Stack } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface ConfirmDeleteModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  message?: string;
}

export default function ConfirmDeleteModal({
  opened,
  onClose,
  onConfirm,
  loading = false,
  title = "تأكيد الحذف",
  message = "هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.",
}: ConfirmDeleteModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Stack gap="md">
        <Group gap="sm">
          <IconAlertTriangle size={24} color="var(--mantine-color-red-6)" />
          <Text size="sm">{message}</Text>
        </Group>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button color="red" onClick={onConfirm} loading={loading}>
            حذف
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
