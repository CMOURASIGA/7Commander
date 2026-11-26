"use client";
import { installDemoRuntime } from "@/lib/demo/runtime";

export function DemoBootstrap({ children }: { children: React.ReactNode }) {
  installDemoRuntime();
  return children;
}

