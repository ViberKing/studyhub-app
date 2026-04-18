/* ── UK university data ── */

export interface University {
  id: string;
  name: string;
  city: string;
  gradingSystem: "20-point" | "percentage";
  fixrSlug: string | null;     // Fixr city slug for events
  eventbriteSlug: string;      // Eventbrite city search slug
}

export const universities: University[] = [
  { id: "st-andrews", name: "University of St Andrews", city: "St Andrews", gradingSystem: "20-point", fixrSlug: "st-andrews", eventbriteSlug: "st-andrews" },
  { id: "warwick", name: "University of Warwick", city: "Coventry", gradingSystem: "percentage", fixrSlug: "coventry", eventbriteSlug: "coventry" },
  { id: "exeter", name: "University of Exeter", city: "Exeter", gradingSystem: "percentage", fixrSlug: "exeter", eventbriteSlug: "exeter" },
];

export function getUniversity(id: string): University | undefined {
  return universities.find(u => u.id === id);
}

export function getGradingConfig(gradingSystem: "20-point" | "percentage") {
  if (gradingSystem === "20-point") {
    return {
      maxScore: 20,
      targets: [
        { label: "First (16.5+)", value: "16.5" },
        { label: "2:1 (13.5\u201316.4)", value: "13.5" },
        { label: "2:2 (11\u201313.4)", value: "11" },
        { label: "Third (7\u201310.9)", value: "7" },
      ],
      scaleLabel: "20-point scale",
      scaleSummary: "16.5+ = First \u00B7 13.5\u201316.4 = 2:1 \u00B7 11\u201313.4 = 2:2 \u00B7 7\u201310.9 = Third \u00B7 <7 = Fail",
    };
  }
  return {
    maxScore: 100,
    targets: [
      { label: "First (70%+)", value: "70" },
      { label: "2:1 (60\u201369%)", value: "60" },
      { label: "2:2 (50\u201359%)", value: "50" },
      { label: "Third (40\u201349%)", value: "40" },
    ],
    scaleLabel: "UK percentage scale",
    scaleSummary: "70%+ = First \u00B7 60\u201369% = 2:1 \u00B7 50\u201359% = 2:2 \u00B7 40\u201349% = Third \u00B7 <40% = Fail",
  };
}
