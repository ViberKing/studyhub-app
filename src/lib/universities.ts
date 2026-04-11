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
  // Scotland
  { id: "st-andrews", name: "University of St Andrews", city: "St Andrews", gradingSystem: "20-point", fixrSlug: "st-andrews", eventbriteSlug: "st-andrews" },
  { id: "edinburgh", name: "University of Edinburgh", city: "Edinburgh", gradingSystem: "percentage", fixrSlug: "edinburgh", eventbriteSlug: "edinburgh" },
  { id: "glasgow", name: "University of Glasgow", city: "Glasgow", gradingSystem: "percentage", fixrSlug: "glasgow", eventbriteSlug: "glasgow" },
  { id: "aberdeen", name: "University of Aberdeen", city: "Aberdeen", gradingSystem: "percentage", fixrSlug: "aberdeen", eventbriteSlug: "aberdeen" },
  { id: "dundee", name: "University of Dundee", city: "Dundee", gradingSystem: "percentage", fixrSlug: "dundee", eventbriteSlug: "dundee" },
  { id: "strathclyde", name: "University of Strathclyde", city: "Glasgow", gradingSystem: "percentage", fixrSlug: "glasgow", eventbriteSlug: "glasgow" },
  { id: "stirling", name: "University of Stirling", city: "Stirling", gradingSystem: "percentage", fixrSlug: null, eventbriteSlug: "stirling" },
  { id: "heriot-watt", name: "Heriot-Watt University", city: "Edinburgh", gradingSystem: "percentage", fixrSlug: "edinburgh", eventbriteSlug: "edinburgh" },

  // England — London
  { id: "ucl", name: "University College London", city: "London", gradingSystem: "percentage", fixrSlug: "london", eventbriteSlug: "london" },
  { id: "imperial", name: "Imperial College London", city: "London", gradingSystem: "percentage", fixrSlug: "london", eventbriteSlug: "london" },
  { id: "kcl", name: "King's College London", city: "London", gradingSystem: "percentage", fixrSlug: "london", eventbriteSlug: "london" },
  { id: "lse", name: "London School of Economics", city: "London", gradingSystem: "percentage", fixrSlug: "london", eventbriteSlug: "london" },
  { id: "qmul", name: "Queen Mary University of London", city: "London", gradingSystem: "percentage", fixrSlug: "london", eventbriteSlug: "london" },

  // England — Other
  { id: "oxford", name: "University of Oxford", city: "Oxford", gradingSystem: "percentage", fixrSlug: "oxford", eventbriteSlug: "oxford" },
  { id: "cambridge", name: "University of Cambridge", city: "Cambridge", gradingSystem: "percentage", fixrSlug: "cambridge", eventbriteSlug: "cambridge" },
  { id: "durham", name: "Durham University", city: "Durham", gradingSystem: "percentage", fixrSlug: "durham", eventbriteSlug: "durham" },
  { id: "manchester", name: "University of Manchester", city: "Manchester", gradingSystem: "percentage", fixrSlug: "manchester", eventbriteSlug: "manchester" },
  { id: "leeds", name: "University of Leeds", city: "Leeds", gradingSystem: "percentage", fixrSlug: "leeds", eventbriteSlug: "leeds" },
  { id: "birmingham", name: "University of Birmingham", city: "Birmingham", gradingSystem: "percentage", fixrSlug: "birmingham", eventbriteSlug: "birmingham" },
  { id: "bristol", name: "University of Bristol", city: "Bristol", gradingSystem: "percentage", fixrSlug: "bristol", eventbriteSlug: "bristol" },
  { id: "warwick", name: "University of Warwick", city: "Coventry", gradingSystem: "percentage", fixrSlug: "coventry", eventbriteSlug: "coventry" },
  { id: "sheffield", name: "University of Sheffield", city: "Sheffield", gradingSystem: "percentage", fixrSlug: "sheffield", eventbriteSlug: "sheffield" },
  { id: "nottingham", name: "University of Nottingham", city: "Nottingham", gradingSystem: "percentage", fixrSlug: "nottingham", eventbriteSlug: "nottingham" },
  { id: "southampton", name: "University of Southampton", city: "Southampton", gradingSystem: "percentage", fixrSlug: "southampton", eventbriteSlug: "southampton" },
  { id: "exeter", name: "University of Exeter", city: "Exeter", gradingSystem: "percentage", fixrSlug: "exeter", eventbriteSlug: "exeter" },
  { id: "york", name: "University of York", city: "York", gradingSystem: "percentage", fixrSlug: "york", eventbriteSlug: "york" },
  { id: "lancaster", name: "Lancaster University", city: "Lancaster", gradingSystem: "percentage", fixrSlug: "lancaster", eventbriteSlug: "lancaster" },
  { id: "bath", name: "University of Bath", city: "Bath", gradingSystem: "percentage", fixrSlug: "bath", eventbriteSlug: "bath" },
  { id: "liverpool", name: "University of Liverpool", city: "Liverpool", gradingSystem: "percentage", fixrSlug: "liverpool", eventbriteSlug: "liverpool" },
  { id: "newcastle", name: "Newcastle University", city: "Newcastle", gradingSystem: "percentage", fixrSlug: "newcastle", eventbriteSlug: "newcastle-upon-tyne" },
  { id: "cardiff", name: "Cardiff University", city: "Cardiff", gradingSystem: "percentage", fixrSlug: "cardiff", eventbriteSlug: "cardiff" },
  { id: "queens-belfast", name: "Queen's University Belfast", city: "Belfast", gradingSystem: "percentage", fixrSlug: "belfast", eventbriteSlug: "belfast" },
  { id: "sussex", name: "University of Sussex", city: "Brighton", gradingSystem: "percentage", fixrSlug: "brighton", eventbriteSlug: "brighton" },
  { id: "reading", name: "University of Reading", city: "Reading", gradingSystem: "percentage", fixrSlug: "reading", eventbriteSlug: "reading" },
  { id: "leicester", name: "University of Leicester", city: "Leicester", gradingSystem: "percentage", fixrSlug: "leicester", eventbriteSlug: "leicester" },
  { id: "surrey", name: "University of Surrey", city: "Guildford", gradingSystem: "percentage", fixrSlug: null, eventbriteSlug: "guildford" },
  { id: "loughborough", name: "Loughborough University", city: "Loughborough", gradingSystem: "percentage", fixrSlug: "loughborough", eventbriteSlug: "loughborough" },
  { id: "swansea", name: "Swansea University", city: "Swansea", gradingSystem: "percentage", fixrSlug: "swansea", eventbriteSlug: "swansea" },
  { id: "east-anglia", name: "University of East Anglia", city: "Norwich", gradingSystem: "percentage", fixrSlug: "norwich", eventbriteSlug: "norwich" },
  { id: "kent", name: "University of Kent", city: "Canterbury", gradingSystem: "percentage", fixrSlug: "canterbury", eventbriteSlug: "canterbury" },
  { id: "portsmouth", name: "University of Portsmouth", city: "Portsmouth", gradingSystem: "percentage", fixrSlug: "portsmouth", eventbriteSlug: "portsmouth" },
  { id: "plymouth", name: "University of Plymouth", city: "Plymouth", gradingSystem: "percentage", fixrSlug: "plymouth", eventbriteSlug: "plymouth" },
  { id: "norwich", name: "Norwich University of the Arts", city: "Norwich", gradingSystem: "percentage", fixrSlug: "norwich", eventbriteSlug: "norwich" },
  { id: "manchester-met", name: "Manchester Metropolitan University", city: "Manchester", gradingSystem: "percentage", fixrSlug: "manchester", eventbriteSlug: "manchester" },
  { id: "leeds-beckett", name: "Leeds Beckett University", city: "Leeds", gradingSystem: "percentage", fixrSlug: "leeds", eventbriteSlug: "leeds" },
  { id: "nottingham-trent", name: "Nottingham Trent University", city: "Nottingham", gradingSystem: "percentage", fixrSlug: "nottingham", eventbriteSlug: "nottingham" },
  { id: "uwe-bristol", name: "University of the West of England", city: "Bristol", gradingSystem: "percentage", fixrSlug: "bristol", eventbriteSlug: "bristol" },
  { id: "coventry", name: "Coventry University", city: "Coventry", gradingSystem: "percentage", fixrSlug: "coventry", eventbriteSlug: "coventry" },
  { id: "de-montfort", name: "De Montfort University", city: "Leicester", gradingSystem: "percentage", fixrSlug: "leicester", eventbriteSlug: "leicester" },
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
