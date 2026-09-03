// ============================================================
//  src/data/personalDetails.js
//  ★ Single source of truth — update this file with your info
// ============================================================

export const personal = {
  name: "Thinuka",                             // ← Your full name
  greeting: "Hi Folks! I'm",
  titleLine1: "Full Stack",                   // ← First line of hero title
  titleHighlight: "Developer.",               // ← Highlighted word (accent color)
  role: "React · Node.js · Python · MongoDB", // ← Shown under title
  bio: `Hello — I'm a passionate developer with experience in building full-stack
        web applications, REST APIs, and intuitive user interfaces. I love turning
        complex problems into clean, elegant solutions that elevate user experience.`,
  highlightedWord: "elegant",                 // ← Word in About quote to highlight
  quote: `"Building Apps, Products & Experiences that are clean and elegant."`,
  email: "you@email.com",                     // ← TODO: your real email
  github: "https://github.com/yourusername",  // ← TODO: your real GitHub URL
  linkedin: "https://linkedin.com/in/you",    // ← TODO: your real LinkedIn URL
  resumeLink: "#",                            // ← TODO: link to resume PDF
};

export const ticker = [
  "Web Development",
  "React",
  "Node.js",
  "Python",
  "REST APIs",
  "MongoDB",
  "TypeScript",
  "UI/UX Design",
  "GitHub",
  "Docker",
  "Machine Learning",
  "Full Stack",
];

export const tools = [
  { name: "React",        iconKey: "SiReact" },
  { name: "Node.js",      iconKey: "SiNodedotjs" },
  { name: "Python",       iconKey: "SiPython" },
  { name: "MongoDB",      iconKey: "SiMongodb" },
  { name: "TypeScript",   iconKey: "SiTypescript" },
  { name: "Figma",        iconKey: "SiFigma" },
  { name: "GitHub",       iconKey: "SiGithub" },
  { name: "Docker",       iconKey: "SiDocker" },
];

export const projects = [
  {
    id: 1,
    number: "01",
    title: "Project One — Your App",
    description: "A full-stack web application with React frontend and Node.js backend.",
    tags: ["React", "Node.js", "MongoDB"],
    link: "https://github.com/yourusername/project1",
    image: null, // Set to image path if you have one
  },
  {
    id: 2,
    number: "02",
    title: "Project Two — ML Model",
    description: "Machine learning model for image classification using deep learning.",
    tags: ["Python", "TensorFlow", "Flask"],
    link: "https://github.com/yourusername/project2",
    image: null,
  },
  {
    id: 3,
    number: "03",
    title: "Project Three — UI Design",
    description: "Responsive web design for a modern SaaS product dashboard.",
    tags: ["UI/UX", "Figma", "CSS"],
    link: "https://github.com/yourusername/project3",
    image: null,
  },
];

export const stats = [
  { value: 3, suffix: "+", label: "Years Experience" },     // ← TODO: your real numbers
  { value: 20, suffix: "+", label: "Projects Completed" },
  { value: 10, suffix: "+", label: "Technologies" },
  { value: 100, suffix: "%", label: "Client Satisfaction" },
];
