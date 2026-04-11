"use client";

import { useState, useRef, useEffect } from "react";
import { universities, type University } from "@/lib/universities";

interface UniSelectorProps {
  value: string;
  onChange: (uni: University) => void;
  compact?: boolean;
}

export default function UniSelector({ value, onChange, compact }: UniSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = universities.find(u => u.id === value);
  const filtered = search
    ? universities.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.city.toLowerCase().includes(search.toLowerCase())
      )
    : universities;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="uni-selector" ref={ref}>
      <button
        className={`uni-selector-trigger${compact ? " compact" : ""}`}
        onClick={() => { setOpen(!open); setSearch(""); }}
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
        <span>{selected?.name || "Select university"}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="uni-selector-dropdown">
          <div className="uni-selector-search">
            <input
              type="text"
              placeholder="Search universities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="uni-selector-list">
            {filtered.length ? filtered.map(uni => (
              <button
                key={uni.id}
                className={`uni-selector-option${uni.id === value ? " active" : ""}`}
                onClick={() => { onChange(uni); setOpen(false); }}
                type="button"
              >
                <span className="uni-selector-name">{uni.name}</span>
                <span className="uni-selector-city">{uni.city}</span>
              </button>
            )) : (
              <div className="uni-selector-empty">No universities found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
