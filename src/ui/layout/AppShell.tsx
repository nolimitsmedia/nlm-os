// src/ui/layout/AppShell.tsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getAuthToken, logout, me } from "../../api";
import TaskDisplayDrawer from "../components/TaskDisplayDrawer";
import "./AppShell.css";

type MeUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function getClientIdFromPath(pathname: string) {
  const match = pathname.match(/^\/clients\/([^/]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export default function AppShell() {
  const nav = useNavigate();
  const loc = useLocation();

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<MeUser | null>(null);
  const [isClickUpDrawerOpen, setIsClickUpDrawerOpen] = useState(false);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 980;
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 980;
  });

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 980;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let alive = true;

    async function run() {
      setChecking(true);

      const token = getAuthToken();
      if (!token) {
        if (alive) {
          setChecking(false);
          nav("/login", { replace: true, state: { from: loc.pathname } });
        }
        return;
      }

      try {
        const data = await me();
        const u = (data as any)?.user || (data as any)?.data?.user || null;
        if (alive) setUser(u);
      } catch {
        logout();
        if (alive) {
          nav("/login", { replace: true, state: { from: loc.pathname } });
        }
      } finally {
        if (alive) setChecking(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const links = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard", icon: "📊" },
      { to: "/", label: "Clients", icon: "🗂️" },
      { to: "/sharepoint", label: "SharePoint", icon: "📁" },
    ],
    [],
  );

  const isAdminUser = useMemo(() => {
    const role = String(user?.role || "admin")
      .trim()
      .toLowerCase();

    return (
      role.includes("admin") ||
      role.includes("owner") ||
      role.includes("manager") ||
      role === ""
    );
  }, [user?.role]);

  const activeClientId = useMemo(
    () => getClientIdFromPath(loc.pathname),
    [loc.pathname],
  );

  function onLogout() {
    logout();
    nav("/login", { replace: true });
  }

  function toggleSidebar() {
    setSidebarOpen((v) => !v);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function openClickUpDrawer() {
    if (!isAdminUser) return;
    setIsClickUpDrawerOpen(true);
    if (isMobile) setSidebarOpen(false);
  }

  function closeClickUpDrawer() {
    setIsClickUpDrawerOpen(false);
  }

  const isDesktop = !isMobile;
  const isDesktopCollapsed = isDesktop && !sidebarOpen;

  if (checking) {
    return (
      <div className="nlmLoading">
        <div className="nlmLoadingInner">
          <div className="nlmLoadingMark">N</div>
          <div>
            <div className="nlmLoadingTitle">NLM OS</div>
            <div className="nlmLoadingSub">Loading…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nlmShell">
      {isMobile && !sidebarOpen && (
        <button
          className="nlmFloatToggle"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          ☰
        </button>
      )}

      {isMobile && sidebarOpen && (
        <div
          className="nlmBackdrop"
          role="button"
          aria-label="Close sidebar"
          tabIndex={0}
          onClick={closeSidebar}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") closeSidebar();
          }}
        />
      )}

      <div className="nlmBody">
        <aside
          className={cx(
            "nlmSidebar",
            !sidebarOpen && "nlmSidebarClosed",
            isMobile && "nlmSidebarMobile",
          )}
        >
          <div className="nlmSidebarInner">
            <div className="nlmSidebarHeaderRow">
              <button
                className="nlmIconBtn"
                onClick={toggleSidebar}
                aria-label="Toggle sidebar"
                title="Toggle sidebar"
              >
                ☰
              </button>

              <div className="nlmBrandCard">
                <div className="nlmBrandMark">N</div>
                <div className="nlmBrandCardText">
                  <div className="nlmBrandCardTitle">No Limits Media</div>
                  <div className="nlmBrandCardSub">Operations System</div>
                </div>
              </div>
            </div>

            <div className="nlmNavTitle">Navigation</div>

            <nav className="nlmNav">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    cx("nlmNavItem", isActive && "nlmNavItemActive")
                  }
                  end={l.to === "/"}
                >
                  <span className="nlmNavIcon">{l.icon}</span>
                  <span className="nlmNavLabel">{l.label}</span>
                </NavLink>
              ))}
            </nav>

            {isAdminUser ? (
              <div className="nlmSidebarActions">
                <div className="nlmNavTitle">Workspace</div>

                <button
                  type="button"
                  className={cx(
                    "nlmNavItem",
                    "nlmSidebarActionBtn",
                    isClickUpDrawerOpen && "nlmNavItemActive",
                  )}
                  onClick={openClickUpDrawer}
                  title="Open ClickUp workspace"
                  aria-label="Open ClickUp workspace"
                >
                  <span className="nlmNavIcon">⚡</span>
                  <span className="nlmNavLabel">ClickUp</span>
                </button>
              </div>
            ) : null}

            <div className="nlmSidebarFooter">
              {isDesktopCollapsed ? (
                <button
                  className="nlmLogoutIcon"
                  onClick={onLogout}
                  aria-label="Logout"
                  title="Logout"
                >
                  ⎋
                </button>
              ) : (
                <div className="nlmSignedCard">
                  <div className="nlmSignedTitle">Signed in as</div>
                  <div className="nlmSignedRole">
                    Role: {user?.role || "admin"}
                  </div>
                  <div className="nlmSignedName">{user?.name || "Admin"}</div>
                  <div className="nlmSignedMeta">{user?.email}</div>

                  <button className="nlmSignedLogout" onClick={onLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="nlmMain">
          <div className="nlmPageSurface">
            <Outlet />
          </div>
        </main>
      </div>

      <TaskDisplayDrawer
        open={isClickUpDrawerOpen}
        onClose={closeClickUpDrawer}
        initialClientId={activeClientId}
      />
    </div>
  );
}
