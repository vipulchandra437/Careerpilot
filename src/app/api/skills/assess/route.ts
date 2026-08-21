import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { validateBody, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

const assessSchema = z.object({
  skillId: z.string().min(1),
});

interface AssessmentQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function generateQuestions(skillName: string, category: string): AssessmentQuestion[] {
  const name = skillName.toLowerCase();

  if (name === "javascript" || name === "js") {
    return [
      { question: "What does '===' check in JavaScript?", options: ["Value only", "Value and type", "Type only", "Reference equality"], correctIndex: 1, explanation: "The strict equality operator checks both value and type." },
      { question: "Which method creates a new array with filtered elements?", options: ["map()", "filter()", "reduce()", "forEach()"], correctIndex: 1, explanation: "filter() creates a new array with elements that pass a test." },
      { question: "What is a closure?", options: ["A loop construct", "A function with access to its outer scope", "A way to close the browser", "A type of variable"], correctIndex: 1, explanation: "A closure is a function that retains access to its lexical scope." },
      { question: "What does 'typeof null' return?", options: ["\"null\"", "\"undefined\"", "\"object\"", "\"boolean\""], correctIndex: 2, explanation: "typeof null returns \"object\" — this is a known JS bug." },
      { question: "Which is NOT a valid way to create an array?", options: ["[]", "new Array()", "Array.of()", "Array.create()"], correctIndex: 3, explanation: "Array.create() does not exist in JavaScript." },
    ];
  }

  if (name === "typescript" || name === "ts") {
    return [
      { question: "What is the 'any' type in TypeScript?", options: ["A type-safe escape hatch", "Disables type checking", "Represents any primitive", "Only allows null"], correctIndex: 1, explanation: "any disables type checking for the variable." },
      { question: "What does 'interface' define?", options: ["A class implementation", "A type contract", "A runtime value", "A module export"], correctIndex: 1, explanation: "An interface defines the shape/type contract of an object." },
      { question: "What is a union type?", options: ["Type A & B together", "Type A or B", "Type A extends B", "Type A imports B"], correctIndex: 1, explanation: "A union type (A | B) means the value can be either A or B." },
      { question: "Which keyword declares a generic type parameter?", options: ["function", "type", "<T>", "any"], correctIndex: 2, explanation: "Generic type parameters are declared with angle brackets <T>." },
      { question: "What is 'type narrowing'?", options: ["Making types smaller in scope", "Restricting a union to a specific type", "Converting types at runtime", "Importing types from modules"], correctIndex: 1, explanation: "Type narrowing is using control flow to restrict a union type." },
    ];
  }

  if (name === "react") {
    return [
      { question: "What hook is used for side effects?", options: ["useState", "useEffect", "useRef", "useMemo"], correctIndex: 1, explanation: "useEffect handles side effects like data fetching and subscriptions." },
      { question: "What is the virtual DOM?", options: ["A copy of the real DOM in memory", "A browser API", "A database", "A CSS framework"], correctIndex: 0, explanation: "The virtual DOM is an in-memory representation used for diffing." },
      { question: "When should you use useCallback?", options: ["Always", "To memoize callbacks", "To create new functions", "To replace useState"], correctIndex: 1, explanation: "useCallback memoizes a function to avoid unnecessary re-creation." },
      { question: "What does JSX compile to?", options: ["HTML", "React.createElement calls", "DOM nodes", "JavaScript strings"], correctIndex: 1, explanation: "JSX compiles to React.createElement() calls." },
      { question: "What is prop drilling?", options: ["Passing props deeply through components", "Deleting props", "Creating new props", "Using context instead"], correctIndex: 0, explanation: "Prop drilling is passing data through many component layers." },
    ];
  }

  if (name === "node.js" || name === "node") {
    return [
      { question: "What is the event loop?", options: ["A thread pool", "An async callback mechanism", "A database connection", "A file system API"], correctIndex: 1, explanation: "The event loop handles asynchronous callbacks in Node.js." },
      { question: "What does 'require' do?", options: ["Imports a module", "Creates a variable", "Defines a function", "Returns a promise"], correctIndex: 0, explanation: "require() is used to import modules in CommonJS." },
      { question: "What is middleware in Express?", options: ["A frontend framework", "Functions that run before route handlers", "A database layer", "A template engine"], correctIndex: 1, explanation: "Middleware functions execute sequentially before route handlers." },
      { question: "What is streams in Node.js?", options: ["Video playback", "Handling data piece by piece", "Network protocols", "File compression"], correctIndex: 1, explanation: "Streams process data in chunks rather than loading all at once." },
      { question: "What is package.json used for?", options: ["Styling", "Project metadata and dependencies", "HTML templates", "Database schemas"], correctIndex: 1, explanation: "package.json defines project metadata, scripts, and dependencies." },
    ];
  }

  if (name === "python") {
    return [
      { question: "What is a list comprehension?", options: ["A loop construct", "A concise way to create lists", "A type of function", "A string method"], correctIndex: 1, explanation: "List comprehensions provide concise syntax for creating lists." },
      { question: "What does 'self' represent?", options: ["The class itself", "The current instance", "A global variable", "A static method"], correctIndex: 1, explanation: "self refers to the current instance of the class." },
      { question: "What is a decorator?", options: ["A comment", "A function that modifies another function", "A variable type", "An import statement"], correctIndex: 1, explanation: "Decorators wrap functions to extend or modify their behavior." },
      { question: "What is PEP 8?", options: ["A Python version", "Style guide for Python code", "A testing framework", "An IDE"], correctIndex: 1, explanation: "PEP 8 is the official Python style guide." },
      { question: "What does *args allow?", options: ["Keyword arguments", "Variable positional arguments", "Class inheritance", "Module imports"], correctIndex: 1, explanation: "*args allows passing a variable number of positional arguments." },
    ];
  }

  if (category === "PROGRAMMING_LANGUAGE") {
    return [
      { question: `What is the time complexity of binary search on a sorted array of n elements?`, options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"], correctIndex: 1, explanation: "Binary search halves the search space each step, giving O(log n)." },
      { question: "What is the difference between a stack and a queue?", options: ["Stack is FIFO, queue is LIFO", "Stack is LIFO, queue is FIFO", "Both are FIFO", "Both are LIFO"], correctIndex: 1, explanation: "Stack follows Last-In-First-Out; queue follows First-In-First-Out." },
      { question: "What is recursion?", options: ["Looping until a condition", "A function calling itself", "Using global variables", "Importing modules"], correctIndex: 1, explanation: "Recursion is when a function calls itself with a base case." },
      { question: "What is polymorphism?", options: ["Having one type", "Objects of different types responding to the same interface", "Creating new classes", "Inheriting properties"], correctIndex: 1, explanation: "Polymorphism allows different types to be used through a common interface." },
      { question: "What is an API?", options: ["A programming interface", "A way for software to communicate", "A database query language", "A type of virus"], correctIndex: 1, explanation: "An API defines how software components communicate with each other." },
    ];
  }

  if (name.includes("sql") || name.includes("database") || category === "DATABASE") {
    return [
      { question: "What does SQL stand for?", options: ["Simple Query Language", "Structured Query Language", "Standard Query Logic", "Sequential Query Language"], correctIndex: 1, explanation: "SQL stands for Structured Query Language." },
      { question: "What does JOIN do?", options: ["Deletes records", "Combines rows from two tables", "Creates new tables", "Updates records"], correctIndex: 1, explanation: "JOIN combines rows from two or more tables based on a related column." },
      { question: "What is a primary key?", options: ["Any column", "A unique identifier for each row", "A foreign reference", "An index type"], correctIndex: 1, explanation: "A primary key uniquely identifies each record in a table." },
      { question: "What is normalization?", options: ["Adding more data", "Reducing redundancy by organizing data", "Deleting duplicates", "Creating backups"], correctIndex: 1, explanation: "Normalization organizes data to minimize redundancy." },
      { question: "What does GROUP BY do?", options: ["Sorts results", "Groups rows sharing a value for aggregation", "Filters rows", "Joins tables"], correctIndex: 1, explanation: "GROUP BY groups rows with the same values for aggregate functions." },
    ];
  }

  if (name.includes("docker") || name.includes("kubernetes") || category === "DEVOPS") {
    return [
      { question: "What is a Docker container?", options: ["A virtual machine", "A lightweight, isolated process", "A database", "A CI/CD pipeline"], correctIndex: 1, explanation: "Containers are lightweight, isolated processes using the host OS kernel." },
      { question: "What does a Dockerfile define?", options: ["Container runtime", "Build instructions for an image", "Network configuration", "Volume mounts"], correctIndex: 1, explanation: "A Dockerfile contains step-by-step build instructions for creating an image." },
      { question: "What is container orchestration?", options: ["Starting one container", "Managing containers at scale", "Building images", "Writing Dockerfiles"], correctIndex: 1, explanation: "Orchestration automates deployment, scaling, and management of containers." },
      { question: "What is CI/CD?", options: ["Cloud Infrastructure / Cloud Deployment", "Continuous Integration / Continuous Deployment", "Code Inspection / Code Debugging", "Container Image / Container Docker"], correctIndex: 1, explanation: "CI/CD automates the integration, testing, and deployment pipeline." },
      { question: "What is a Docker image vs container?", options: ["Same thing", "Image is a template, container is a running instance", "Container is a template, image is running", "Both are templates"], correctIndex: 1, explanation: "An image is a read-only template; a container is a running instance of an image." },
    ];
  }

  if (name.includes("aws") || name.includes("cloud") || category === "CLOUD") {
    return [
      { question: "What is IaaS?", options: ["Internet as a Service", "Infrastructure as a Service", "Integration as a Service", "Identity as a Service"], correctIndex: 1, explanation: "IaaS provides virtualized computing resources over the internet." },
      { question: "What is an AWS EC2 instance?", options: ["A database", "A virtual server", "A storage bucket", "A DNS service"], correctIndex: 1, explanation: "EC2 provides resizable virtual servers (instances) in the cloud." },
      { question: "What is serverless computing?", options: ["Running without servers", "No server management by the provider", "No server management by the user", "Running only locally"], correctIndex: 2, explanation: "Serverless means the provider manages the infrastructure; you focus on code." },
      { question: "What is auto-scaling?", options: ["Manual server increase", "Automatic adjustment of compute resources", "Fixed resource allocation", "Manual load balancing"], correctIndex: 1, explanation: "Auto-scaling adjusts resources based on demand automatically." },
      { question: "What is a load balancer?", options: ["A database replicator", "Distributes traffic across servers", "A firewall", "A caching layer"], correctIndex: 1, explanation: "A load balancer distributes incoming traffic across multiple servers." },
    ];
  }

  if (name.includes("machine learning") || name.includes("ml") || category === "AI_ML") {
    return [
      { question: "What is supervised learning?", options: ["Learning without labels", "Learning from labeled data", "Learning by trial and error", "Unstructured learning"], correctIndex: 1, explanation: "Supervised learning trains on labeled input-output pairs." },
      { question: "What is overfitting?", options: ["Model is too simple", "Model memorizes training data too well", "Model is too fast", "Model uses too little data"], correctIndex: 1, explanation: "Overfitting occurs when a model learns noise instead of patterns." },
      { question: "What is a neural network?", options: ["A type of database", "A computing system inspired by the brain", "A file system", "A network protocol"], correctIndex: 1, explanation: "Neural networks are layered computing systems modeled after biological neurons." },
      { question: "What is a training set?", options: ["Test data", "Data used to teach the model", "Data for evaluation", "Production data"], correctIndex: 1, explanation: "The training set is the data the model learns from during training." },
      { question: "What is gradient descent?", options: ["A sorting algorithm", "An optimization algorithm to minimize loss", "A data preprocessing technique", "A model architecture"], correctIndex: 1, explanation: "Gradient descent iteratively adjusts parameters to minimize the loss function." },
    ];
  }

  if (name.includes("git") || name.includes("version")) {
    return [
      { question: "What does 'git commit' do?", options: ["Sends code to remote", "Records staged changes locally", "Creates a new branch", "Merges branches"], correctIndex: 1, explanation: "git commit records staged changes to the local repository." },
      { question: "What is a merge conflict?", options: ["Git crashes", "Overlapping changes in the same file/lines", "Network error", "Permission denied"], correctIndex: 1, explanation: "Merge conflicts occur when the same lines are changed in different branches." },
      { question: "What is 'git pull'?", options: ["Pushes local changes", "Fetches and merges remote changes", "Creates a branch", "Deletes a file"], correctIndex: 1, explanation: "git pull fetches remote changes and merges them into the current branch." },
      { question: "What is a branch in Git?", options: ["A file", "An independent line of development", "A tag", "A commit message"], correctIndex: 1, explanation: "A branch is a parallel line of development that can diverge and merge." },
      { question: "What does 'git stash' do?", options: ["Commits changes", "Temporarily shelves uncommitted changes", "Deletes changes", "Creates a tag"], correctIndex: 1, explanation: "git stash temporarily saves uncommitted changes for later use." },
    ];
  }

  if (name.includes("communication") || name.includes("soft skill") || category === "SOFT_SKILL") {
    return [
      { question: "What does the STAR method stand for?", options: ["Start, Try, Achieve, Review", "Situation, Task, Action, Result", "Strategy, Tactics, Action, Report", "Study, Think, Apply, Reflect"], correctIndex: 1, explanation: "STAR: Situation, Task, Action, Result — a structured way to answer behavioral questions." },
      { question: "What is active listening?", options: ["Hearing music while studying", "Fully concentrating and responding to the speaker", "Multitasking during meetings", "Taking notes rapidly"], correctIndex: 1, explanation: "Active listening means fully engaging with and understanding the speaker." },
      { question: "How should you handle a disagreement professionally?", options: ["Ignore it", "Listen, acknowledge, present your view calmly", "Escalate immediately", "Agree to everything"], correctIndex: 1, explanation: "Professional disagreement involves listening, acknowledging, and communicating calmly." },
      { question: "What is constructive feedback?", options: ["Only positive comments", "Specific, actionable suggestions for improvement", "Vague criticism", "Personal attacks"], correctIndex: 1, explanation: "Constructive feedback is specific, actionable, and aimed at improvement." },
      { question: "What is emotional intelligence?", options: ["Being emotional", "Awareness and management of emotions in self and others", "High IQ", "Being empathetic only"], correctIndex: 1, explanation: "Emotional intelligence is the ability to recognize and manage emotions." },
    ];
  }

  if (name.includes("system design") || name.includes("architecture")) {
    return [
      { question: "What is horizontal scaling?", options: ["Adding more powerful hardware", "Adding more servers of the same type", "Increasing disk space", "Upgrading RAM only"], correctIndex: 1, explanation: "Horizontal scaling adds more machines rather than upgrading existing ones." },
      { question: "What is a load balancer?", options: ["A database", "Distributes traffic across servers", "A caching layer", "An API gateway"], correctIndex: 1, explanation: "A load balancer distributes incoming requests across multiple servers." },
      { question: "What is a CDN?", options: ["A database backup", "A geographically distributed network of servers", "A coding language", "An authentication system"], correctIndex: 1, explanation: "A CDN caches content at edge locations for faster delivery." },
      { question: "What is database sharding?", options: ["Encrypting data", "Splitting data across multiple databases by key", "Creating backups", "Adding indexes"], correctIndex: 1, explanation: "Sharding partitions data across databases to distribute load." },
      { question: "What is eventual consistency?", options: ["Data is always consistent", "Data becomes consistent over time after writes", "Data is never consistent", "Only reads are consistent"], correctIndex: 1, explanation: "Eventual consistency means replicas will converge to the same state eventually." },
    ];
  }

  return [
    { question: `What is the primary purpose of ${skillName}?`, options: ["Entertainment", "Solving specific problems in its domain", "Replacing other tools", "Storage"], correctIndex: 1, explanation: `${skillName} is designed to solve specific problems in its domain.` },
    { question: `What is a best practice when working with ${skillName}?`, options: ["Skip documentation", "Follow established patterns and conventions", "Ignore errors", "Use it for everything"], correctIndex: 1, explanation: "Following established patterns leads to maintainable, readable code." },
    { question: `How do you start learning ${skillName}?`, options: ["Build production apps immediately", "Follow tutorials and build small projects", "Read only the documentation", "Ask someone else to code"], correctIndex: 1, explanation: "Tutorials and small projects provide hands-on learning experience." },
    { question: `What is important for ${skillName} in a team setting?`, options: ["Working alone", "Communication and code review", "Hiding your code", "Avoiding documentation"], correctIndex: 1, explanation: "Communication and code review improve quality and knowledge sharing." },
    { question: `What is the first step when learning a new ${category.toLowerCase().replace(/_/g, " ")} technology?`, options: ["Skip to advanced topics", "Understand the fundamentals and core concepts", "Memorize the documentation", "Ignore existing patterns"], correctIndex: 1, explanation: "Understanding fundamentals provides a solid foundation for advanced learning." },
  ];
}

export async function POST(request: Request) {
  await requireUser();
  try {
    const { skillId } = await validateBody(request, assessSchema);

    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const questions = generateQuestions(skill.name, skill.category);

    return NextResponse.json({
      skillId: skill.id,
      skillName: skill.name,
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
