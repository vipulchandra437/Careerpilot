// Static choices for the career target wizard. IDs are stable; text is written
// for students who are still exploring their options.

export interface Role {
  id: string;
  title: string;
  desc: string;
  tags: string[];
}

export interface CompanyType {
  id: string;
  title: string;
  desc: string;
}

export interface Company {
  id: string;
  name: string;
  type: string;
  sector: string;
  location: string;
  note: string;
}

export const ROLES: Role[] = [
  { id: "ml-engineer", title: "Machine learning engineer", desc: "Build systems that learn from data and make predictions.", tags: ["ml", "ai", "models", "python"] },
  { id: "data-scientist", title: "Data scientist", desc: "Use data and statistics to answer real business questions.", tags: ["data", "statistics", "python", "analysis"] },
  { id: "data-analyst", title: "Data analyst", desc: "Turn raw numbers into clear charts and useful answers.", tags: ["data", "sql", "dashboards", "reporting"] },
  { id: "fullstack-developer", title: "Full-stack developer", desc: "Work on both the part users see and the part behind it.", tags: ["web", "frontend", "backend", "api"] },
  { id: "frontend-developer", title: "Frontend developer", desc: "Build the screens and buttons people use every day.", tags: ["web", "react", "ui", "design"] },
  { id: "backend-developer", title: "Backend developer", desc: "Build the services, data, and logic behind an app.", tags: ["api", "server", "database", "services"] },
  { id: "mobile-developer", title: "Mobile app developer", desc: "Create apps that people carry in their pockets.", tags: ["android", "ios", "flutter", "react native"] },
  { id: "devops-engineer", title: "DevOps engineer", desc: "Help teams ship code safely and keep apps running.", tags: ["cloud", "ci", "deployment", "linux"] },
  { id: "cybersecurity-analyst", title: "Cybersecurity analyst", desc: "Look for risks and help keep systems and people safe.", tags: ["security", "threats", "networks", "risk"] },
  { id: "qa-engineer", title: "QA engineer", desc: "Find problems early so software works well for everyone.", tags: ["testing", "quality", "automation", "bugs"] },
  { id: "product-manager", title: "Product manager", desc: "Decide what to build next and keep the team aligned.", tags: ["product", "planning", "users", "roadmap"] },
  { id: "nlp-engineer", title: "NLP engineer", desc: "Build tools that understand and work with human language.", tags: ["nlp", "text", "llm", "language"] },
  { id: "computer-vision-engineer", title: "Computer vision engineer", desc: "Teach computers to understand images and video.", tags: ["vision", "images", "opencv", "ai"] },
  { id: "ui-ux-designer", title: "UI/UX designer", desc: "Shape how an app looks, feels, and flows for its users.", tags: ["design", "figma", "research", "interface"] },
];

export const COMPANY_TYPES: CompanyType[] = [
  { id: "startup", title: "Startup", desc: "A small team moving fast, with room to try many things." },
  { id: "product", title: "Product company", desc: "A team that builds and improves one main product." },
  { id: "service", title: "Service company", desc: "A team that builds solutions for different clients." },
  { id: "enterprise", title: "Large enterprise", desc: "A big company with clear teams and established ways of working." },
  { id: "research", title: "Research lab", desc: "A place to explore new ideas, often with senior mentors." },
  { id: "government", title: "Government or public sector", desc: "Work on services that help communities and citizens." },
];

export const COMPANIES: Company[] = [
  { id: "northstar-labs", name: "Northstar Labs", type: "startup", sector: "Applied AI", location: "Bengaluru", note: "A small team shipping useful AI tools." },
  { id: "brightloop", name: "Brightloop", type: "startup", sector: "Education", location: "Remote", note: "A young product for learners and teachers." },
  { id: "quiet-desk", name: "Quiet Desk", type: "product", sector: "Software", location: "Hyderabad", note: "A calm workspace tool used by small teams." },
  { id: "pixel-harbor", name: "Pixel Harbor", type: "product", sector: "Design tools", location: "Mumbai", note: "Simple design software with a friendly team." },
  { id: "bridgeworks", name: "Bridgeworks", type: "service", sector: "IT services", location: "Pune", note: "Builds client projects across many domains." },
  { id: "cobalt-systems", name: "Cobalt Systems", type: "service", sector: "Consulting", location: "Delhi", note: "A good place to see many kinds of systems." },
  { id: "atlas-cloud", name: "Atlas Cloud", type: "enterprise", sector: "Cloud", location: "Bengaluru", note: "Large-scale infrastructure with structured teams." },
  { id: "meridian-bank", name: "Meridian Bank", type: "enterprise", sector: "Banking", location: "Mumbai", note: "A stable place to learn how big systems run." },
  { id: "aster-research", name: "Aster Research", type: "research", sector: "AI research", location: "Bengaluru", note: "Friendly lab focused on useful machine learning." },
  { id: "signal-lab", name: "Signal Lab", type: "research", sector: "Robotics", location: "Delhi", note: "Hands-on prototypes with close mentorship." },
  { id: "civic-tech-office", name: "Civic Tech Office", type: "government", sector: "Public services", location: "Delhi", note: "Digital tools that help local communities." },
  { id: "national-data-cell", name: "National Data Cell", type: "government", sector: "Open data", location: "Remote", note: "Public data projects with a clear purpose." },
];

export const ALL_COMPANY_TYPE_IDS = COMPANY_TYPES.map((type) => type.id);
