"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Stack,
  Center,
  Box,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconLock } from "@tabler/icons-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { LoginResponse, User } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, setToken } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setInlineError(null);
    try {
      // Login to get token
      const { data: loginData } = await api.post<LoginResponse>("/auth/login", {
        username,
        password,
      });

      // Persist token immediately so refresh and follow-up requests keep it.
      setToken(loginData.accessToken);

      // Fetch user info
      const { data: user } = await api.get<User>("/auth/me");

      setAuth(loginData.accessToken, user);

      notifications.show({
        title: "مرحباً!",
        message: `تم تسجيل الدخول كـ ${user.name}`,
        color: "green",
      });

      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message =
        error.response?.data?.message || "بيانات الاعتماد غير صالحة";

      setInlineError(message);
      notifications.show({
        title: "فشل تسجيل الدخول",
        message,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center style={{ minHeight: "100vh" }} bg="gray.1">
      <Paper shadow="xl" p={40} radius="md" w={420}>
        <Stack align="center" gap="xs" mb="lg">
          <Box
            style={{
              background: "var(--mantine-color-blue-6)",
              borderRadius: "50%",
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconLock size={32} color="white" />
          </Box>
          <Title order={2}>مرحباً بعودتك</Title>
          <Text c="dimmed" size="sm">
            تسجيل الدخول إلى حسابك
          </Text>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="اسم المستخدم"
              placeholder="أدخل اسم المستخدم"
              required
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              size="md"
            />
            <PasswordInput
              label="كلمة المرور"
              placeholder="أدخل كلمة المرور"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              size="md"
            />
            <Button type="submit" fullWidth loading={loading} size="md" mt="xs">
              تسجيل الدخول
            </Button>
            {inlineError && (
              <Text size="sm" c="red" ta="center">
                {inlineError}
              </Text>
            )}
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
