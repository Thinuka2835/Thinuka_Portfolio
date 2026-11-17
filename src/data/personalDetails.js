// ============================================================
//  src/data/personalDetails.js
//
//  DEFAULT site content. Since the admin panel was added this file is used:
//    1. as the initial data inserted by `npm run db:seed`, and
//    2. as the fallback the site shows when no database is configured
//       (e.g. a fresh local checkout).
//
//  Once Neon is set up, edit this content in the admin panel instead —
//  the database is the source of truth for everything below. Long-form
//  content (projects, articles, pages) lives in Markdown under /content.
// ============================================================

export const personal = {
  name: "Thinuka",
  greeting: "Hi Folks! I'm",
  titleLine1: "Project",
  titleHighlight: "Manager.",
  role: "Agile · Scrum · Stakeholder Management · Delivery",
  bio: "I'm a results-driven project manager with experience leading cross-functional teams to deliver complex initiatives on time and within budget. I love turning ambiguity into clear roadmaps — and roadmaps into real, measurable outcomes.",
  quote: "Leading teams, managing risk & delivering projects that create real impact.",
  highlightedWord: "impact",
  availability: "Available for new projects",

  // Contact — empty fields are hidden on the site. Add your real details here
  // or in the admin panel (Profile & settings).
  email: "",
  phone: "",
  location: "",
  resumeUrl: "",
};

// Social profiles. Only entries with a valid https URL are shown.
export const socialLinks = [
  { platform: "github", url: "https://github.com/Thinuka2835" }, // ← from this repo's GitHub remote
];

export const ticker = [
  "Agile",
  "Scrum",
  "Kanban",
  "Stakeholder Management",
  "Risk Management",
  "Budgeting",
  "Roadmapping",
  "Team Leadership",
  "Jira",
  "Process Improvement",
  "Cross-functional Leadership",
  "Project Delivery",
];

// iconKey must be one of the keys in shared/toolIcons.js
export const tools = [
  { name: "Jira",        iconKey: "SiJira" },
  { name: "Confluence",  iconKey: "SiConfluence" },
  { name: "Trello",      iconKey: "SiTrello" },
  { name: "Asana",       iconKey: "SiAsana" },
  { name: "Slack",       iconKey: "SiSlack" },
  { name: "Notion",      iconKey: "SiNotion" },
  { name: "Miro",        iconKey: "SiMiro" },
  { name: "ClickUp",     iconKey: "SiClickup" },
];

// Career figures for the "Impact" section — e.g. { value: 5, suffix: "+", label: "Years Experience" }.
// The section (and its nav link) is hidden while this is empty. Add them in the admin panel.
export const stats = [];

// Certifications & achievements — e.g. { title: "...", issuer: "...", year: "2024" }.
// Hidden while empty. Add them (with certificate images) in the admin panel.
export const gallery = [];
