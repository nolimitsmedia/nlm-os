// src/router.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { createBrowserRouter } from "react-router-dom";

import AppShell from "./ui/layout/AppShell";
import ClientsList from "./ui/pages/ClientsList";
import Client360 from "./ui/pages/Client360";
import ClientOverview from "./ui/pages/ClientOverview";
import ClientTasksPage from "./ui/pages/ClientTasksPage";
import LoginPage from "./ui/pages/LoginPage";
import Dashboard from "./ui/pages/Dashboard";
import SharePointPage from "./ui/pages/SharePointPage";

function ComingSoon({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      style={{
        maxWidth: 860,
        padding: 18,
        borderRadius: 18,
        border: "1px solid rgba(255, 255, 255, 0.16)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.14))",
        backdropFilter: "blur(18px)",
        boxShadow:
          "0 26px 70px rgba(2, 6, 23, 0.40), 0 1px 0 rgba(255,255,255,0.10) inset",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 0.2,
          color: "rgba(15, 23, 42, 0.65)",
          marginBottom: 8,
        }}
      >
        Module
      </div>

      <h2 style={{ margin: "0 0 8px", fontSize: 22, letterSpacing: -0.3 }}>
        {title}
      </h2>

      <div style={{ color: "rgba(15, 23, 42, 0.62)", fontSize: 13 }}>
        {hint || "Coming soon…"}
      </div>

      <div style={{ height: 12 }} />

      <div
        style={{
          display: "inline-flex",
          gap: 8,
          alignItems: "center",
          padding: "8px 10px",
          borderRadius: 999,
          border: "1px solid rgba(59, 130, 246, 0.22)",
          background: "rgba(59, 130, 246, 0.14)",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        <span>Roadmap</span>
        <span style={{ opacity: 0.65 }}>•</span>
        <span style={{ opacity: 0.8 }}>In progress</span>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "sharepoint", element: <SharePointPage /> },
      {
        path: "copilot",
        element: (
          <ComingSoon
            title="Copilot"
            hint="AI assistant, quick actions, and smart summaries will live here."
          />
        ),
      },
      { index: true, element: <ClientsList /> },
      {
        path: "clients/:clientId",
        element: <Client360 />,
        children: [
          { index: true, element: <ClientOverview /> },
          { path: "tasks", element: <ClientTasksPage /> },
          {
            path: "billing",
            element: (
              <ComingSoon
                title="Billing"
                hint="Invoices, recurring billing, and payment history will appear here."
              />
            ),
          },
          {
            path: "tickets",
            element: (
              <ComingSoon
                title="Tickets"
                hint="Support tickets, statuses, and internal notes will appear here."
              />
            ),
          },
          {
            path: "projects",
            element: (
              <ComingSoon
                title="Projects"
                hint="Project boards, milestones, and deliverables will appear here."
              />
            ),
          },
          {
            path: "assets",
            element: (
              <ComingSoon
                title="Assets"
                hint="Inventory, systems, licenses, and environment details will appear here."
              />
            ),
          },
          {
            path: "notes",
            element: (
              <ComingSoon
                title="Notes"
                hint="Client notes, meeting logs, and documentation will appear here."
              />
            ),
          },
          { path: "*", element: <Navigate to="." replace /> },
        ],
      },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
