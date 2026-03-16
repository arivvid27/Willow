// app/dashboard/layout.tsx
// Dashboard shell: sidebar + main content area

import Sidebar from "@/components/Sidebar";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh" style={{ background: "var(--color-bg)" }}>
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main
          id="main-content"
          className="flex-1 px-5 py-7 lg:px-8 lg:py-8 max-w-3xl w-full mx-auto"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
