"use client";

import { useState, useEffect } from "react";

interface PageGuideProps {
  id: string;
  title: string;
  steps: string[];
}

export default function PageGuide({ id, title, steps }: PageGuideProps) {
  const storageKey = `guide_dismissed_${id}`;
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(storageKey, "1");
  }

  function show() {
    setDismissed(false);
    localStorage.removeItem(storageKey);
  }

  if (dismissed) {
    return (
      <button onClick={show} className="page-guide-show" title="Show page guide">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        How to use this page
      </button>
    );
  }

  return (
    <div className="page-guide">
      <div className="page-guide-header">
        <div className="page-guide-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          {title}
        </div>
        <button onClick={dismiss} className="page-guide-close" title="Dismiss guide">&times;</button>
      </div>
      <ol className="page-guide-steps">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
