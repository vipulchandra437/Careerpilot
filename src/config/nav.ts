import {
  LayoutDashboard,
  Target,
  UserRound,
  FileText,
  Code2,
  Mic2,
  MessageSquareText,
  FolderGit2,
  Gauge,
  TrendingUp,
  Map,
  Sparkles,
  Workflow,
  LineChart,
  FileBarChart,
  Settings,
  Shield,
  Users,
  Building2,
  Briefcase,
  Lightbulb,
  Database,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import { GitHubIcon, LinkedInIcon } from "@/components/icons/brand-icons";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const studentNav: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Progress", href: "/progress", icon: LineChart },
      { title: "Career Report", href: "/report", icon: FileBarChart },
    ],
  },
  {
    label: "Profile & Goals",
    items: [
      { title: "Career Goal", href: "/career-goal", icon: Target },
      { title: "My Profile", href: "/profile", icon: UserRound },
      { title: "Resume", href: "/resume", icon: FileText },
    ],
  },
  {
    label: "Assessments",
    items: [
      { title: "Coding", href: "/coding", icon: Code2 },
      { title: "Mock Interview", href: "/interview", icon: Mic2 },
      { title: "Communication", href: "/communication", icon: MessageSquareText },
    ],
  },
  {
    label: "Analyzers",
    items: [
      { title: "GitHub", href: "/github", icon: GitHubIcon },
      { title: "LinkedIn", href: "/linkedin", icon: LinkedInIcon },
      { title: "Projects", href: "/projects", icon: FolderGit2 },
    ],
  },
  {
    label: "Strategy",
    items: [
      { title: "Company Readiness", href: "/readiness", icon: Gauge },
      { title: "Skill Gaps", href: "/skill-gaps", icon: TrendingUp },
      { title: "Learning Roadmap", href: "/roadmap", icon: Map },
      { title: "Hiring Simulation", href: "/hiring-simulation", icon: Workflow },
    ],
  },
  {
    label: "AI",
    items: [
      { title: "Career Mentor", href: "/mentor", icon: Sparkles },
    ],
  },
  {
    label: "Account",
    items: [{ title: "Settings", href: "/settings", icon: Settings }],
  },
];

export const adminNav: NavGroup[] = [
  {
    label: "Administration",
    items: [
      { title: "Admin Dashboard", href: "/admin", icon: Shield },
      { title: "Users", href: "/admin/users", icon: Users },
      { title: "Companies", href: "/admin/companies", icon: Building2 },
      { title: "Job Roles", href: "/admin/job-roles", icon: Briefcase },
      { title: "Skills", href: "/admin/skills", icon: Lightbulb },
      { title: "Coding Problems", href: "/admin/problems", icon: Database },
      { title: "Assessment Config", href: "/admin/assessment-config", icon: ClipboardList },
      { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
];
