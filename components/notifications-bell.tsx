"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ActionIcon,
  Badge,
  Popover,
  Stack,
  Text,
  Group,
  Button,
  ScrollArea,
  Divider,
  Center,
  Loader,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBell, IconCheck, IconTrash } from "@tabler/icons-react";
import api from "@/lib/api";
import type { Notification } from "@/types";

export default function NotificationsBell() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);

  const { data: unreadNotifications = [], isLoading } = useQuery<
    Notification[]
  >({
    queryKey: ["notifications-unread"],
    queryFn: async () => {
      const { data } = await api.get("/notifications/unread/count");
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread"],
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.patch("/notifications/mark-all-as-read", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread"],
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread"],
      });
    },
  });

  return (
    <Popover opened={opened} onClose={close} position="bottom-end" withArrow>
      <Popover.Target>
        <ActionIcon
          onClick={opened ? close : open}
          variant="subtle"
          size="lg"
          color={unreadNotifications.length > 0 ? "red" : "gray"}
        >
          <div style={{ position: "relative", display: "inline-block" }}>
            <IconBell size={20} />
            {unreadNotifications.length > 0 && (
              <Badge
                color="red"
                variant="filled"
                size="xs"
                style={{
                  position: "absolute",
                  top: -5,
                  left: -5,
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  fontSize: "10px",
                }}
              >
                {unreadNotifications.length}
              </Badge>
            )}
          </div>
        </ActionIcon>
      </Popover.Target>

      <Popover.Dropdown>
        <div style={{ width: 350 }}>
          <Group justify="space-between" mb="md">
            <Text fw={600}>الإشعارات</Text>
            {unreadNotifications.length > 0 && (
              <Button
                size="xs"
                variant="subtle"
                onClick={() => markAllAsReadMutation.mutate()}
                loading={markAllAsReadMutation.isPending}
              >
                تعيين الكل كمقروء
              </Button>
            )}
          </Group>

          {isLoading ? (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          ) : unreadNotifications.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              لا توجد إشعارات جديدة
            </Text>
          ) : (
            <ScrollArea style={{ height: 400 }}>
              <Stack gap="xs">
                {unreadNotifications.map((notification, idx) => (
                  <div key={notification.id}>
                    {idx > 0 && <Divider size="xs" />}
                    <Group justify="space-between" align="flex-start" p="sm">
                      <div style={{ flex: 1 }}>
                        <Text fw={500} size="sm">
                          {notification.title}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          {notification.message}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          {new Date(notification.createdAt).toLocaleString()}
                        </Text>
                      </div>
                      <Group gap={4}>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="green"
                          onClick={() =>
                            markAsReadMutation.mutate(notification.id)
                          }
                          loading={markAsReadMutation.isPending}
                        >
                          <IconCheck size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() =>
                            deleteNotificationMutation.mutate(notification.id)
                          }
                          loading={deleteNotificationMutation.isPending}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </div>
                ))}
              </Stack>
            </ScrollArea>
          )}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}
