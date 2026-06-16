"use client";

import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  fontFamily: "var(--font-cairo), Arial, Helvetica, sans-serif",
  headings: {
    fontFamily: "var(--font-cairo), Arial, Helvetica, sans-serif",
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-left" zIndex={2077} />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
}
