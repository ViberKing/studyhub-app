"use client";

import { Suspense, useEffect, useState, useCallback, useMemo, useRef } from "react";
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
type EventType = "assignment" | "exam" | "study" | "social" | "custom" | "lecture";

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
  lecture: "#0ea5e9",
};

/* ── ICS Parser ── */
function parseICS(text: string): { title: string; start: Date; end: Date; allDay: boolean; location?: string }[] {
  const events: { title: string; start: Date; end: Date; allDay: boolean; location?: string }[] = [];
  const blocks = text.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const lines: string[] = [];
    // Unfold lines (lines starting with space/tab are continuations)
    for (const raw of block.split(/\r?\n/)) {
      if (raw.startsWith(" ") || raw.startsWith("\t")) {
        if (lines.length) lines[lines.length - 1] += raw.slice(1);
      } else {
        lines.push(raw);
      }
    }

    let summary = "";
    let dtstart = "";
    let dtend = "";
    let location = "";

    for (const line of lines) {
      if (line.startsWith("SUMMARY")) summary = line.split(/:(.+)/)[1] || "";
      else if (line.startsWith("DTSTART")) dtstart = line.split(/:(.+)/)[1] || "";
      else if (line.startsWith("DTEND")) dtend = line.split(/:(.+)/)[1] || "";
      else if (line.startsWith("LOCATION")) location = line.split(/:(.+)/)[1] || "";
    }

    if (!summary || !dtstart) continue;

    const parseDate = (s: string): Date => {
      // Handle YYYYMMDD (all-day) and YYYYMMDDTHHMMSS and YYYYMMDDTHHMMSSZ
      const clean = s.replace("Z", "");
      if (clean.length === 8) {
        return new Date(+clean.slice(0,4), +clean.slice(4,6)-1, +clean.slice(6,8));
      }
      return new Date(
        +clean.slice(0,4), +clean.slice(4,6)-1, +clean.slice(6,8),
        +clean.slice(9,11), +clean.slice(11,13), +clean.slice(13,15) || 0
      );
    };

    const start = parseDate(dtstart);
    const end = dtend ? parseDate(dtend) : new Date(start.getTime() + 3600000);
    const allDay = dtstart.length <= 8 || (!dtstart.includes("T"));

    const titleParts = [summary.trim()];
    if (location.trim()) titleParts.push(`@ ${location.trim()}`);

    events.push({ title: titleParts.join(" "), start, end, allDay, location: location.trim() });
  }

  return events;
}

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
              <option value="lecture">Lecture</option>
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

  // Timetable upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [parsedEvents, setParsedEvents] = useState<{ title: string; start: Date; end: Date; allDay: boolean; location?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const events = parseICS(text);
      setParsedEvents(events);
      setShowUploadModal(true);
      setUploadDone(false);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, []);

  const handleImport = useCallback(async () => {
    if (!userId || parsedEvents.length === 0) return;
    if (!gate("core")) return;
    setUploading(true);

    const rows = parsedEvents.map(ev => ({
      user_id: userId,
      title: ev.title,
      event_type: "lecture" as const,
      start_at: ev.start.toISOString(),
      end_at: ev.end.toISOString(),
      all_day: ev.allDay,
    }));

    // Insert in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      await supabase.from("calendar_events").insert(rows.slice(i, i + 50));
    }

    setUploading(false);
    setUploadDone(true);
    loadEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, parsedEvents]);

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
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-ghost"
              onClick={() => fileInputRef.current?.click()}
              title="Upload university timetable (.ics file)"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload timetable
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics,.ical,.ifb,.icalendar"
              style={{ display: "none" }}
              onChange={handleFileSelect}
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

        {/* Timetable upload preview modal */}
        {showUploadModal && (
          <div className="modal-bg open" onClick={() => { setShowUploadModal(false); setParsedEvents([]); }}>
            <div className="modal" style={{ maxWidth: 560, width: "100%" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>
                  {uploadDone ? "Timetable imported!" : "Preview timetable"}
                </h3>
                <button
                  onClick={() => { setShowUploadModal(false); setParsedEvents([]); setUploadDone(false); }}
                  style={{ background: "none", border: "none", fontSize: 22, color: "var(--text-muted)", cursor: "pointer" }}
                >
                  &times;
                </button>
              </div>

              {uploadDone ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>&#10003;</div>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                    {parsedEvents.length} events added to your calendar
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                    Your lectures and classes are now showing on your calendar. You can edit or delete them like any other event.
                  </p>
                  <button className="btn btn-grad" onClick={() => { setShowUploadModal(false); setParsedEvents([]); setUploadDone(false); }} style={{ width: "100%" }}>
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                    Found <strong>{parsedEvents.length}</strong> events in your timetable file. Check the preview below, then click Import to add them all.
                  </p>

                  {parsedEvents.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                      No events found in this file. Make sure it&apos;s a valid .ics timetable file from your university.
                    </div>
                  ) : (
                    <div style={{ maxHeight: 340, overflowY: "auto", marginBottom: 16, border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                      {parsedEvents.slice(0, 50).map((ev, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "10px 14px",
                            borderBottom: i < Math.min(parsedEvents.length, 50) - 1 ? "1px solid var(--border)" : "none",
                            fontSize: 13,
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{ev.title}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                            {ev.allDay
                              ? format(ev.start, "EEE d MMM yyyy")
                              : `${format(ev.start, "EEE d MMM yyyy, HH:mm")} – ${format(ev.end, "HH:mm")}`}
                          </div>
                        </div>
                      ))}
                      {parsedEvents.length > 50 && (
                        <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-subtle)", textAlign: "center" }}>
                          + {parsedEvents.length - 50} more events
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn btn-ghost" onClick={() => { setShowUploadModal(false); setParsedEvents([]); }}>
                      Cancel
                    </button>
                    <button className="btn btn-grad" onClick={handleImport} disabled={uploading || parsedEvents.length === 0}>
                      {uploading ? "Importing..." : `Import ${parsedEvents.length} events`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function CalendarPage() {
  return <Suspense><CalendarInner /></Suspense>;
}
