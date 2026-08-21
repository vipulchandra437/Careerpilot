export type ResourceType = "video" | "article" | "course" | "practice" | "docs";

export interface LearningResource {
  title: string;
  url: string;
  type: ResourceType;
  platform: string;
}

interface SkillResourceMap {
  [key: string]: LearningResource[];
}

const SKILL_RESOURCES: SkillResourceMap = {
  javascript: [
    { title: "JavaScript Fundamentals", url: "https://javascript.info/", type: "article", platform: "JavaScript.info" },
    { title: "JavaScript30 Course", url: "https://javascript30.com/", type: "course", platform: "JavaScript30" },
    { title: "JS Crash Course", url: "https://www.youtube.com/watch?v=hdI2bqOjy3c", type: "video", platform: "YouTube" },
    { title: "JavaScript Challenges", url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/", type: "practice", platform: "freeCodeCamp" },
    { title: "MDN JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", type: "docs", platform: "MDN" },
  ],
  typescript: [
    { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/", type: "docs", platform: "TypeScript" },
    { title: "TypeScript Tutorial", url: "https://www.freecodecamp.org/news/learn-typescript-beginners-guide/", type: "article", platform: "freeCodeCamp" },
    { title: "TypeScript Course", url: "https://www.youtube.com/watch?v=BwuLxPH8IDs", type: "video", platform: "YouTube" },
    { title: "TypeScript Exercises", url: "https://typescript-exercises.github.io/", type: "practice", platform: "TypeScript Exercises" },
    { title: "Total TypeScript", url: "https://www.totaltypescript.com/", type: "course", platform: "Total TypeScript" },
  ],
  react: [
    { title: "React Official Tutorial", url: "https://react.dev/learn", type: "docs", platform: "React" },
    { title: "React Course for Beginners", url: "https://www.youtube.com/watch?v=LDB4uaJ87e0", type: "video", platform: "YouTube" },
    { title: "React on freeCodeCamp", url: "https://www.freecodecamp.org/learn/front-end-development-libraries/#react", type: "course", platform: "freeCodeCamp" },
    { title: "React Patterns", url: "https://reactpatterns.com/", type: "article", platform: "React Patterns" },
    { title: "Build a React App", url: "https://react.dev/learn/tutorial-tic-tac-toe", type: "practice", platform: "React" },
  ],
  "next.js": [
    { title: "Next.js Learn Course", url: "https://nextjs.org/learn", type: "course", platform: "Next.js" },
    { title: "Next.js Documentation", url: "https://nextjs.org/docs", type: "docs", platform: "Next.js" },
    { title: "Next.js 15 Full Course", url: "https://www.youtube.com/watch?v=mTz0GXj8NN0", type: "video", platform: "YouTube" },
    { title: "Next.js App Router", url: "https://nextjs.org/docs/app/building-your-application/routing", type: "article", platform: "Next.js" },
    { title: "Next.js Projects", url: "https://www.freecodecamp.org/news/nextjs-for-beginners/", type: "practice", platform: "freeCodeCamp" },
  ],
  "node.js": [
    { title: "Node.js Docs", url: "https://nodejs.org/en/docs/guides", type: "docs", platform: "Node.js" },
    { title: "Node.js Crash Course", url: "https://www.youtube.com/watch?v=fBNz5xF-Kx4", type: "video", platform: "YouTube" },
    { title: "Node.js on freeCodeCamp", url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/", type: "course", platform: "freeCodeCamp" },
    { title: "Express.js Guide", url: "https://expressjs.com/en/guide/routing.html", type: "article", platform: "Express" },
    { title: "Node.js Projects", url: "https://roadmap.sh/nodejs", type: "practice", platform: "roadmap.sh" },
  ],
  python: [
    { title: "Python Official Tutorial", url: "https://docs.python.org/3/tutorial/", type: "docs", platform: "Python" },
    { title: "Python for Beginners", url: "https://www.youtube.com/watch?v=_uQrJ0TkZlc", type: "video", platform: "YouTube" },
    { title: "Python on freeCodeCamp", url: "https://www.freecodecamp.org/learn/scientific-computing-with-python/", type: "course", platform: "freeCodeCamp" },
    { title: "Real Python Tutorials", url: "https://realpython.com/", type: "article", platform: "Real Python" },
    { title: "Python Coding Practice", url: "https://www.hackerrank.com/domains/python", type: "practice", platform: "HackerRank" },
  ],
  "data structures": [
    { title: "Data Structures Course", url: "https://www.freecodecamp.org/learn/coding-interview-prep/#data-structures", type: "course", platform: "freeCodeCamp" },
    { title: "DS with JavaScript", url: "https://www.youtube.com/watch?v=RBSGKlLvoWg", type: "video", platform: "YouTube" },
    { title: "Visualgo - DS", url: "https://visualgo.net/en/list", type: "practice", platform: "VisuAlgo" },
    { title: "DSA Roadmap", url: "https://roadmap.sh/data-structures-and-algorithms", type: "article", platform: "roadmap.sh" },
    { title: "LeetCode Practice", url: "https://leetcode.com/studyplan/data-structures/", type: "practice", platform: "LeetCode" },
  ],
  algorithms: [
    { title: "Algorithms Course", url: "https://www.freecodecamp.org/learn/coding-interview-prep/#algorithms", type: "course", platform: "freeCodeCamp" },
    { title: "Algorithms Visualized", url: "https://visualgo.net/en/sorting", type: "practice", platform: "VisuAlgo" },
    { title: "Sorting Algorithms", url: "https://www.youtube.com/watch?v=kPRA0W1kECg", type: "video", platform: "YouTube" },
    { title: "CLRS Study Guide", url: "https://www.edx.org/learn/algorithms", type: "article", platform: "edX" },
    { title: "LeetCode Practice", url: "https://leetcode.com/studyplan/algorithms/", type: "practice", platform: "LeetCode" },
  ],
  "git": [
    { title: "Git Handbook", url: "https://docs.github.com/en/get-started/using-git", type: "docs", platform: "GitHub" },
    { title: "Git Tutorial", url: "https://www.youtube.com?v=HVsyN-fHxOU", type: "video", platform: "YouTube" },
    { title: "Learn Git Branching", url: "https://learngitbranching.js.org/", type: "practice", platform: "Learn Git Branching" },
    { title: "Git Cheat Sheet", url: "https://education.github.com/git-cheat-sheet-education.pdf", type: "article", platform: "GitHub" },
    { title: "Git Exercises", url: "https://www.freecodecamp.org/news/learn-git-by-solving-exercises/", type: "practice", platform: "freeCodeCamp" },
  ],
  sql: [
    { title: "SQL Tutorial", url: "https://www.w3schools.com/sql/", type: "article", platform: "W3Schools" },
    { title: "SQL on freeCodeCamp", url: "https://www.freecodecamp.org/learn/relational-database/", type: "course", platform: "freeCodeCamp" },
    { title: "SQL Course", url: "https://www.youtube.com?v=HXV3zeQKqGY", type: "video", platform: "YouTube" },
    { title: "SQLBolt Practice", url: "https://sqlbolt.com/", type: "practice", platform: "SQLBolt" },
    { title: "SQLite Docs", url: "https://www.sqlite.org/docs.html", type: "docs", platform: "SQLite" },
  ],
  postgresql: [
    { title: "PostgreSQL Tutorial", url: "https://www.postgresqltutorial.com/", type: "article", platform: "PostgreSQL Tutorial" },
    { title: "PostgreSQL Docs", url: "https://www.postgresql.org/docs/current/tutorial.html", type: "docs", platform: "PostgreSQL" },
    { title: "Postgres Course", url: "https://www.youtube.com/watch?v=qw--VYLpxc4", type: "video", platform: "YouTube" },
    { title: "Postgres Exercises", url: "https://pgexercises.com/", type: "practice", platform: "PGExercises" },
    { title: "PostgreSQL on freeCodeCamp", url: "https://www.freecodecamp.org/news/postgresql-for-beginners/", type: "course", platform: "freeCodeCamp" },
  ],
  mongodb: [
    { title: "MongoDB University", url: "https://learn.mongodb.com/", type: "course", platform: "MongoDB" },
    { title: "MongoDB Tutorial", url: "https://www.youtube.com/watch?v=-56x56UppqQ", type: "video", platform: "YouTube" },
    { title: "MongoDB Docs", url: "https://www.mongodb.com/docs/manual/tutorial/", type: "docs", platform: "MongoDB" },
    { title: "MERN Stack Guide", url: "https://www.freecodecamp.org/news/mern-stack-tutorial/", type: "article", platform: "freeCodeCamp" },
    { title: "MongoDB Practice", url: "https://www.mongodb.com/docs/manual/crud/", type: "practice", platform: "MongoDB" },
  ],
  docker: [
    { title: "Docker Getting Started", url: "https://docs.docker.com/get-started/", type: "docs", platform: "Docker" },
    { title: "Docker Tutorial", url: "https://www.youtube.com/watch?v=fqMOX6JJhGo", type: "video", platform: "YouTube" },
    { title: "Docker on freeCodeCamp", url: "https://www.freecodecamp.org/news/docker-tutorial-for-beginners/", type: "course", platform: "freeCodeCamp" },
    { title: "Docker Curriculum", url: "https://docker-curriculum.com/", type: "article", platform: "Docker Curriculum" },
    { title: "Play with Docker", url: "https://labs.play-with-docker.com/", type: "practice", platform: "Play with Docker" },
  ],
  "aws": [
    { title: "AWS Documentation", url: "https://docs.aws.amazon.com/", type: "docs", platform: "AWS" },
    { title: "AWS Cloud Practitioner", url: "https://www.youtube.com/watch?v=SOTamWNgDKc", type: "video", platform: "YouTube" },
    { title: "AWS on freeCodeCamp", url: "https://www.freecodecamp.org/news/aws-certified-cloud-practitioner-training/", type: "course", platform: "freeCodeCamp" },
    { title: "AWS Skill Builder", url: "https://skillbuilder.aws/", type: "practice", platform: "AWS" },
    { title: "AWS Well-Architected", url: "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html", type: "article", platform: "AWS" },
  ],
  "machine learning": [
    { title: "ML Coursera Course", url: "https://www.coursera.org/learn/machine-learning", type: "course", platform: "Coursera" },
    { title: "ML Tutorial", url: "https://www.youtube.com?v/i_LwzRVP7bg", type: "video", platform: "YouTube" },
    { title: "ML on freeCodeCamp", url: "https://www.freecodecamp.org/learn/machine-learning-with-python/", type: "course", platform: "freeCodeCamp" },
    { title: "Google ML Crash Course", url: "https://developers.google.com/machine-learning/crash-course", type: "article", platform: "Google" },
    { title: "Kaggle Learn", url: "https://www.kaggle.com/learn", type: "practice", platform: "Kaggle" },
  ],
  "communication": [
    { title: "Technical Communication", url: "https://www.freecodecamp.org/news/technical-writing-for-beginners/", type: "article", platform: "freeCodeCamp" },
    { title: "Public Speaking Skills", url: "https://www.youtube.com/watch?v=Unzc731iCUY", type: "video", platform: "YouTube" },
    { title: "STAR Method Guide", url: "https://www.indeed.com/career-advice/interviewing/star-method", type: "article", platform: "Indeed" },
    { title: "Mock Interview Practice", url: "https://www.pramp.com/", type: "practice", platform: "Pramp" },
    { title: "Behavioral Interview Prep", url: "https://www.levels.fyi/blog/how-to-crack-behavioral-interviews.html", type: "course", platform: "Levels.fyi" },
  ],
  "system design": [
    { title: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer", type: "article", platform: "GitHub" },
    { title: "System Design Course", url: "https://www.youtube.com/watch?v=U3RkDLtS7uY", type: "video", platform: "YouTube" },
    { title: "Grokking System Design", url: "https://www.educative.io/courses/grokking-the-system-design-interview", type: "course", platform: "Educative" },
    { title: "System Design Practice", url: "https://www.hellointerview.com/learn/system-design/in-a-hurry", type: "practice", platform: "Hello Interview" },
    { title: "ByteByteGo", url: "https://bytebytego.com/", type: "article", platform: "ByteByteGo" },
  ],
};

const CATEGORY_DEFAULTS: SkillResourceMap = {
  PROGRAMMING_LANGUAGE: [
    { title: "Learn to Code", url: "https://www.freecodecamp.org/", type: "course", platform: "freeCodeCamp" },
    { title: "LeetCode Practice", url: "https://leetcode.com/", type: "practice", platform: "LeetCode" },
    { title: "Coding Challenges", url: "https://codewars.com/", type: "practice", platform: "Codewars" },
    { title: "Developer Roadmap", url: "https://roadmap.sh/", type: "article", platform: "roadmap.sh" },
  ],
  FRAMEWORK: [
    { title: "Framework Documentation", url: "https://roadmap.sh/", type: "docs", platform: "roadmap.sh" },
    { title: "Build Projects", url: "https://www.freecodecamp.org/", type: "practice", platform: "freeCodeCamp" },
    { title: "Framework Tutorials", url: "https://www.youtube.com/results?search_query=framework+tutorial", type: "video", platform: "YouTube" },
    { title: "Framework Comparison", url: "https://roadmap.sh/frontend", type: "article", platform: "roadmap.sh" },
  ],
  DATABASE: [
    { title: "SQL Basics", url: "https://www.w3schools.com/sql/", type: "article", platform: "W3Schools" },
    { title: "Database Course", url: "https://www.freecodecamp.org/learn/relational-database/", type: "course", platform: "freeCodeCamp" },
    { title: "DB Design Tutorial", url: "https://www.youtube.com/watch?v=ztHopE5Wnpc", type: "video", platform: "YouTube" },
    { title: "SQL Practice", url: "https://sqlbolt.com/", type: "practice", platform: "SQLBolt" },
  ],
  DEVOPS: [
    { title: "DevOps Roadmap", url: "https://roadmap.sh/devops", type: "article", platform: "roadmap.sh" },
    { title: "CI/CD Tutorial", url: "https://www.youtube.com/watch?v=scEDHsr3APg", type: "video", platform: "YouTube" },
    { title: "Docker & Kubernetes", url: "https://www.freecodecamp.org/news/docker-tutorial-for-beginners/", type: "course", platform: "freeCodeCamp" },
    { title: "DevOps Practice", url: "https://killercoda.com/", type: "practice", platform: "KillerCoda" },
  ],
  CLOUD: [
    { title: "Cloud Computing Basics", url: "https://roadmap.sh/devops", type: "article", platform: "roadmap.sh" },
    { title: "AWS Fundamentals", url: "https://www.youtube.com/watch?v=SOTamWNgDKc", type: "video", platform: "YouTube" },
    { title: "Cloud Certification Prep", url: "https://skillbuilder.aws/", type: "practice", platform: "AWS" },
    { title: "Cloud Architecture", url: "https://docs.aws.amazon.com/wellarchitected/", type: "docs", platform: "AWS" },
  ],
  TOOL: [
    { title: "Git Tutorial", url: "https://docs.github.com/en/get-started/using-git", type: "docs", platform: "GitHub" },
    { title: "Dev Tools Guide", url: "https://roadmap.sh/devops", type: "article", platform: "roadmap.sh" },
    { title: "Tooling Course", url: "https://www.freecodecamp.org/", type: "course", platform: "freeCodeCamp" },
    { title: "Tool Practice", url: "https://learngitbranching.js.org/", type: "practice", platform: "Learn Git Branching" },
  ],
  SOFT_SKILL: [
    { title: "Soft Skills Guide", url: "https://www.freecodecamp.org/news/soft-skills-for-developers/", type: "article", platform: "freeCodeCamp" },
    { title: "Communication Skills", url: "https://www.youtube.com/watch?v=Unzc731iCUY", type: "video", platform: "YouTube" },
    { title: "Interview Skills", url: "https://www.pramp.com/", type: "practice", platform: "Pramp" },
    { title: "Teamwork & Leadership", url: "https://www.coursera.org/courses?query=soft+skills", type: "course", platform: "Coursera" },
  ],
};

const TYPE_LABELS: Record<ResourceType, string> = {
  video: "Video",
  article: "Article",
  course: "Course",
  practice: "Practice",
  docs: "Docs",
};

export function getResourceTypeLabel(type: ResourceType): string {
  return TYPE_LABELS[type];
}

export function getResourcesForSkill(skillName: string, category: string): LearningResource[] {
  const key = skillName.toLowerCase().trim();
  if (SKILL_RESOURCES[key]) {
    return SKILL_RESOURCES[key].slice(0, 4);
  }
  const catKey = category as keyof typeof CATEGORY_DEFAULTS;
  if (CATEGORY_DEFAULTS[catKey]) {
    return CATEGORY_DEFAULTS[catKey].slice(0, 4);
  }
  return [
    { title: `Learn ${skillName} on freeCodeCamp`, url: "https://www.freecodecamp.org/", type: "course", platform: "freeCodeCamp" },
    { title: `${skillName} Tutorial`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skillName + " tutorial")}`, type: "video", platform: "YouTube" },
    { title: `${skillName} Documentation`, url: `https://developer.mozilla.org/search?q=${encodeURIComponent(skillName)}`, type: "docs", platform: "MDN" },
    { title: `Practice ${skillName}`, url: "https://leetcode.com/", type: "practice", platform: "LeetCode" },
  ];
}
