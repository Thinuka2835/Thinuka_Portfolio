// ============================================================
//  src/data/personalDetails.js
//  ★ Single source of truth — update this file with your info
// ============================================================

export const personal = {
  name: "Thinuka",                             // ← Your full name
  greeting: "Hi Folks! I'm",
  titleLine1: "Project",                       // ← First line of hero title
  titleHighlight: "Manager.",                  // ← Highlighted word (accent color)
  role: "Agile · Scrum · Stakeholder Management · Delivery", // ← Shown under title
  bio: `Hello — I'm a results-driven project manager with experience leading cross-functional
        teams to deliver complex initiatives on time and within budget. I love turning
        ambiguity into clear roadmaps and roadmaps into real, measurable outcomes.`,
  highlightedWord: "impact",                   // ← Word in About quote to highlight
  quote: `"Leading Teams, Managing Risk & Delivering Projects that create real impact."`,
  email: "you@email.com",                      // ← TODO: your real email
  phone: "+1 (555) 000-0000",                  // ← TODO: your real phone number
  location: "Remote — Your City, Country",     // ← TODO: your real location
  availability: "Available for new projects",  // ← shown as a badge on Contact; set to null to hide
  github: "https://github.com/yourusername",   // ← TODO: your real GitHub URL
  linkedin: "https://linkedin.com/in/you",     // ← TODO: your real LinkedIn URL
  resumeLink: "#",                             // ← TODO: link to resume PDF
};

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

export const projects = [
  {
    id: 1,
    number: "01",
    title: "Project One — Product Launch",
    description: "Led a cross-functional team of 8 through a full product launch, from roadmap to release, coordinating engineering, design, and marketing.",
    tags: ["Agile", "Jira", "Stakeholder Mgmt"],
    link: "#", // TODO: link to a case study, LinkedIn post, or portfolio doc
    image: null, // Set to image path if you have one
  },
  {
    id: 2,
    number: "02",
    title: "Project Two — Platform Migration",
    description: "Managed an enterprise platform migration end-to-end, delivering on time and under budget while minimizing disruption to the business.",
    tags: ["Risk Management", "Scrum", "Budgeting"],
    link: "#",
    image: null,
  },
  {
    id: 3,
    number: "03",
    title: "Project Three — Process Overhaul",
    description: "Redesigned the team's delivery process, cutting sprint cycle time by 30% through improved workflows, tooling, and reporting.",
    tags: ["Process Improvement", "Kanban", "Confluence"],
    link: "#",
    image: null,
  },
];

export const stats = [
  { value: 3, suffix: "+", label: "Years Experience" },     // ← TODO: your real numbers
  { value: 20, suffix: "+", label: "Projects Delivered" },
  { value: 10, suffix: "+", label: "Teams Led" },
  { value: 100, suffix: "%", label: "Client Satisfaction" },
];

export const gallery = [
  // ← TODO: replace with your real certifications — set `image` to a scan/photo path to show it instead of the icon
  { id: 1, title: "PMP® — Project Management Professional", issuer: "PMI", year: "2024", image: null },
  { id: 2, title: "Certified ScrumMaster (CSM)",             issuer: "Scrum Alliance", year: "2023", image: null },
  { id: 3, title: "Agile Project Management",                issuer: "Google", year: "2023", image: null },
  { id: 4, title: "PRINCE2® Foundation",                     issuer: "AXELOS", year: "2022", image: null },
  { id: 5, title: "Leadership Excellence Award",              issuer: "Your Company", year: "2022", image: null },
  { id: 6, title: "Employee of the Year",                     issuer: "Your Company", year: "2021", image: null },
];
