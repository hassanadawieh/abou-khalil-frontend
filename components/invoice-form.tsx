"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Group,
  Stack,
  Title,
  Text,
  Paper,
  SegmentedControl,
  TextInput,
  NumberInput,
  Select,
  Button,
  Card,
  Badge,
  ActionIcon,
  Divider,
  SimpleGrid,
  Image,
  LoadingOverlay,
  ScrollArea,
  Tooltip,
  ThemeIcon,
  Center,
  Loader,
  Modal,
  Checkbox,
  Drawer,
  Affix,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconPlus,
  IconMinus,
  IconTrash,
  IconSearch,
  IconShoppingCart,
  IconReceipt,
  IconArrowLeft,
  IconCube,
  IconHeart,
} from "@tabler/icons-react";
import api from "@/lib/api";
import type {
  CeramicItem,
  HealthyItem,
  Customer,
  Invoice,
  InvoiceType,
  InvoiceItem,
  CreateCustomerDto,
} from "@/types";

// ====== Cart item type ======
interface CartItem {
  item_id: number;
  item_type: InvoiceType;
  title: string;
  price: number;
  main_price: number;
  quantity: number;
  maxQuantity: number;
  image_url?: string;
  details: string;
  place?: string;
}

// ====== Build initial cart from existing invoice ======
function buildCartFromInvoice(
  invoice: Invoice,
  ceramics: CeramicItem[],
  healthies: HealthyItem[],
): CartItem[] {
  if (!invoice.items || invoice.items.length === 0) return [];
  return invoice.items.map((item: InvoiceItem) => {
    const raw = item as unknown as Record<string, unknown>;
    const itemType = (raw.item_type as InvoiceType) || invoice.type;
    const isCeramic = itemType === "ceramic";
    const title = (raw.title as string) || "Unknown Item";
    const price = Number(raw.price) || 0;
    const main_price = Number(raw.main_price) || 0;
    const qty = Number(raw.quantity) || 1;
    const image_url = raw.image_url as string | undefined;
    const itemId = Number(raw.item_id) || 0;
    const place = (raw.place as string) || "";

    let details = "";
    if (isCeramic) {
      details = `${raw.bag || ""} | ${raw.width || 0}×${raw.height || 0}cm`;
    } else {
      details = (raw.color as string) || "";
    }

    let maxQty = 9999;
    if (isCeramic) {
      const found = ceramics.find((c) => c.id === itemId);
      if (found) maxQty = found.quantity + qty;
    } else {
      const found = healthies.find((h) => h.id === itemId);
      if (found) maxQty = found.quantity + qty;
    }

    return {
      item_id: itemId,
      item_type: itemType,
      title,
      price,
      main_price,
      quantity: qty,
      maxQuantity: maxQty,
      image_url,
      details,
      place,
    };
  });
}

// ====== Initial values for edit mode ======
interface InitialValues {
  invoiceType: InvoiceType;
  customerId: string;
  discount: number;
  delivery_price: number;
  cart: CartItem[];
}

// ====================================
// Inner form component (pure, no data-loading side effects)
// ====================================
function InvoiceFormInner({
  mode,
  invoiceId,
  invoiceNumber,
  initialValues,
  ceramicItems,
  healthyItems,
  customers,
  loadingCeramics,
  loadingHealthy,
}: {
  mode: "create" | "edit";
  invoiceId?: number;
  invoiceNumber?: string;
  initialValues: InitialValues;
  ceramicItems: CeramicItem[];
  healthyItems: HealthyItem[];
  customers: Customer[];
  loadingCeramics: boolean;
  loadingHealthy: boolean;
}) {
  const router = useRouter();

  const isMobile = useMediaQuery("(max-width: 767px)");
  const [cartOpened, cartDrawer] = useDisclosure(false);

  // ====== Query client for invalidating queries ======
  const queryClient = useQueryClient(); // ====== State (initialized from initialValues) ======
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(
    initialValues.invoiceType,
  );
  const [customerId, setCustomerId] = useState<string | null>(
    initialValues.customerId || null,
  );
  const [discount, setDiscount] = useState<number>(initialValues.discount);
  const [delivery_price, setDeliveryPrice] = useState<number>(
    initialValues.delivery_price,
  );
  const [cart, setCart] = useState<CartItem[]>(initialValues.cart);
  const [productSearch, setProductSearch] = useState("");

  // ====== Product Details Modal ======
  const [
    productDetailsOpened,
    { open: openProductDetails, close: closeProductDetails },
  ] = useDisclosure(false);
  const [selectedProduct, setSelectedProduct] = useState<
    CeramicItem | HealthyItem | null
  >(null);

  const showProductDetails = (product: CeramicItem | HealthyItem) => {
    setSelectedProduct(product);
    openProductDetails();
  };

  const [printAfterCreate, setPrintAfterCreate] = useState(false);
  const [printTemplate, setPrintTemplate] = useState<"client" | "warehouse">(
    "client",
  );

  // ====== Customer Modal State ======
  const [
    customerModalOpened,
    { open: openCustomerModal, close: closeCustomerModal },
  ] = useDisclosure(false);
  const [customerForm, setCustomerForm] = useState<CreateCustomerDto>({
    firstName: "",
    lastName: "",
    phoneNumber1: "",
    phoneNumber2: "",
    city: "",
    amount: 0,
  });

  // ====== Customer options ======
  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: `${c.firstName} ${c.lastName} — ${c.city}`,
      })),
    [customers],
  );

  // ====== Filtered products ======
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    if (invoiceType === "ceramic") {
      return ceramicItems.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.bag.toLowerCase().includes(q),
      );
    }
    return healthyItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.color.toLowerCase().includes(q),
    );
  }, [invoiceType, productSearch, ceramicItems, healthyItems]);

  // ====== Cart logic ======
  const addToCart = useCallback(
    (product: CeramicItem | HealthyItem) => {
      const isCeramic = invoiceType === "ceramic";
      const existing = cart.find(
        (c) => c.item_id === product.id && c.item_type === invoiceType,
      );

      if (existing) {
        if (existing.quantity >= product.quantity) {
          notifications.show({
            title: "نفذ المخزون",
            message: `لا يوجد المزيد من ${product.title}`,
            color: "orange",
          });
          return;
        }
        setCart((prev) =>
          prev.map((c) =>
            c.item_id === product.id && c.item_type === invoiceType
              ? { ...c, quantity: c.quantity + 1 }
              : c,
          ),
        );
      } else {
        if (product.quantity <= 0) {
          notifications.show({
            title: "نفذ المخزون",
            message: `${product.title} غير متوفر`,
            color: "orange",
          });
          return;
        }

        let details = "";
        if (isCeramic) {
          const ceramic = product as CeramicItem;
          details = `${ceramic.bag} | ${ceramic.width}×${ceramic.height}cm`;
        } else {
          const healthy = product as HealthyItem;
          details = healthy.color;
        }

        setCart((prev) => [
          ...prev,
          {
            item_id: product.id,
            item_type: invoiceType,
            title: product.title,
            price: Number(product.price),
            main_price: Number(product.main_price),
            quantity: 1,
            maxQuantity: product.quantity,
            image_url: product.image_url,
            details,
            place: "",
          },
        ]);
      }
    },
    [invoiceType, cart],
  );

  const updateCartQty = useCallback(
    (itemId: number, itemType: InvoiceType, delta: number) => {
      setCart(
        (prev) =>
          prev
            .map((c) => {
              if (c.item_id === itemId && c.item_type === itemType) {
                const newQty = c.quantity + delta;
                if (newQty <= 0) return null;
                if (newQty > c.maxQuantity) {
                  notifications.show({
                    title: "حد المخزون",
                    message: `متوفر فقط ${c.maxQuantity}`,
                    color: "orange",
                  });
                  return c;
                }
                return { ...c, quantity: newQty };
              }
              return c;
            })
            .filter(Boolean) as CartItem[],
      );
    },
    [],
  );

  const setCartQty = useCallback(
    (itemId: number, itemType: InvoiceType, qty: number) => {
      if (qty <= 0) {
        setCart((prev) =>
          prev.filter(
            (c) => !(c.item_id === itemId && c.item_type === itemType),
          ),
        );
        return;
      }
      setCart((prev) =>
        prev.map((c) => {
          if (c.item_id === itemId && c.item_type === itemType) {
            const newQty = Math.min(qty, c.maxQuantity);
            return { ...c, quantity: newQty };
          }
          return c;
        }),
      );
    },
    [],
  );

  const removeFromCart = useCallback(
    (itemId: number, itemType: InvoiceType) => {
      setCart((prev) =>
        prev.filter((c) => !(c.item_id === itemId && c.item_type === itemType)),
      );
    },
    [],
  );

  // ====== Totals ======
  const subtotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.price * c.quantity, 0),
    [cart],
  );
  const totalAmount = useMemo(
    () => Math.max(subtotal - discount + delivery_price, 0),
    [subtotal, discount, delivery_price],
  );

  // ====== Submit ======
  const createCustomerMutation = useMutation({
    mutationFn: (dto: CreateCustomerDto) => api.post("/customers", dto),
    onSuccess: (response) => {
      const newCustomer = response.data;
      // Invalidate customers query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      // Set the newly created customer as selected
      setCustomerId(String(newCustomer.id));
      closeCustomerModal();
      setCustomerForm({
        firstName: "",
        lastName: "",
        phoneNumber1: "",
        phoneNumber2: "",
        city: "",
        amount: 0,
      });
      notifications.show({
        title: "نجاح",
        message: "تم إنشاء العميل بنجاح",
        color: "green",
      });
    },
    onError: () => {
      notifications.show({
        title: "خطأ",
        message: "فشل في إنشاء العميل",
        color: "red",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post("/invoices", payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });

      notifications.show({
        title: "نجاح",
        message: "تم إنشاء الفاتورة بنجاح",
        color: "green",
      });

      const created = response.data as unknown as { id?: unknown };
      const createdId = Number(created?.id);

      if (printAfterCreate && Number.isFinite(createdId) && createdId > 0) {
        window.open(
          `/print/invoices/${createdId}?type=${printTemplate}&auto=1`,
          "_blank",
          "noopener,noreferrer",
        );
      }

      router.push("/dashboard/invoices");
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      notifications.show({
        title: "خطأ",
        message: error.response?.data?.message || "فشل في إنشاء الفاتورة",
        color: "red",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.patch(`/invoices/${invoiceId}`, payload),
    onSuccess: (response) => {
      if (invoiceId) {
        const updatedInvoice = response.data;
        queryClient.setQueryData(["invoice", invoiceId], updatedInvoice);
        queryClient.invalidateQueries({
          queryKey: ["invoice", invoiceId, "print"],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["invoices"] });

      notifications.show({
        title: "نجاح",
        message: "تم تحديث الفاتورة بنجاح",
        color: "green",
      });
      router.push("/dashboard/invoices");
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      notifications.show({
        title: "خطأ",
        message: error.response?.data?.message || "فشل في تحديث الفاتورة",
        color: "red",
      });
    },
  });

  const handleSubmit = () => {
    if (!customerId) {
      notifications.show({
        title: "مطلوب",
        message: "يرجى اختيار عميل",
        color: "orange",
      });
      return;
    }
    if (cart.length === 0) {
      notifications.show({
        title: "مطلوب",
        message: "يرجى إضافة عنصر واحد على الأقل",
        color: "orange",
      });
      return;
    }

    const payload = {
      amount: subtotal,
      discount,
      delivery_price,
      type: invoiceType,
      customer_id: Number(customerId),
      items: cart.map((c) => ({
        item_type: c.item_type,
        item_id: c.item_id,
        quantity: c.quantity,
        ...(c.item_type === "ceramic"
          ? { place: (c.place ?? "").toString() }
          : {}),
      })),
    };

    if (mode === "create") {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleTypeChange = (value: string) => {
    const newType = value as InvoiceType;
    if (mode === "create" && cart.length > 0 && newType !== invoiceType) {
      setCart([]);
    }
    setInvoiceType(newType);
    setProductSearch("");
  };

  // ====== Render ======
  return (
    <Box>
      {/* Header */}
      <Group justify="space-between" mb="lg" wrap="wrap">
        <Group>
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => router.push("/dashboard/invoices")}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <div>
            <Title order={2}>
              {mode === "create" ? "إنشاء فاتورة" : "تعديل فاتورة"}
            </Title>
            {mode === "edit" && invoiceNumber && (
              <Text size="sm" c="dimmed">
                {invoiceNumber}
              </Text>
            )}
          </div>
        </Group>

        {isMobile && (
          <Button
            variant="light"
            leftSection={<IconShoppingCart size={18} />}
            onClick={cartDrawer.open}
          >
            السلة ({cart.length})
          </Button>
        )}
      </Group>

      <div
        className="invoice-form-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* ====== LEFT: Product Selection ====== */}
        <Stack gap="md">
          {/* Type Selector */}
          <Paper shadow="xs" p="md" radius="md" withBorder>
            <Text fw={600} mb="xs">
              نوع الفاتورة
            </Text>
            <SegmentedControl
              fullWidth
              value={invoiceType}
              onChange={handleTypeChange}
              data={[
                {
                  label: (
                    <Group gap={6} justify="center">
                      <IconCube size={16} />
                      <span>منتجات السيراميك</span>
                    </Group>
                  ),
                  value: "ceramic",
                },
                {
                  label: (
                    <Group gap={6} justify="center">
                      <IconHeart size={16} />
                      <span>المنتجات الصحية</span>
                    </Group>
                  ),
                  value: "healthy",
                },
              ]}
              size="md"
              color={invoiceType === "ceramic" ? "violet" : "teal"}
            />
          </Paper>

          {/* Customer Selector */}
          <Paper shadow="xs" p="md" radius="md" withBorder>
            <Group gap={0}>
              <Select
                label="العميل"
                placeholder="ابحث واختر عميل..."
                searchable
                data={customerOptions}
                value={customerId}
                onChange={setCustomerId}
                size="md"
                nothingFoundMessage="لا يوجد عملاء"
                style={{ flex: 1 }}
              />
              <ActionIcon
                variant="light"
                color="blue"
                size="lg"
                onClick={openCustomerModal}
                title="إضافة عميل جديد"
                style={{ marginTop: 24 }}
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Group>
          </Paper>

          {/* Products Grid */}
          <Paper shadow="xs" p="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>
                {invoiceType === "ceramic"
                  ? "منتجات السيراميك"
                  : "المنتجات الصحية"}
              </Text>
              <Badge
                variant="light"
                color={invoiceType === "ceramic" ? "violet" : "teal"}
              >
                {filteredProducts.length} عنصر
              </Badge>
            </Group>

            <TextInput
              placeholder="البحث عن منتجات..."
              leftSection={<IconSearch size={16} />}
              value={productSearch}
              onChange={(e) => setProductSearch(e.currentTarget.value)}
              mb="md"
            />

            <Box pos="relative" mih={200}>
              <LoadingOverlay visible={loadingCeramics || loadingHealthy} />
              <ScrollArea h={480} offsetScrollbars>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                  {filteredProducts.map((product) => {
                    const isCeramic = invoiceType === "ceramic";
                    const ceramicProduct = isCeramic
                      ? (product as CeramicItem)
                      : null;
                    const healthyProduct = !isCeramic
                      ? (product as HealthyItem)
                      : null;
                    const inCart = cart.find(
                      (c) =>
                        c.item_id === product.id && c.item_type === invoiceType,
                    );

                    return (
                      <Card
                        key={product.id}
                        shadow="xs"
                        padding="sm"
                        radius="md"
                        withBorder
                        style={{
                          cursor: "pointer",
                          borderColor: inCart
                            ? `var(--mantine-color-${isCeramic ? "violet" : "teal"}-4)`
                            : undefined,
                          backgroundColor: inCart
                            ? `var(--mantine-color-${isCeramic ? "violet" : "teal"}-0)`
                            : undefined,
                          transition: "all 150ms ease",
                        }}
                        onClick={() => showProductDetails(product)}
                      >
                        {product.image_url && (
                          <Card.Section mb="xs">
                            <Image
                              src={`/api${product.image_url}`}
                              h={80}
                              fit="cover"
                              alt={product.title}
                              fallbackSrc="https://placehold.co/200x80?text=No+Image"
                            />
                          </Card.Section>
                        )}

                        <Group justify="space-between" wrap="nowrap" gap={8}>
                          <Text
                            fw={600}
                            size="sm"
                            lineClamp={1}
                            style={{ flex: 1, minWidth: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              showProductDetails(product);
                            }}
                          >
                            {product.title}
                          </Text>

                          <Tooltip label="إضافة إلى الفاتورة">
                            <ActionIcon
                              variant="light"
                              color={isCeramic ? "violet" : "teal"}
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                              disabled={product.quantity <= 0}
                              aria-label="Add item"
                            >
                              <IconPlus size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>

                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {isCeramic
                            ? `${ceramicProduct!.bag} | ${ceramicProduct!.width}×${ceramicProduct!.height}cm`
                            : `اللون: ${healthyProduct!.color}`}
                        </Text>

                        <Group justify="space-between" mt={6}>
                          <Text
                            fw={700}
                            size="sm"
                            c={isCeramic ? "violet" : "teal"}
                          >
                            ${Number(product.price).toFixed(2)}
                          </Text>
                          <Badge
                            variant="light"
                            size="sm"
                            color={product.quantity > 0 ? "green" : "red"}
                          >
                            المخزون: {product.quantity}
                          </Badge>
                        </Group>

                        {inCart && (
                          <Badge
                            variant="filled"
                            size="sm"
                            mt={4}
                            fullWidth
                            color={isCeramic ? "violet" : "teal"}
                          >
                            {inCart.quantity} في السلة
                          </Badge>
                        )}
                      </Card>
                    );
                  })}
                </SimpleGrid>

                {filteredProducts.length === 0 && (
                  <Text ta="center" c="dimmed" py="xl">
                    لا توجد منتجات
                  </Text>
                )}
              </ScrollArea>
            </Box>
          </Paper>
        </Stack>

        {/* ====== RIGHT: Cart Sidebar (desktop only) ====== */}
        {!isMobile && (
          <Paper
            shadow="md"
            radius="md"
            withBorder
            style={{ position: "sticky", top: 76 }}
          >
            {/* Cart Header */}
            <Box
              p="md"
              style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
            >
              <Group justify="space-between">
                <Group gap={8}>
                  <ThemeIcon variant="light" color="blue" size="md">
                    <IconShoppingCart size={18} />
                  </ThemeIcon>
                  <Text fw={700} size="lg">
                    السلة
                  </Text>
                </Group>
                <Badge variant="filled" size="lg">
                  {cart.length} عنصر
                </Badge>
              </Group>
            </Box>

            {/* Cart Items */}
            <ScrollArea h={340} p="sm" offsetScrollbars>
              {cart.length === 0 ? (
                <Stack align="center" gap="xs" py="xl">
                  <IconShoppingCart
                    size={48}
                    color="var(--mantine-color-gray-4)"
                  />
                  <Text c="dimmed" size="sm">
                    لم يتم إضافة عناصر بعد
                  </Text>
                  <Text c="dimmed" size="xs">
                    انقر على المنتجات لإضافتها
                  </Text>
                </Stack>
              ) : (
                <Stack gap="xs">
                  {cart.map((item) => (
                    <Card
                      key={`${item.item_type}-${item.item_id}`}
                      padding="xs"
                      radius="sm"
                      withBorder
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={600} lineClamp={1}>
                            {item.title}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {item.details}
                          </Text>

                          {item.item_type === "ceramic" && (
                            <TextInput
                              placeholder="المكان (اختياري)"
                              value={item.place || ""}
                              onChange={(e) => {
                                const value = e.currentTarget.value;
                                setCart((prev) =>
                                  prev.map((c) =>
                                    c.item_id === item.item_id &&
                                    c.item_type === item.item_type
                                      ? { ...c, place: value }
                                      : c,
                                  ),
                                );
                              }}
                              size="xs"
                              mt={6}
                            />
                          )}

                          <Text size="xs" c="blue" fw={500}>
                            ${Number(item.price).toFixed(2)} للقطعة
                          </Text>
                        </Box>
                        <Tooltip label="إزالة العنصر">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() =>
                              removeFromCart(item.item_id, item.item_type)
                            }
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>

                      <Group justify="space-between" mt={6}>
                        <Group gap={4}>
                          <ActionIcon
                            variant="light"
                            size="sm"
                            onClick={() =>
                              updateCartQty(item.item_id, item.item_type, -1)
                            }
                          >
                            <IconMinus size={12} />
                          </ActionIcon>
                          <NumberInput
                            value={item.quantity}
                            onChange={(val) =>
                              setCartQty(
                                item.item_id,
                                item.item_type,
                                Number(val) || 0,
                              )
                            }
                            min={1}
                            max={item.maxQuantity}
                            size="xs"
                            w={60}
                            hideControls
                            styles={{
                              input: { textAlign: "center", fontWeight: 600 },
                            }}
                          />
                          <ActionIcon
                            variant="light"
                            size="sm"
                            onClick={() =>
                              updateCartQty(item.item_id, item.item_type, 1)
                            }
                          >
                            <IconPlus size={12} />
                          </ActionIcon>
                        </Group>
                        <Text fw={700} size="sm">
                          ${(item.price * item.quantity).toFixed(2)}
                        </Text>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </ScrollArea>

            {/* Totals & Actions */}
            <Box
              p="md"
              style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
            >
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    المجموع الفرعي
                  </Text>
                  <Text size="sm" fw={500}>
                    ${subtotal.toFixed(2)}
                  </Text>
                </Group>

                <NumberInput
                  label="الخصم"
                  value={discount}
                  onChange={(val) => setDiscount(Number(val) || 0)}
                  min={0}
                  max={subtotal}
                  decimalScale={2}
                  size="sm"
                  leftSection={<Text size="xs">$</Text>}
                />

                <NumberInput
                  label="سعر التوصيل"
                  value={delivery_price}
                  onChange={(val) => setDeliveryPrice(Number(val) || 0)}
                  min={0}
                  step={0.01}
                  decimalScale={2}
                  size="sm"
                  leftSection={<Text size="xs">$</Text>}
                />

                <Divider />

                <Group justify="space-between">
                  <Text fw={700} size="lg">
                    الإجمالي
                  </Text>
                  <Text fw={700} size="lg" c="green">
                    ${totalAmount.toFixed(2)}
                  </Text>
                </Group>

                {mode === "create" && (
                  <Paper withBorder radius="md" p="sm" mt="xs">
                    <Stack gap="xs">
                      <Checkbox
                        label="طباعة الفاتورة بعد الإنشاء"
                        checked={printAfterCreate}
                        onChange={(e) =>
                          setPrintAfterCreate(e.currentTarget.checked)
                        }
                      />

                      <SegmentedControl
                        value={printTemplate}
                        onChange={(v) =>
                          setPrintTemplate(v as "client" | "warehouse")
                        }
                        data={[
                          { label: "فاتورة العميل", value: "client" },
                          { label: "كشف تجهيز", value: "warehouse" },
                        ]}
                        disabled={!printAfterCreate}
                        size="sm"
                      />
                    </Stack>
                  </Paper>
                )}

                <Button
                  fullWidth
                  size="md"
                  leftSection={<IconReceipt size={18} />}
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={cart.length === 0 || !customerId}
                  color={invoiceType === "ceramic" ? "violet" : "teal"}
                  mt="xs"
                >
                  {mode === "create" ? "إنشاء فاتورة" : "تحديث الفاتورة"}
                </Button>

                <Button
                  fullWidth
                  variant="subtle"
                  color="gray"
                  onClick={() => router.push("/dashboard/invoices")}
                >
                  إلغاء
                </Button>
              </Stack>
            </Box>
          </Paper>
        )}
      </div>

      {/* Mobile: cart drawer + sticky action bar */}
      {isMobile && (
        <>
          <Drawer
            opened={cartOpened}
            onClose={cartDrawer.close}
            position="bottom"
            size="80%"
            title={`السلة (${cart.length})`}
          >
            <Paper shadow="md" radius="md" withBorder>
              {/* Cart Items */}
              <ScrollArea h={280} p="sm" offsetScrollbars>
                {cart.length === 0 ? (
                  <Stack align="center" gap="xs" py="xl">
                    <IconShoppingCart
                      size={48}
                      color="var(--mantine-color-gray-4)"
                    />
                    <Text c="dimmed" size="sm">
                      لم يتم إضافة عناصر بعد
                    </Text>
                    <Text c="dimmed" size="xs">
                      انقر على المنتجات لإضافتها
                    </Text>
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    {cart.map((item) => (
                      <Card
                        key={`${item.item_type}-${item.item_id}`}
                        padding="xs"
                        radius="sm"
                        withBorder
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={600} lineClamp={1}>
                              {item.title}
                            </Text>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {item.details}
                            </Text>

                            {item.item_type === "ceramic" && (
                              <TextInput
                                placeholder="المكان (اختياري)"
                                value={item.place || ""}
                                onChange={(e) => {
                                  const value = e.currentTarget.value;
                                  setCart((prev) =>
                                    prev.map((c) =>
                                      c.item_id === item.item_id &&
                                      c.item_type === item.item_type
                                        ? { ...c, place: value }
                                        : c,
                                    ),
                                  );
                                }}
                                size="xs"
                                mt={6}
                              />
                            )}

                            <Text size="xs" c="blue" fw={500}>
                              ${Number(item.price).toFixed(2)} للقطعة
                            </Text>
                          </Box>
                          <Tooltip label="إزالة العنصر">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() =>
                                removeFromCart(item.item_id, item.item_type)
                              }
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>

                        <Group justify="space-between" mt={6}>
                          <Group gap={4}>
                            <ActionIcon
                              variant="light"
                              size="sm"
                              onClick={() =>
                                updateCartQty(item.item_id, item.item_type, -1)
                              }
                            >
                              <IconMinus size={12} />
                            </ActionIcon>
                            <NumberInput
                              value={item.quantity}
                              onChange={(val) =>
                                setCartQty(
                                  item.item_id,
                                  item.item_type,
                                  Number(val) || 0,
                                )
                              }
                              min={1}
                              max={item.maxQuantity}
                              size="xs"
                              w={60}
                              hideControls
                              styles={{
                                input: {
                                  textAlign: "center",
                                  fontWeight: 600,
                                },
                              }}
                            />
                            <ActionIcon
                              variant="light"
                              size="sm"
                              onClick={() =>
                                updateCartQty(item.item_id, item.item_type, 1)
                              }
                            >
                              <IconPlus size={12} />
                            </ActionIcon>
                          </Group>
                          <Text fw={700} size="sm">
                            ${(item.price * item.quantity).toFixed(2)}
                          </Text>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )}
              </ScrollArea>

              {/* Totals & Actions */}
              <Box
                p="md"
                style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
              >
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      المجموع الفرعي
                    </Text>
                    <Text size="sm" fw={500}>
                      ${subtotal.toFixed(2)}
                    </Text>
                  </Group>

                  <NumberInput
                    label="الخصم"
                    value={discount}
                    onChange={(val) => setDiscount(Number(val) || 0)}
                    min={0}
                    max={subtotal}
                    decimalScale={2}
                    size="sm"
                    leftSection={<Text size="xs">$</Text>}
                  />

                  <NumberInput
                    label="سعر التوصيل"
                    value={delivery_price}
                    onChange={(val) => setDeliveryPrice(Number(val) || 0)}
                    min={0}
                    step={0.01}
                    decimalScale={2}
                    size="sm"
                    leftSection={<Text size="xs">$</Text>}
                  />

                  <Divider />

                  <Group justify="space-between">
                    <Text fw={700} size="lg">
                      الإجمالي
                    </Text>
                    <Text fw={700} size="lg" c="green">
                      ${totalAmount.toFixed(2)}
                    </Text>
                  </Group>

                  {mode === "create" && (
                    <Paper withBorder radius="md" p="sm" mt="xs">
                      <Stack gap="xs">
                        <Checkbox
                          label="طباعة الفاتورة بعد الإنشاء"
                          checked={printAfterCreate}
                          onChange={(e) =>
                            setPrintAfterCreate(e.currentTarget.checked)
                          }
                        />

                        <SegmentedControl
                          value={printTemplate}
                          onChange={(v) =>
                            setPrintTemplate(v as "client" | "warehouse")
                          }
                          data={[
                            { label: "فاتورة العميل", value: "client" },
                            { label: "كشف تجهيز", value: "warehouse" },
                          ]}
                          disabled={!printAfterCreate}
                          size="sm"
                        />
                      </Stack>
                    </Paper>
                  )}

                  <Button
                    fullWidth
                    size="md"
                    leftSection={<IconReceipt size={18} />}
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={cart.length === 0 || !customerId}
                    color={invoiceType === "ceramic" ? "violet" : "teal"}
                    mt="xs"
                  >
                    {mode === "create" ? "إنشاء فاتورة" : "تحديث الفاتورة"}
                  </Button>

                  <Button
                    fullWidth
                    variant="subtle"
                    color="gray"
                    onClick={() => router.push("/dashboard/invoices")}
                  >
                    إلغاء
                  </Button>
                </Stack>
              </Box>
            </Paper>
          </Drawer>

          <Affix position={{ bottom: 16, left: 16, right: 16 }}>
            <Paper shadow="md" radius="md" withBorder p="sm">
              <Group justify="space-between" wrap="nowrap">
                <Button
                  variant="light"
                  leftSection={<IconShoppingCart size={18} />}
                  onClick={cartDrawer.open}
                >
                  السلة ({cart.length})
                </Button>

                <Group gap={8}>
                  <Text fw={700} c="green" style={{ whiteSpace: "nowrap" }}>
                    ${totalAmount.toFixed(2)}
                  </Text>
                  <Button
                    leftSection={<IconReceipt size={18} />}
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={cart.length === 0 || !customerId}
                    color={invoiceType === "ceramic" ? "violet" : "teal"}
                  >
                    {mode === "create" ? "إنشاء" : "تحديث"}
                  </Button>
                </Group>
              </Group>
            </Paper>
          </Affix>
        </>
      )}

      {/* Product Details Modal */}
      <Modal
        opened={productDetailsOpened}
        onClose={() => {
          closeProductDetails();
          setSelectedProduct(null);
        }}
        title="تفاصيل المنتج"
        centered
        size="lg"
      >
        {!selectedProduct ? (
          <Center py="xl">
            <Loader size="md" />
          </Center>
        ) : (
          <Stack gap="sm">
            {selectedProduct.image_url && (
              <Image
                src={`/api${selectedProduct.image_url}`}
                h={180}
                fit="cover"
                radius="md"
                alt={selectedProduct.title}
                fallbackSrc="https://placehold.co/600x180?text=No+Image"
              />
            )}

            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fw={800} size="lg" lineClamp={2}>
                  {selectedProduct.title}
                </Text>
                <Text size="sm" c="dimmed">
                  {"bag" in selectedProduct
                    ? `${selectedProduct.bag} | ${selectedProduct.width}×${selectedProduct.height}cm`
                    : `اللون: ${selectedProduct.color}`}
                </Text>
              </Box>

              <Badge
                variant="light"
                color={selectedProduct.quantity > 0 ? "green" : "red"}
                style={{ whiteSpace: "nowrap" }}
              >
                المخزون: {selectedProduct.quantity}
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <Paper withBorder p="sm" radius="md">
                <Text size="xs" c="dimmed">
                  سعر البيع
                </Text>
                <Text fw={700}>
                  ${Number(selectedProduct.price).toFixed(2)}
                </Text>
              </Paper>

              {mode === "edit" && (
                <Paper withBorder p="sm" radius="md">
                  <Text size="xs" c="dimmed">
                    سعر الشراء
                  </Text>
                  <Text fw={700} c="orange">
                    ${Number(selectedProduct.main_price).toFixed(2)}
                  </Text>
                </Paper>
              )}
            </SimpleGrid>

            {"bag" in selectedProduct && (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                <Paper withBorder p="sm" radius="md">
                  <Text size="xs" c="dimmed">
                    الصندوق
                  </Text>
                  <Text fw={600}>{selectedProduct.bag}</Text>
                </Paper>
                <Paper withBorder p="sm" radius="md">
                  <Text size="xs" c="dimmed">
                    كمية الصندوق
                  </Text>
                  <Text fw={600}>{selectedProduct.bag_quantity}</Text>
                </Paper>
                <Paper withBorder p="sm" radius="md">
                  <Text size="xs" c="dimmed">
                    العرض
                  </Text>
                  <Text fw={600}>{selectedProduct.width} cm</Text>
                </Paper>
                <Paper withBorder p="sm" radius="md">
                  <Text size="xs" c="dimmed">
                    الارتفاع
                  </Text>
                  <Text fw={600}>{selectedProduct.height} cm</Text>
                </Paper>
              </SimpleGrid>
            )}

            <Group justify="flex-end" mt="xs">
              <Button
                variant="default"
                onClick={() => {
                  closeProductDetails();
                  setSelectedProduct(null);
                }}
              >
                إغلاق
              </Button>
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => {
                  addToCart(selectedProduct);
                  closeProductDetails();
                  setSelectedProduct(null);
                }}
                disabled={selectedProduct.quantity <= 0}
                color={"bag" in selectedProduct ? "violet" : "teal"}
              >
                إضافة إلى الفاتورة
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Customer Creation Modal */}
      <Modal
        opened={customerModalOpened}
        onClose={closeCustomerModal}
        title="إضافة عميل جديد"
        centered
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !customerForm.firstName ||
              !customerForm.lastName ||
              !customerForm.phoneNumber1 ||
              !customerForm.city
            ) {
              notifications.show({
                title: "تحقق",
                message: "يرجى ملء جميع الحقول المطلوبة",
                color: "orange",
              });
              return;
            }
            createCustomerMutation.mutate(customerForm);
          }}
        >
          <Stack gap="sm">
            <Group grow>
              <TextInput
                label="الاسم الأول"
                placeholder="أحمد"
                required
                value={customerForm.firstName}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    firstName: e.currentTarget.value,
                  })
                }
              />
              <TextInput
                label="اسم العائلة"
                placeholder="محمد"
                required
                value={customerForm.lastName}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    lastName: e.currentTarget.value,
                  })
                }
              />
            </Group>
            <Group grow>
              <TextInput
                label="رقم الهاتف 1"
                placeholder="0123456789"
                required
                value={customerForm.phoneNumber1}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    phoneNumber1: e.currentTarget.value,
                  })
                }
              />
              <TextInput
                label="رقم الهاتف 2"
                placeholder="اختياري"
                value={customerForm.phoneNumber2}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,
                    phoneNumber2: e.currentTarget.value,
                  })
                }
              />
            </Group>
            <TextInput
              label="المدينة"
              placeholder="بغداد"
              required
              value={customerForm.city}
              onChange={(e) =>
                setCustomerForm({
                  ...customerForm,
                  city: e.currentTarget.value,
                })
              }
            />
            <NumberInput
              label="المبلغ"
              placeholder="0.00"
              decimalScale={2}
              value={customerForm.amount}
              onChange={(val) =>
                setCustomerForm({ ...customerForm, amount: Number(val) || 0 })
              }
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeCustomerModal}>
                إلغاء
              </Button>
              <Button type="submit" loading={createCustomerMutation.isPending}>
                إنشاء
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}

// ====================================
// Outer wrapper: fetches data, computes initial values, then renders InvoiceFormInner
// ====================================
export default function InvoiceForm({
  mode,
  invoiceId,
}: {
  mode: "create" | "edit";
  invoiceId?: number;
}) {
  const { data: ceramicItems = [], isLoading: loadingCeramics } = useQuery<
    CeramicItem[]
  >({
    queryKey: ["ceramic-items"],
    queryFn: async () => {
      const { data } = await api.get("/items/ceramic");
      return data;
    },
  });

  const { data: healthyItems = [], isLoading: loadingHealthy } = useQuery<
    HealthyItem[]
  >({
    queryKey: ["healthy-items"],
    queryFn: async () => {
      const { data } = await api.get("/items/healthy");
      return data;
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data } = await api.get("/customers");
      return data;
    },
  });

  const { data: existingInvoice, isLoading: loadingInvoice } =
    useQuery<Invoice>({
      queryKey: ["invoice", invoiceId],
      queryFn: async () => {
        const { data } = await api.get(`/invoices/${invoiceId}`);
        return data;
      },
      enabled: mode === "edit" && !!invoiceId,
      staleTime: 0,
      refetchOnMount: "always",
    });

  // Wait for data in edit mode before rendering form
  if (mode === "edit" && (loadingInvoice || !existingInvoice)) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  // Compute initial values
  const initialValues: InitialValues =
    mode === "edit" && existingInvoice
      ? {
          invoiceType: existingInvoice.type,
          customerId: String(existingInvoice.customer_id),
          discount: Number(existingInvoice.discount) || 0,
          delivery_price: Number(existingInvoice.delivery_price) || 0,
          cart: buildCartFromInvoice(
            existingInvoice,
            ceramicItems,
            healthyItems,
          ),
        }
      : {
          invoiceType: "ceramic",
          customerId: "",
          discount: 0,
          delivery_price: 0,
          cart: [],
        };

  return (
    <InvoiceFormInner
      key={mode === "edit" ? `edit-${invoiceId}` : "create"}
      mode={mode}
      invoiceId={invoiceId}
      invoiceNumber={existingInvoice?.invoice_number}
      initialValues={initialValues}
      ceramicItems={ceramicItems}
      healthyItems={healthyItems}
      customers={customers}
      loadingCeramics={loadingCeramics}
      loadingHealthy={loadingHealthy}
    />
  );
}
