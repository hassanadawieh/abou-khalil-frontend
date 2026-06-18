"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AppShell,
  Burger,
  Center,
  Group,
  Image,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { User } from "@/types";
import Sidebar from "@/components/sidebar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);
  const setUser = useAuthStore((s) => s.setUser);
  const [opened, { toggle, close }] = useDisclosure();
  const navbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (opened) {
      navbarRef.current?.scrollTo({ top: 0 });
    }
  }, [opened]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const { data: restoredUser, isLoading: restoringUser } = useQuery<User>({
    queryKey: ["auth-me", token],
    queryFn: async () => {
      const { data } = await api.get<User>("/auth/me");
      return data;
    },
    enabled: hydrated && !!token && !user,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (restoredUser && !user) {
      setUser(restoredUser);
    }
  }, [restoredUser, setUser, user]);

  useEffect(() => {
    if (!hydrated) return;

    if (!token) {
      router.replace("/login");
    }
  }, [hydrated, router, token]);

  const shouldBlock = useMemo(
    () => !hydrated || !token || (!!token && !user && restoringUser),
    [hydrated, restoringUser, token, user],
  );

  if (shouldBlock) {
    return (
      <Center style={{ minHeight: "100vh" }}>
        <Stack align="center" gap="xs">
          <Loader size="md" />
          <Text size="sm" c="dimmed">
            جاري التحميل...
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding={{ base: "sm", sm: "md" }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" gap="md" justify="flex-start">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Image
            src="/assets/logo-ak.svg"
            alt="Logo"
            h={45}
            w="auto"
            style={{ marginRight: "8px" }}
          />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar ref={navbarRef}>
        <Sidebar onNavigate={close} />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
