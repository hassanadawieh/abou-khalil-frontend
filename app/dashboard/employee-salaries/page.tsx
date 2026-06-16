"use client";

import { useState, useMemo } from "react";
import {
  Container,
  Paper,
  Table,
  Button,
  Group,
  Modal,
  Input,
  NumberInput,
  Select,
  Textarea,
  Badge,
  ActionIcon,
  Popover,
  Stack,
  Text,
  Grid,
  Card,
  Loader,
  Center,
  ScrollArea,
} from "@mantine/core";
import { IconPlus, IconEdit, IconTrash, IconCheck } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { EmployeeSalary, CreateEmployeeSalaryDto, Employee } from "@/types";

const MONTHS = [
  { value: "1", label: "يناير" },
  { value: "2", label: "فبراير" },
  { value: "3", label: "مارس" },
  { value: "4", label: "أبريل" },
  { value: "5", label: "مايو" },
  { value: "6", label: "يونيو" },
  { value: "7", label: "يوليو" },
  { value: "8", label: "أغسطس" },
  { value: "9", label: "سبتمبر" },
  { value: "10", label: "أكتوبر" },
  { value: "11", label: "نوفمبر" },
  { value: "12", label: "ديسمبر" },
];

export default function EmployeeSalariesPage() {
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [selectedMonth, setSelectedMonth] = useState(
    (new Date().getMonth() + 1).toString(),
  );
  const queryClient = useQueryClient();

  const { register, reset, watch, setValue } =
    useForm<CreateEmployeeSalaryDto>();

  // Fetch all employee salaries
  const { data: salaries, isLoading } = useQuery({
    queryKey: ["employee-salaries"],
    queryFn: async () => {
      const { data } = await api.get<EmployeeSalary[]>("/employee-salaries");
      return data;
    },
  });

  // Fetch employees for dropdown
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await api.get<Employee[]>("/employees");
      return data;
    },
  });

  // Create salary mutation
  const createMutation = useMutation({
    mutationFn: (dto: CreateEmployeeSalaryDto) =>
      api.post("/employee-salaries", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-salaries"] });
      reset();
      setOpened(false);
      alert("تم إنشاء سجل الراتب بنجاح");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "فشل في إنشاء سجل الراتب";
      alert(message);
    },
  });

  // Update salary mutation
  const updateMutation = useMutation({
    mutationFn: (dto: CreateEmployeeSalaryDto) =>
      api.patch(`/employee-salaries/${editingId}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-salaries"] });
      reset();
      setEditingId(null);
      setOpened(false);
      alert("تم تحديث سجل الراتب بنجاح");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "فشل في تحديث سجل الراتب";
      alert(message);
    },
  });

  // Mark as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/employee-salaries/${id}/pay`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-salaries"] });
      alert("تم تعيين الراتب كمدفوع");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "فشل في تعيين الراتب كمدفوع";
      alert(message);
    },
  });

  // Delete salary mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/employee-salaries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-salaries"] });
      alert("تم حذف سجل الراتب بنجاح");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "فشل في حذف سجل الراتب";
      alert(message);
    },
  });

  // Filter and search salaries
  const filteredSalaries = useMemo(() => {
    if (!salaries) return [];

    return salaries.filter((salary: EmployeeSalary) => {
      const employeeName = (salary.employee?.name || "").toLowerCase();
      const matchesSearch =
        employeeName.includes(search.toLowerCase()) ||
        salary.id.toString().includes(search);
      const matchesStatus =
        filterStatus === null ||
        (filterStatus === "paid" && salary.paid) ||
        (filterStatus === "unpaid" && !salary.paid);
      const matchesMonth =
        salary.year.toString() === selectedYear &&
        salary.month.toString() === selectedMonth;

      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [salaries, search, filterStatus, selectedYear, selectedMonth]);

  const handleOpenForm = () => {
    reset();
    setEditingId(null);
    setOpened(true);
  };

  const handleEditSalary = (salary: EmployeeSalary) => {
    setValue("employee_id", salary.employee_id);
    setValue("year", salary.year);
    setValue("month", salary.month);
    setValue("amount", salary.amount);
    setValue("paid", salary.paid);
    setValue("notes", salary.notes || "");
    setEditingId(salary.id);
    setOpened(true);
  };

  const onSubmit = () => {
    // Gather all values from the form
    const employeeId = watch("employee_id");
    const year = watch("year");
    const month = watch("month");
    const amount = watch("amount");
    const notes = watch("notes");

    // Validate required fields
    if (!employeeId || year === undefined || !month || !amount) {
      alert("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const data: CreateEmployeeSalaryDto = {
      employee_id: Number(employeeId),
      year: Number(year),
      month: Number(month),
      amount: Number(amount),
      notes: notes || undefined,
    };

    if (editingId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (!filteredSalaries)
      return { total: 0, paid: 0, unpaid: 0, totalAmount: 0 };

    const total = filteredSalaries.length;
    const paid = filteredSalaries.filter((s: EmployeeSalary) => s.paid).length;
    const unpaid = total - paid;
    const totalAmount = filteredSalaries.reduce(
      (sum: number, s: EmployeeSalary) => sum + Number(s.amount),
      0,
    );

    return { total, paid, unpaid, totalAmount };
  }, [filteredSalaries]);

  const monthName = MONTHS.find((m) => m.value === selectedMonth)?.label || "";

  if (isLoading) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <h1>رواتب الموظفين</h1>
          <Text c="dimmed" size="sm">
            إدارة وتتبع دفعات الرواتب الشهرية للموظفين
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenForm}>
          إضافة سجل راتب
        </Button>
      </Group>

      {/* Statistics Cards */}
      <Grid mb="xl">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Text fw={600} size="sm" c="dimmed">
                إجمالي السجلات
              </Text>
              <Text fw={700} size="xl">
                {stats.total}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            style={{ borderLeft: "4px solid #51cf66" }}
          >
            <Stack gap="xs">
              <Text fw={600} size="sm" c="dimmed">
                مدفوع
              </Text>
              <Text fw={700} size="xl" c="green">
                {stats.paid}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            style={{ borderLeft: "4px solid #ff8787" }}
          >
            <Stack gap="xs">
              <Text fw={600} size="sm" c="dimmed">
                غير مدفوع
              </Text>
              <Text fw={700} size="xl" c="red">
                {stats.unpaid}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Text fw={600} size="sm" c="dimmed">
                المبلغ الإجمالي
              </Text>
              <Text fw={700} size="lg">
                ${Number(stats.totalAmount).toFixed(2)}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Filters */}
      <Paper p="md" radius="md" mb="xl" withBorder>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Input
              placeholder="البحث بإسم الموظف..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="السنة"
              placeholder="اختر السنة"
              data={[
                { value: "2024", label: "2024" },
                { value: "2025", label: "2025" },
                { value: "2026", label: "2026" },
              ]}
              value={selectedYear}
              onChange={(val) => setSelectedYear(val || "2026")}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="الشهر"
              placeholder="اختر الشهر"
              data={MONTHS}
              value={selectedMonth}
              onChange={(val) => setSelectedMonth(val || "1")}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="الحالة"
              placeholder="جميع الحالات"
              data={[
                { value: "paid", label: "مدفوع" },
                { value: "unpaid", label: "غير مدفوع" },
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
              clearable
            />
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Salary Records Table */}
      <Paper radius="md" withBorder>
        {filteredSalaries.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">
              لا توجد سجلات رواتب لشهر {monthName} {selectedYear}
            </Text>
          </Center>
        ) : (
          <ScrollArea>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>الموظف</Table.Th>
                  <Table.Th>السنة/الشهر</Table.Th>
                  <Table.Th align="right">المبلغ</Table.Th>
                  <Table.Th>الحالة</Table.Th>
                  <Table.Th>تاريخ الدفع</Table.Th>
                  <Table.Th align="center">الإجراءات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredSalaries.map((salary: EmployeeSalary) => (
                  <Table.Tr key={salary.id}>
                    <Table.Td fw={500}>{salary.employee?.name}</Table.Td>
                    <Table.Td>
                      {salary.month}/{salary.year}
                    </Table.Td>
                    <Table.Td align="right" fw={600}>
                      ${Number(salary.amount).toFixed(2)}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={salary.paid ? "green" : "red"}
                        variant="light"
                      >
                        {salary.paid ? "مدفوع" : "غير مدفوع"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {salary.paid_date
                        ? new Date(salary.paid_date).toLocaleDateString()
                        : "-"}
                    </Table.Td>
                    <Table.Td align="center">
                      <Group gap={0} justify="center">
                        {!salary.paid && (
                          <ActionIcon
                            color="green"
                            variant="subtle"
                            title="تعيين كمدفوع"
                            onClick={() => markPaidMutation.mutate(salary.id)}
                            loading={markPaidMutation.isPending}
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                        )}
                        <ActionIcon
                          color="blue"
                          variant="subtle"
                          title="تعديل"
                          onClick={() => handleEditSalary(salary)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <Popover position="bottom" withArrow shadow="md">
                          <Popover.Target>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              title="حذف"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Popover.Target>
                          <Popover.Dropdown>
                            <Stack gap="sm">
                              <Text size="sm" fw={500}>
                                حذف سجل الراتب؟
                              </Text>
                              <Group gap="xs">
                                <Button
                                  size="xs"
                                  color="red"
                                  onClick={() =>
                                    deleteMutation.mutate(salary.id)
                                  }
                                  loading={deleteMutation.isPending}
                                >
                                  حذف
                                </Button>
                                <Button size="xs" variant="light">
                                  إلغاء
                                </Button>
                              </Group>
                            </Stack>
                          </Popover.Dropdown>
                        </Popover>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>

      {/* Add/Edit Modal */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={editingId ? "تعديل سجل الراتب" : "إضافة سجل الراتب"}
        centered
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Stack gap="md">
            <Select
              label="الموظف"
              placeholder="اختر الموظف"
              data={
                employees?.map((emp: Employee) => ({
                  value: emp.id.toString(),
                  label: emp.name,
                })) || []
              }
              {...register("employee_id", {
                required: "Employee is required",
              })}
              onChange={(val) => setValue("employee_id", parseInt(val || "0"))}
              value={watch("employee_id")?.toString()}
            />

            <NumberInput
              label="السنة"
              placeholder="أدخل السنة"
              onChange={(val) => setValue("year", Number(val))}
              value={watch("year") ?? ""}
              min={2000}
              max={2100}
            />

            <Select
              label="الشهر"
              placeholder="اختر الشهر"
              data={MONTHS}
              {...register("month", {
                required: "Month is required",
              })}
              onChange={(val) => setValue("month", parseInt(val || "1"))}
              value={watch("month")?.toString()}
            />

            <NumberInput
              label="المبلغ"
              placeholder="أدخل مبلغ الراتب"
              step={0.01}
              onChange={(val) => setValue("amount", Number(val))}
              value={watch("amount") ?? ""}
              min={0}
            />

            <Textarea
              label="ملاحظات"
              placeholder="أضف أي ملاحظات..."
              {...register("notes")}
              value={watch("notes") || ""}
            />

            <Group justify="flex-end">
              <Button variant="light" onClick={() => setOpened(false)}>
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
    </Container>
  );
}
