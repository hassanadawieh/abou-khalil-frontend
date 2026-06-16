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
import type { Employee, CreateEmployeeDto } from "@/types";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";

const emptyForm: CreateEmployeeDto = {
  name: "",
  phoneNumber: "",
  salary: 0,
};

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpened, { open: openForm, close: closeForm }] =
    useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateEmployeeDto>(emptyForm);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await api.get("/employees");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateEmployeeDto) => api.post("/employees", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      notifications.show({
        title: "نجاح",
        message: "تم إنشاء الموظف",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في إنشاء الموظف",
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
      dto: Partial<CreateEmployeeDto>;
    }) => api.patch(`/employees/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      notifications.show({
        title: "نجاح",
        message: "تم تحديث الموظف",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في تحديث الموظف",
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      notifications.show({
        title: "نجاح",
        message: "تم حذف الموظف",
        color: "green",
      });
      closeDelete();
      setDeletingId(null);
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في حذف الموظف",
        color: "red",
      });
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    openForm();
  };

  const handleOpenEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      phoneNumber: employee.phoneNumber,
      salary: employee.salary,
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

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.phoneNumber.includes(q);
  });

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>الموظفين</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={handleOpenCreate}>
          إضافة موظف
        </Button>
      </Group>

      <Paper shadow="xs" p="md" radius="md" withBorder>
        <TextInput
          placeholder="البحث عن موظفين..."
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
                  <Table.Th>الراتب</Table.Th>
                  <Table.Th>تاريخ الإنشاء</Table.Th>
                  <Table.Th>الإجراءات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed" py="xl">
                        {isLoading ? "جاري التحميل..." : "لا يوجد موظفين"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filtered.map((employee, idx) => (
                    <Table.Tr key={employee.id}>
                      <Table.Td>{idx + 1}</Table.Td>
                      <Table.Td fw={500}>{employee.name}</Table.Td>
                      <Table.Td>{employee.phoneNumber}</Table.Td>
                      <Table.Td>{Number(employee.salary).toFixed(2)}</Table.Td>
                      <Table.Td>
                        {new Date(employee.createdAt).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleOpenEdit(employee)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleOpenDelete(employee.id)}
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
        title={editingId ? "تعديل موظف" : "إضافة موظف"}
        centered
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="الاسم"
              placeholder="أحمد محمد"
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
              label="الراتب"
              placeholder="0.00"
              decimalScale={2}
              min={0}
              value={form.salary}
              onChange={(val) => setForm({ ...form, salary: Number(val) || 0 })}
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
        message="هل أنت متأكد من حذف هذا الموظف؟"
      />
    </Box>
  );
}
