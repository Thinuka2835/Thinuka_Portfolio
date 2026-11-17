// Allowed `iconKey` values for tools. Each key must also be imported BY NAME
// and registered in src/components/Tools/Tools.jsx (a test checks this).
// Never `import * as SiIcons` — it defeats tree-shaking and adds megabytes.
export const TOOL_ICON_KEYS = [
  'SiJira', 'SiConfluence', 'SiTrello', 'SiAsana', 'SiSlack', 'SiNotion', 'SiMiro', 'SiClickup',
  'SiGithub', 'SiGitlab', 'SiFigma', 'SiGooglesheets', 'SiGoogledrive', 'SiGooglecalendar',
  'SiAirtable', 'SiLinear', 'SiZoom', 'SiBasecamp',
]
