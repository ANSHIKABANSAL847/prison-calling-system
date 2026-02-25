"use client";

import { usePathname } from "next/navigation";
import AppShell from "./AppShell";

const PUBLIC_ROUTES = ["/login", "/"];

export default function ShellProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (isPublic) return <>{children}</>;

  return <AppShell>{children}</AppShell>;
}
