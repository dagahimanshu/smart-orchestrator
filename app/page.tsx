"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import AddTaskModal from "@/components/AddTaskModal";
import { Event, Tab } from "@/types";
import { getAuthStatus } from "@/lib/api";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncAuthStatus() {
      try {
        const isAuthorized = await getAuthStatus();
        if (!cancelled) {
          setAuthorized(isAuthorized);
        }
      } catch {
        if (!cancelled) {
          setAuthorized(false);
        }
      }
    }

    syncAuthStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        authorized={authorized}
        setAuthorized={setAuthorized}
        setLoading={setLoading}
      />
      <main className="main-content">
        <Dashboard
          events={events}
          setEvents={setEvents}
          loading={loading}
          setLoading={setLoading}
          onAddTask={() => setShowModal(true)}
        />
      </main>
      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onAdd={(e) => setEvents((prev) => [...prev, e])}
          setLoading={setLoading}
        />
      )}
    </div>
  );
}
