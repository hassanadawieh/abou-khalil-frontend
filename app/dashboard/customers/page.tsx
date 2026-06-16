"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCash,
  IconEdit,
  IconHistory,
  IconPlus,
  IconPrinter,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import api from "@/lib/api";
import type {
  CreateCustomerDto,
  CreateCustomerHistoryEntryDto,
  Customer,
  CustomerHistoryEntry,
  CustomerHistoryResponse,
} from "@/types";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";

const emptyForm: CreateCustomerDto = {
  firstName: "",
  lastName: "",
  phoneNumber1: "",
  phoneNumber2: "",
  city: "",
  amount: 0,
};

const emptyHistoryForm: CreateCustomerHistoryEntryDto = {
  type: "payment",
  amount: 0,
  note: "",
};

function formatMoney(value: number) {
  return Number(value || 0).toFixed(2);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(value));
}

function getEntryTypeLabel(type: CustomerHistoryEntry["type"]) {
  switch (type) {
    case "invoice":
      return "فاتورة";
    case "payment":
      return "دفعة";
    case "adjustment":
      return "إضافة مبلغ";
    default:
      return type;
  }
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpened, { open: openForm, close: closeForm }] =
    useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [historyOpened, { open: openHistory, close: closeHistory }] =
    useDisclosure(false);
  const [entryOpened, { open: openEntry, close: closeEntry }] =
    useDisclosure(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [historyCustomerId, setHistoryCustomerId] = useState<number | null>(
    null,
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [form, setForm] = useState<CreateCustomerDto>(emptyForm);
  const [historyForm, setHistoryForm] =
    useState<CreateCustomerHistoryEntryDto>(emptyHistoryForm);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data } = await api.get("/customers");
      return data;
    },
  });

  const { data: historyData, isLoading: historyLoading } =
    useQuery<CustomerHistoryResponse>({
      queryKey: ["customer-history", historyCustomerId],
      queryFn: async () => {
        const { data } = await api.get(
          `/customers/${historyCustomerId}/history`,
        );
        return data;
      },
      enabled: historyOpened && !!historyCustomerId,
    });

  const createMutation = useMutation({
    mutationFn: (dto: CreateCustomerDto) => api.post("/customers", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      notifications.show({
        title: "نجاح",
        message: "تم إنشاء العميل",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في إنشاء العميل",
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
      dto: Partial<CreateCustomerDto>;
    }) => api.patch(`/customers/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (historyCustomerId) {
        queryClient.invalidateQueries({
          queryKey: ["customer-history", historyCustomerId],
        });
      }
      notifications.show({
        title: "نجاح",
        message: "تم تحديث العميل",
        color: "green",
      });
      handleCloseForm();
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في تحديث العميل",
        color: "red",
      });
    },
  });

  const addHistoryEntryMutation = useMutation({
    mutationFn: ({
      customerId,
      dto,
    }: {
      customerId: number;
      dto: CreateCustomerHistoryEntryDto;
    }) => api.post(`/customers/${customerId}/history`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (historyCustomerId) {
        queryClient.invalidateQueries({
          queryKey: ["customer-history", historyCustomerId],
        });
      }
      notifications.show({
        title: "نجاح",
        message:
          historyForm.type === "payment"
            ? "تم تسجيل الدفعة"
            : "تمت إضافة المبلغ للعميل",
        color: "green",
      });
      handleCloseHistoryEntry();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      notifications.show({
        title: "خطأ",
        message: err.response?.data?.message || "فشل في تسجيل العملية",
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      notifications.show({
        title: "نجاح",
        message: "تم حذف العميل",
        color: "green",
      });
      closeDelete();
      setDeletingId(null);
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في حذف العميل",
        color: "red",
      });
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    openForm();
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phoneNumber1: customer.phoneNumber1,
      phoneNumber2: customer.phoneNumber2 || "",
      city: customer.city,
      amount: Number(customer.amount),
    });
    openForm();
  };

  const handleOpenHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setHistoryCustomerId(customer.id);
    openHistory();
  };

  const handleOpenHistoryEntry = (
    type: CreateCustomerHistoryEntryDto["type"],
  ) => {
    setHistoryForm({ ...emptyHistoryForm, type });
    openEntry();
  };

  const handleCloseForm = () => {
    closeForm();
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleCloseHistory = () => {
    closeHistory();
    setHistoryCustomerId(null);
    setSelectedCustomer(null);
    handleCloseHistoryEntry();
  };

  const handleCloseHistoryEntry = () => {
    closeEntry();
    setHistoryForm(emptyHistoryForm);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.phoneNumber1 || !form.city) {
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

  const handleHistoryEntrySubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!historyCustomerId || historyForm.amount <= 0) {
      notifications.show({
        title: "تحقق",
        message: "يرجى إدخال مبلغ صحيح",
        color: "orange",
      });
      return;
    }

    addHistoryEntryMutation.mutate({
      customerId: historyCustomerId,
      dto: historyForm,
    });
  };

  const handleOpenDelete = (id: number) => {
    setDeletingId(id);
    openDelete();
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter((customer) => {
      return (
        customer.firstName.toLowerCase().includes(q) ||
        customer.lastName.toLowerCase().includes(q) ||
        customer.phoneNumber1.includes(q) ||
        customer.city.toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  const historyCustomer = historyData?.customer ?? selectedCustomer;

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>العملاء</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={handleOpenCreate}>
          إضافة عميل
        </Button>
      </Group>

      <Paper shadow="xs" p="md" radius="md" withBorder>
        <TextInput
          placeholder="البحث عن عملاء..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          mb="md"
        />

        <Box pos="relative" mih={200}>
          <LoadingOverlay visible={isLoading} />
          <ScrollArea>
            <Table
              striped
              highlightOnHover
              withTableBorder
              style={{ minWidth: 1100 }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>الاسم الأول</Table.Th>
                  <Table.Th>اسم العائلة</Table.Th>
                  <Table.Th>الهاتف 1</Table.Th>
                  <Table.Th>الهاتف 2</Table.Th>
                  <Table.Th>المدينة</Table.Th>
                  <Table.Th>الرصيد الحالي</Table.Th>
                  <Table.Th>الإجراءات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={8}>
                      <Text ta="center" c="dimmed" py="xl">
                        {isLoading ? "جاري التحميل..." : "لا يوجد عملاء"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filtered.map((customer, idx) => (
                    <Table.Tr key={customer.id}>
                      <Table.Td>{idx + 1}</Table.Td>
                      <Table.Td>{customer.firstName}</Table.Td>
                      <Table.Td>{customer.lastName}</Table.Td>
                      <Table.Td>{customer.phoneNumber1}</Table.Td>
                      <Table.Td>{customer.phoneNumber2 || "-"}</Table.Td>
                      <Table.Td>{customer.city}</Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={
                            Number(customer.amount) > 0 ? "orange" : "green"
                          }
                        >
                          {formatMoney(Number(customer.amount))}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="grape"
                            onClick={() => handleOpenHistory(customer)}
                            title="سجل العميل"
                          >
                            <IconHistory size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleOpenEdit(customer)}
                            title="تعديل"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleOpenDelete(customer.id)}
                            title="حذف"
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

      <Modal
        opened={formOpened}
        onClose={handleCloseForm}
        title={editingId ? "تعديل عميل" : "إضافة عميل"}
        centered
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <Group grow>
              <TextInput
                label="الاسم الأول"
                placeholder="أحمد"
                required
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.currentTarget.value })
                }
              />
              <TextInput
                label="اسم العائلة"
                placeholder="محمد"
                required
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.currentTarget.value })
                }
              />
            </Group>
            <Group grow>
              <TextInput
                label="رقم الهاتف 1"
                placeholder="0123456789"
                required
                value={form.phoneNumber1}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber1: e.currentTarget.value })
                }
              />
              <TextInput
                label="رقم الهاتف 2"
                placeholder="اختياري"
                value={form.phoneNumber2}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber2: e.currentTarget.value })
                }
              />
            </Group>
            <TextInput
              label="المدينة"
              placeholder="بغداد"
              required
              value={form.city}
              onChange={(e) =>
                setForm({ ...form, city: e.currentTarget.value })
              }
            />
            <NumberInput
              label={editingId ? "الرصيد الحالي" : "الرصيد الافتتاحي"}
              placeholder="0.00"
              decimalScale={2}
              value={form.amount}
              onChange={(val) => setForm({ ...form, amount: Number(val) || 0 })}
            />
            <Text size="xs" c="dimmed">
              يتم تسجيل أي تعديل على الرصيد داخل سجل العميل تلقائياً.
            </Text>
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

      <Modal
        opened={historyOpened}
        onClose={handleCloseHistory}
        title="سجل العميل"
        centered
        size="90%"
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, md: 3 }}>
            <Paper withBorder radius="md" p="sm">
              <Text size="xs" c="dimmed">
                العميل
              </Text>
              <Text fw={700}>
                {historyCustomer
                  ? `${historyCustomer.firstName} ${historyCustomer.lastName}`
                  : "-"}
              </Text>
            </Paper>
            <Paper withBorder radius="md" p="sm">
              <Text size="xs" c="dimmed">
                الهاتف
              </Text>
              <Text fw={700}>{historyCustomer?.phoneNumber1 || "-"}</Text>
            </Paper>
            <Paper withBorder radius="md" p="sm">
              <Text size="xs" c="dimmed">
                الرصيد الحالي
              </Text>
              <Text
                fw={700}
                c={
                  Number(historyData?.current_amount || 0) > 0
                    ? "orange"
                    : "green"
                }
              >
                {formatMoney(Number(historyData?.current_amount || 0))}
              </Text>
            </Paper>
          </SimpleGrid>

          <Group justify="space-between" wrap="wrap">
            <Group>
              <Button
                leftSection={<IconCash size={16} />}
                onClick={() => handleOpenHistoryEntry("payment")}
                variant="light"
                color="green"
              >
                إضافة دفعة
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => handleOpenHistoryEntry("adjustment")}
                variant="light"
                color="orange"
              >
                إضافة مبلغ
              </Button>
            </Group>

            <Button
              leftSection={<IconPrinter size={16} />}
              variant="light"
              onClick={() => {
                if (!historyCustomerId) return;
                window.open(
                  `/print/customers/${historyCustomerId}?auto=1`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              طباعة السجل
            </Button>
          </Group>

          <Box pos="relative" mih={220}>
            <LoadingOverlay visible={historyLoading} />
            <ScrollArea>
              <Table
                striped
                highlightOnHover
                withTableBorder
                style={{ minWidth: 1000 }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>التاريخ</Table.Th>
                    <Table.Th>النوع</Table.Th>
                    <Table.Th>رقم الفاتورة</Table.Th>
                    <Table.Th>ملاحظة</Table.Th>
                    <Table.Th>مدين</Table.Th>
                    <Table.Th>دفع</Table.Th>
                    <Table.Th>الرصيد بعد العملية</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {!historyData || historyData.history.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Text ta="center" c="dimmed" py="xl">
                          {historyLoading
                            ? "جاري التحميل..."
                            : "لا يوجد سجل لهذا العميل"}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    historyData.history.map((entry) => {
                      const isCredit = Number(entry.amount) < 0;
                      const absoluteAmount = Math.abs(Number(entry.amount));

                      return (
                        <Table.Tr key={entry.id}>
                          <Table.Td>{formatDate(entry.createdAt)}</Table.Td>
                          <Table.Td>
                            <Badge
                              variant="light"
                              color={
                                entry.type === "payment"
                                  ? "green"
                                  : entry.type === "invoice"
                                    ? "blue"
                                    : "orange"
                              }
                            >
                              {getEntryTypeLabel(entry.type)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>{entry.invoice_number || "-"}</Table.Td>
                          <Table.Td>{entry.note || "-"}</Table.Td>
                          <Table.Td>
                            {isCredit ? "-" : formatMoney(absoluteAmount)}
                          </Table.Td>
                          <Table.Td>
                            {isCredit ? formatMoney(absoluteAmount) : "-"}
                          </Table.Td>
                          <Table.Td>
                            {formatMoney(Number(entry.balance_after))}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Box>
        </Stack>
      </Modal>

      <Modal
        opened={entryOpened}
        onClose={handleCloseHistoryEntry}
        title={
          historyForm.type === "payment" ? "إضافة دفعة" : "إضافة مبلغ جديد"
        }
        centered
      >
        <form onSubmit={handleHistoryEntrySubmit}>
          <Stack gap="sm">
            <NumberInput
              label="المبلغ"
              placeholder="0.00"
              decimalScale={2}
              min={0}
              value={historyForm.amount}
              onChange={(val) =>
                setHistoryForm({ ...historyForm, amount: Number(val) || 0 })
              }
              required
            />
            <Textarea
              label="ملاحظة"
              placeholder={
                historyForm.type === "payment"
                  ? "مثال: دفعة نقدية"
                  : "مثال: إضافة على الحساب"
              }
              value={historyForm.note || ""}
              onChange={(e) =>
                setHistoryForm({ ...historyForm, note: e.currentTarget.value })
              }
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseHistoryEntry}>
                إلغاء
              </Button>
              <Button type="submit" loading={addHistoryEntryMutation.isPending}>
                حفظ
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <ConfirmDeleteModal
        opened={deleteOpened}
        onClose={() => {
          closeDelete();
          setDeletingId(null);
        }}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        loading={deleteMutation.isPending}
        message="هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء."
      />
    </Box>
  );
}
