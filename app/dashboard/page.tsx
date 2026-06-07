"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import CalendarView, { TimeSlot } from "@/components/CalendarView";
import TasksView from "@/components/TasksView";
import SettingsView from "@/components/SettingsView";
import AddTaskModal, { ModalPreset } from "@/components/AddTaskModal";
import { Event, Tab, ConnectionState } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [modalPreset, setModalPreset] = useState<ModalPreset | undefined>();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({
    connected: false,
    provider: null,
    email: null,
  });

  useEffect(() => {
    const saved = localStorage.getItem("calendar_connection");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ConnectionState;
        if (parsed.connected && parsed.provider) {
          setConnection(parsed);
          setReady(true);
          return;
        }
      } catch { /* ignore */ }
    }
    router.push("/");
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    if (connection.connected) {
      localStorage.setItem("calendar_connection", JSON.stringify(connection));
    } else {
      localStorage.removeItem("calendar_connection");
      router.push("/");
    }
  }, [connection, ready, router]);

  const openModal = (preset?: ModalPreset) => {
    setModalPreset(preset);
    setShowModal(true);
  };

  const provider = connection.provider;
  if (!connection.connected) return null;

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        connection={connection}
        setConnection={setConnection}
      />
      <main className="main-content">
        {activeTab === "dashboard" && (
          <Dashboard
            events={events}
            setEvents={setEvents}
            loading={loading}
            setLoading={setLoading}
            onAddTask={() => openModal()}
            connection={connection}
          />
        )}
        {activeTab === "calendar" && provider && (
          <CalendarView
            provider={provider}
            onCreateAtSlot={(slot: TimeSlot) => openModal(slot)}
          />
        )}
        {activeTab === "tasks" && provider && (
          <TasksView provider={provider} onAddTask={() => openModal()} />
        )}
        {activeTab === "settings" && (
          <SettingsView connection={connection} setConnection={setConnection} />
        )}
      </main>
      {showModal && (
        <AddTaskModal
          onClose={() => { setShowModal(false); setModalPreset(undefined); }}
          onAdd={(e) => setEvents((prev) => [...prev, e])}
          setLoading={setLoading}
          connection={connection}
          preset={modalPreset}
        />
      )}
    </div>
  );
}
