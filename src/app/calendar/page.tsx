"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, dateFnsLocalizer, type View, type SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addHours, addDays, startOfMonth, endOfMonth, subDays } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

import AppShell, { useAppContext } from "@/components/AppShell";
import { useGate } from "@/components/GateModal";
import { createClient } from "@/lib/supabase";
import PageGuide from "@/components/PageGuide";

/* ── date-fns localizer ── */
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

/* ── Types ── */
type EventType = "assignment" | "exam" | "study" | "social" | "custom";

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  type: EventType;
  editable: boolean;
  resource?: string; // module
}

const TYPE_COLORS: Record<EventType, string> = {
  assignment: "#f59e0b",
  exam: "#ef4444",
  study: "#E11D48",
  social: "#10b981",
  custom: "#8b5cf6",
};

/* ── Demo data ── */
function buildDemoEvents(): CalEvent[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return [
    { id: "d1", title: "Plato's Republic essay due", start: addDays(today, 2), end: addDays(today, 2), allDay: true, type: "assignment", editable: false },
    { id: "d2", title: "IR Theory midterm", start: addDays(today, 5), end: addDays(today, 5), allDay: true, type: "exam", editable: false },
    { id: "d3", title: "Study: Philosophy", start: addHours(today, 9), end: addHours(today, 10), type: "study", editable: false },
    { id: "d4", title: "Study: Economics", start: addHours(addDays(today, -1), 14), end: addHours(addDays(today, -1), 15), type: "study", editable: false },
    { id: "d5", title: "Group project meeting", start: addHours(addDays(today, 1), 15), end: addHours(addDays(today, 1), 16), type: "social", editable: true },
    { id: "d6", title: "Microeconomics revision", start: addHours(addDays(today, 3), 10), end: addHours(addDays(today, 3), 12), type: "custom", editable: true },
    { id: "d7", title: "Study group @ library", start: addHours(addDays(today, -2), 16), end: addHours(addDays(today, -2), 17.5), type: "social", editable: true },
    { id: "d8", title: "Microeconomics problem set", start: addDays(today, -3), end: addDays(today, -3), allDay: true, type: "assignment", editable: false },
  ];
}

/* ── Modal component ── */
function EventModal({
  slot,
  event,
  onClose,
  onSave,
  onDelete,
}: {
  slot?: { start: Date; end: Date };
  event?: CalEvent;
  onClose: () => void;
  onSave: (data: { title: string; type: EventType; start: Date; end: Date; allDay: boolean; module: string }) => void;
  onDelete?: () => void;
}) {
  const editing = !!event;
  const [title, setTitle] = useState(event?.title || "");
  const [type, setType] = useState<EventType>(event?.type || "custom");
  const [allDay, setAllDay] = useState(event?.allDay ?? (slot ? slot.start.getHours() === 0 && slot.end.getHours() === 0 : false));
  const [module, setModule] = useState(event?.resource || "");

  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [startStr, setStartStr] = useState(fmt(event?.start || slot?.start || new Date()));
  const [endStr, setEndStr] = useState(fmt(event?.end || slot?.end || addHours(new Date(), 1)));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      type,
      start: new Date(startStr),
      end: new Date(endStr),
      allDay,
      module: module.trim(),
    });
  }

  return (
    <div className="modal-bg open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>{editing ? "Edit event" : "New event"}</h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Title</label>
            <div className="field" style={{ marginBottom: 0 }}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Type</label>
            <div className="field" style={{ marginBottom: 0 }}>
            <select value={type} onChange={(e) => setType(e.target.value as EventType)}>
              <option value="custom">Custom</option>
              <option value="exam">Exam</option>
              <option value="study">Study</option>
              <option value="social">Social</option>
            </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="allday"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              style={{ accentColor: "var(--red, #E11D48)" }}
            />
            <label htmlFor="allday" style={{ fontSize: 13 }}>All day</label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Start</label>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type={allDay ? "date" : "datetime-local"}
                  value={allDay ? startStr.slice(0, 10) : startStr}
                  onChange={(e) => setStartStr(allDay ? e.target.value + "T00:00" : e.target.value)}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>End</label>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type={allDay ? "date" : "datetime-local"}
                  value={allDay ? endStr.slice(0, 10) : endStr}
                  onChange={(e) => setEndStr(allDay ? e.target.value + "T23:59" : e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Module (optional)</label>
            <div className="field" style={{ marginBottom: 0 }}>
              <input
                value={module}
                onChange={(e) => setModule(e.target.value)}
                placeholder="e.g. PH1011"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
            {editing && onDelete && (
              <button type="button" className="btn btn-danger" style={{ marginRight: "auto" }} onClick={onDelete}>
                Delete
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-grad">{editing ? "Save" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main calendar page ── */
function CalendarInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const { userId } = useAppContext();
  const supabase = createClient();
  const { gate } = useGate();

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());

  // Modal state
  const [modalSlot, setModalSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [modalEvent, setModalEvent] = useState<CalEvent | null>(null);

  const loadEvents = useCallback(async () => {
    if (isDemo) {
      setEvents(buildDemoEvents());
      setLoading(false);
      return;
    }
    if (!userId) { setLoading(false); return; }

    const rangeStart = subDays(startOfMonth(date), 7).toISOString();
    const rangeEnd = addDays(endOfMonth(date), 7).toISOString();

    const [calRes, assignRes, sessRes] = await Promise.all([
      supabase
        .from("calendar_events")
        .select("id, title, event_type, start_at, end_at, all_day")
        .eq("user_id", userId)
        .gte("start_at", rangeStart)
        .lte("start_at", rangeEnd),
      supabase
        .from("assignments")
        .select("id, title, module, due")
        .eq("user_id", userId)
        .gte("due", rangeStart.slice(0, 10))
        .lte("due", rangeEnd.slice(0, 10)),
      supabase
        .from("study_sessions")
        .select("id, module, minutes, recorded_at")
        .eq("user_id", userId)
        .gte("recorded_at", rangeStart)
        .lte("recorded_at", rangeEnd),
    ]);

    const mapped: CalEvent[] = [];

    // Calendar events
    (calRes.data || []).forEach((e) => {
      mapped.push({
        id: `cal-${e.id}`,
        title: e.title,
        start: new Date(e.start_at),
        end: new Date(e.end_at),
        allDay: e.all_day,
        type: (e.event_type as EventType) || "custom",
        editable: true,
      });
    });

    // Assignments as all-day events
    (assignRes.data || []).forEach((a) => {
      const d = new Date(a.due + "T00:00:00");
      mapped.push({
        id: `asgn-${a.id}`,
        title: `${a.title}`,
        start: d,
        end: d,
        allDay: true,
        type: "assignment",
        editable: false,
        resource: a.module,
      });
    });

    // Study sessions as timed events
    (sessRes.data || []).forEach((s) => {
      const start = new Date(s.recorded_at);
      const end = new Date(start.getTime() + (s.minutes || 25) * 60000);
      mapped.push({
        id: `sess-${s.id}`,
        title: `Study: ${s.module || "General"}`,
        start,
        end,
        type: "study",
        editable: false,
        resource: s.module,
      });
    });

    setEvents(mapped);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, userId, date]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  /* ── Event styling ── */
  const eventPropGetter = useCallback((event: CalEvent) => {
    const bg = TYPE_COLORS[event.type] || TYPE_COLORS.custom;
    return {
      style: {
        backgroundColor: bg + "22",
        color: bg,
        borderLeft: `3px solid ${bg}`,
        fontWeight: 600,
      },
    };
  }, []);

  /* ── Slot select (create) ── */
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setModalEvent(null);
    setModalSlot({ start: slotInfo.start, end: slotInfo.end });
  }, []);

  /* ── Event click (edit) ── */
  const handleSelectEvent = useCallback((event: CalEvent) => {
    if (!event.editable) return; // Don't edit assignments/sessions
    setModalSlot(null);
    setModalEvent(event);
  }, []);

  /* ── Save event ── */
  const handleSave = useCallback(async (data: { title: string; type: EventType; start: Date; end: Date; allDay: boolean; module: string }) => {
    if (!gate("core")) return;
    if (!userId) return;

    if (modalEvent) {
      // Update existing
      const realId = modalEvent.id.replace("cal-", "");
      await supabase.from("calendar_events").update({
        title: data.title,
        event_type: data.type,
        start_at: data.start.toISOString(),
        end_at: data.end.toISOString(),
        all_day: data.allDay,
      }).eq("id", realId).eq("user_id", userId);
    } else {
      // Insert new
      await supabase.from("calendar_events").insert({
        user_id: userId,
        title: data.title,
        event_type: data.type,
        start_at: data.start.toISOString(),
        end_at: data.end.toISOString(),
        all_day: data.allDay,
      });
    }

    setModalSlot(null);
    setModalEvent(null);
    loadEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, userId, modalEvent]);

  /* ── Delete event ── */
  const handleDelete = useCallback(async () => {
    if (!gate("core")) return;
    if (!modalEvent) return;
    if (!userId) return;
    const realId = modalEvent.id.replace("cal-", "");
    await supabase.from("calendar_events").delete().eq("id", realId).eq("user_id", userId);
    setModalEvent(null);
    loadEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, userId, modalEvent]);

  /* ── Legend ── */
  const legend = useMemo(() => (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
      {(Object.entries(TYPE_COLORS) as [EventType, string][]).map(([t, c]) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: "inline-block" }} />
          <span style={{ textTransform: "capitalize", color: "var(--text-muted)" }}>{t}</span>
        </div>
      ))}
    </div>
  ), []);

  return (
    <AppShell>
      <div className="page active" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Calendar</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Assignments, study sessions, and your events in one view.
            </p>
          </div>
          <PageGuide
            id="calendar"
            title="How to use the Calendar"
            steps={[
              "Your assignments and study sessions appear automatically — no need to add them twice.",
              "Click any date to add a custom event (e.g. society meetup, deadline reminder).",
              "Click an existing event to edit or delete it.",
              "Switch between month, week, and day views to see your schedule at different levels of detail.",
            ]}
          />
          <button
            className="btn btn-grad"
            onClick={() => {
              setModalEvent(null);
              setModalSlot({ start: new Date(), end: addHours(new Date(), 1) });
            }}
          >
            + New event
          </button>
        </div>

        {legend}

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="loader" />
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0 }}>
            <Calendar<CalEvent>
              localizer={localizer}
              events={events}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              views={["month", "week", "day", "agenda"]}
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventPropGetter}
              style={{ height: "100%" }}
              popup
              tooltipAccessor={(e) => `${e.title}${e.resource ? ` (${e.resource})` : ""}`}
            />
          </div>
        )}

        {/* Create / Edit modal */}
        {(modalSlot || modalEvent) && (
          <EventModal
            slot={modalSlot || undefined}
            event={modalEvent || undefined}
            onClose={() => { setModalSlot(null); setModalEvent(null); }}
            onSave={handleSave}
            onDelete={modalEvent ? handleDelete : undefined}
          />
        )}
      </div>
    </AppShell>
  );
}

export default function CalendarPage() {
  return <Suspense><CalendarInner /></Suspense>;
}
