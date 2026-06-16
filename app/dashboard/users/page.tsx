"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  PasswordInput,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { isSuperAdminUser } from "@/lib/roles";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";

// Backend shapes
interface ApiRole {
  id: number;
  name: string;
  description?: string;
}

interface ApiUser {
  id: number;
  username: string;
  phoneNumber: string;
  role_id: number;
  role?: ApiRole;
  createdAt: string;
  updatedAt: string;
}

type CreateUserPayload = {
  username: string;
  phoneNumber: string;
  password: string;
  role_id: number;
};

type UpdateUserPayload = Partial<CreateUserPayload>;

const roleLabelAr = (roleName: string) => {
  const normalized = roleName.trim().toLowerCase();
  if (normalized === "superadmin" || normalized === "superAdmin".toLowerCase())
    return "سوبر أدمن";
  if (normalized === "admin") return "أدمن";
  if (normalized === "employee") return "موظف";
  return roleName;
};

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const authUser = useAuthStore((s) => s.user);
  const isSuperAdmin = isSuperAdminUser(authUser);
  const shouldBlock = !!authUser && !isSuperAdmin;

  useEffect(() => {
    if (shouldBlock) router.replace("/dashboard");
  }, [shouldBlock, router]);

  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiUser | null>(null);

  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<ApiUser | null>(null);

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data } = await api.get<ApiRole[]>("/roles");
      return data;
    },
    enabled: isSuperAdmin,
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await api.get<ApiUser[]>("/users");
      return data;
    },
    enabled: isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const { data } = await api.post<ApiUser>("/users", payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      notifications.show({
        title: "تم الإنشاء",
        message: "تم إنشاء المستخدم بنجاح",
        color: "green",
      });
      closeForm();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      notifications.show({
        title: "فشل الإنشاء",
        message: e.response?.data?.message || "تعذر إنشاء المستخدم",
        color: "red",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateUserPayload;
    }) => {
      const { data } = await api.patch<ApiUser>(`/users/${id}`, payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      notifications.show({
        title: "تم التحديث",
        message: "تم تحديث المستخدم بنجاح",
        color: "green",
      });
      closeForm();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      notifications.show({
        title: "فشل التحديث",
        message: e.response?.data?.message || "تعذر تحديث المستخدم",
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(`/users/${id}`);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      notifications.show({
        title: "تم الحذف",
        message: "تم حذف المستخدم بنجاح",
        color: "green",
      });
      setDeleteOpen(false);
      setDeleting(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      notifications.show({
        title: "فشل الحذف",
        message: e.response?.data?.message || "تعذر حذف المستخدم",
        color: "red",
      });
    },
  });

  const roleOptions = useMemo(() => {
    const roles = rolesQuery.data ?? [];
    return roles
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((r) => ({
        value: String(r.id),
        label: `${roleLabelAr(r.name)} (ID: ${r.id})`,
      }));
  }, [rolesQuery.data]);

  const filteredUsers = useMemo(() => {
    const list = usersQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => {
      const roleName = u.role?.name ?? "";
      return (
        u.username.toLowerCase().includes(q) ||
        u.phoneNumber.toLowerCase().includes(q) ||
        roleName.toLowerCase().includes(q)
      );
    });
  }, [usersQuery.data, search]);

  const openCreate = () => {
    setEditing(null);
    setUsername("");
    setPhoneNumber("");
    setPassword("");
    setRoleId(null);
    setFormOpen(true);
  };

  const openEdit = (u: ApiUser) => {
    setEditing(u);
    setUsername(u.username);
    setPhoneNumber(u.phoneNumber);
    setPassword("");
    setRoleId(String(u.role_id));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setPassword("");
  };

  const submitForm = async () => {
    const parsedRoleId = roleId ? Number(roleId) : NaN;

    if (
      !username.trim() ||
      !phoneNumber.trim() ||
      !Number.isFinite(parsedRoleId)
    ) {
      notifications.show({
        title: "بيانات ناقصة",
        message: "يرجى إدخال اسم المستخدم ورقم الهاتف وتحديد الدور",
        color: "red",
      });
      return;
    }

    if (!editing && !password) {
      notifications.show({
        title: "كلمة المرور مطلوبة",
        message: "يرجى إدخال كلمة المرور عند إنشاء مستخدم جديد",
        color: "red",
      });
      return;
    }

    if (editing) {
      const payload: UpdateUserPayload = {
        username: username.trim(),
        phoneNumber: phoneNumber.trim(),
        role_id: parsedRoleId,
      };
      if (password.trim()) payload.password = password.trim();
      await updateMutation.mutateAsync({ id: editing.id, payload });
    } else {
      const payload: CreateUserPayload = {
        username: username.trim(),
        phoneNumber: phoneNumber.trim(),
        password: password.trim(),
        role_id: parsedRoleId,
      };
      await createMutation.mutateAsync(payload);
    }
  };

  const startDelete = (u: ApiUser) => {
    setDeleting(u);
    setDeleteOpen(true);
  };

  const loading = rolesQuery.isLoading || usersQuery.isLoading;

  if (shouldBlock) {
    return (
      <Center h={400}>
        <Text c="dimmed">غير مصرح لك بعرض هذه الصفحة</Text>
      </Center>
    );
  }

  return (
    <Box>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Group gap="sm">
          <Title order={2}>المستخدمون</Title>
          <Badge
            variant="light"
            color="blue"
            leftSection={<IconUsers size={14} />}
          >
            إدارة الحسابات
          </Badge>
        </Group>

        <Group gap="sm" wrap="wrap">
          <TextInput
            placeholder="بحث بالاسم أو الهاتف أو الدور"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            w={{ base: "100%", sm: 320 }}
          />
          <ActionIcon
            variant="light"
            size="lg"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ["users"] });
              void queryClient.invalidateQueries({ queryKey: ["roles"] });
            }}
            aria-label="تحديث"
          >
            <IconRefresh size={18} />
          </ActionIcon>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            مستخدم جديد
          </Button>
        </Group>
      </Group>

      {loading ? (
        <Center h={240}>
          <Loader />
        </Center>
      ) : usersQuery.isError ? (
        <Center h={240}>
          <Stack align="center" gap="xs">
            <Text c="red">تعذر تحميل المستخدمين</Text>
            <Button
              variant="light"
              onClick={() =>
                void queryClient.invalidateQueries({ queryKey: ["users"] })
              }
            >
              إعادة المحاولة
            </Button>
          </Stack>
        </Center>
      ) : (
        <ScrollArea>
          <Table withTableBorder withColumnBorders striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ whiteSpace: "nowrap" }}>المعرف</Table.Th>
                <Table.Th style={{ whiteSpace: "nowrap" }}>
                  اسم المستخدم
                </Table.Th>
                <Table.Th style={{ whiteSpace: "nowrap" }}>رقم الهاتف</Table.Th>
                <Table.Th style={{ whiteSpace: "nowrap" }}>الدور</Table.Th>
                <Table.Th style={{ width: 120 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredUsers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center">
                      لا يوجد مستخدمون
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredUsers.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td>{u.id}</Table.Td>
                    <Table.Td>{u.username}</Table.Td>
                    <Table.Td style={{ direction: "ltr" }}>
                      {u.phoneNumber}
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">
                        {roleLabelAr(u.role?.name ?? String(u.role_id))}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} justify="flex-end" wrap="nowrap">
                        <ActionIcon
                          variant="light"
                          onClick={() => openEdit(u)}
                          aria-label="تعديل"
                        >
                          <IconEdit size={18} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => startDelete(u)}
                          aria-label="حذف"
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}

      <Modal
        opened={formOpen}
        onClose={closeForm}
        title={editing ? "تعديل مستخدم" : "مستخدم جديد"}
        centered
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="اسم المستخدم"
            placeholder="مثال: john_doe"
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
            required
          />
          <TextInput
            label="رقم الهاتف"
            placeholder="مثال: 01000000000"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.currentTarget.value)}
            required
          />
          <Select
            label="الدور"
            placeholder="اختر الدور"
            data={roleOptions}
            value={roleId}
            onChange={setRoleId}
            searchable
            nothingFoundMessage="لا توجد نتائج"
            required
          />
          <PasswordInput
            label={editing ? "كلمة المرور (اختياري)" : "كلمة المرور"}
            placeholder={
              editing ? "اتركها فارغة إذا لا تريد تغييرها" : "أدخل كلمة المرور"
            }
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required={!editing}
          />

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={closeForm}>
              إلغاء
            </Button>
            <Button
              onClick={() => void submitForm()}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? "حفظ التعديل" : "إنشاء"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmDeleteModal
        opened={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleting(null);
        }}
        onConfirm={() => {
          if (!deleting) return;
          void deleteMutation.mutateAsync(deleting.id);
        }}
        loading={deleteMutation.isPending}
        title="حذف مستخدم"
        message={`هل أنت متأكد من حذف المستخدم "${deleting?.username ?? ""}"؟`}
      />
    </Box>
  );
}
