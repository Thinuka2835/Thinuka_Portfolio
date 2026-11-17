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

  // Contact — TODO: replace with your real details (or set them in the admin panel)
  email: "you@email.com",
  phone: "+1 (555) 000-0000",
  location: "Remote — Your City, Country",
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

export const stats = [
  { value: 3,   suffix: "+", label: "Years Experience" },     // ← TODO: your real numbers
  { value: 20,  suffix: "+", label: "Projects Delivered" },
  { value: 10,  suffix: "+", label: "Teams Led" },
  { value: 100, suffix: "%", label: "Client Satisfaction" },
];

// Certifications & achievements — TODO: replace with your real ones
export const gallery = [
  { title: "PMP® — Project Management Professional", issuer: "PMI",            year: "2024" },
  { title: "Certified ScrumMaster (CSM)",             issuer: "Scrum Alliance", year: "2023" },
  { title: "Agile Project Management",                issuer: "Google",         year: "2023" },
  { title: "PRINCE2® Foundation",                     issuer: "AXELOS",         year: "2022" },
  { title: "Leadership Excellence Award",             issuer: "Your Company",   year: "2022" },
  { title: "Employee of the Year",                    issuer: "Your Company",   year: "2021" },
];
