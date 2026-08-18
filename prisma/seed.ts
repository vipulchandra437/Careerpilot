import { PrismaClient, SkillCategory, Importance, Difficulty, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type Req = {
  skill: string;
  importance: keyof typeof Importance;
  requiredRating: number;
  weight?: number;
};

type Problem = {
  title: string;
  slug: string;
  description: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  difficulty: Difficulty;
  topics: string[];
  companies: string[];
  expectedComplexity: string;
  timeLimitMs: number;
  starterPython: string;
  starterJs: string;
  testCases: { args: unknown[]; expected: unknown }[];
  hiddenTestCases: { args: unknown[]; expected: unknown }[];
};

const SKILLS: { name: string; category: SkillCategory; description: string }[] = [
  // Programming languages
  { name: "Python", category: "PROGRAMMING_LANGUAGE", description: "General purpose programming language" },
  { name: "Java", category: "PROGRAMMING_LANGUAGE", description: "Object-oriented programming language" },
  { name: "C++", category: "PROGRAMMING_LANGUAGE", description: "Systems programming language" },
  { name: "JavaScript", category: "PROGRAMMING_LANGUAGE", description: "Web scripting language" },
  { name: "TypeScript", category: "PROGRAMMING_LANGUAGE", description: "Typed JavaScript superset" },
  { name: "Go", category: "PROGRAMMING_LANGUAGE", description: "Compiled concurrent language" },
  { name: "C#", category: "PROGRAMMING_LANGUAGE", description: "Microsoft .NET language" },
  { name: "SQL", category: "PROGRAMMING_LANGUAGE", description: "Structured query language" },
  { name: "Kotlin", category: "PROGRAMMING_LANGUAGE", description: "JVM language for Android" },
  { name: "Swift", category: "PROGRAMMING_LANGUAGE", description: "Apple platform language" },
  { name: "Rust", category: "PROGRAMMING_LANGUAGE", description: "Memory-safe systems language" },
  // Frameworks
  { name: "React", category: "FRAMEWORK", description: "Frontend UI library" },
  { name: "Node.js", category: "FRAMEWORK", description: "JavaScript runtime" },
  { name: "Next.js", category: "FRAMEWORK", description: "React framework" },
  { name: "Angular", category: "FRAMEWORK", description: "Frontend framework" },
  { name: "Vue", category: "FRAMEWORK", description: "Frontend framework" },
  { name: "Spring Boot", category: "FRAMEWORK", description: "Java backend framework" },
  { name: "Django", category: "FRAMEWORK", description: "Python backend framework" },
  { name: "Flask", category: "FRAMEWORK", description: "Python micro-framework" },
  { name: "FastAPI", category: "FRAMEWORK", description: "Modern Python API framework" },
  { name: "Express.js", category: "FRAMEWORK", description: "Node.js web framework" },
  // Databases
  { name: "PostgreSQL", category: "DATABASE", description: "Relational database" },
  { name: "MySQL", category: "DATABASE", description: "Relational database" },
  { name: "MongoDB", category: "DATABASE", description: "NoSQL document database" },
  { name: "Redis", category: "DATABASE", description: "In-memory data store" },
  { name: "DynamoDB", category: "DATABASE", description: "AWS NoSQL database" },
  { name: "Elasticsearch", category: "DATABASE", description: "Search and analytics engine" },
  { name: "Oracle", category: "DATABASE", description: "Enterprise relational database" },
  // AI/ML
  { name: "Machine Learning", category: "AI_ML", description: "Statistical models that learn from data" },
  { name: "Deep Learning", category: "AI_ML", description: "Neural networks" },
  { name: "Natural Language Processing", category: "AI_ML", description: "Language understanding" },
  { name: "Computer Vision", category: "AI_ML", description: "Image and video understanding" },
  { name: "Large Language Models", category: "AI_ML", description: "Transformer-based generative models" },
  { name: "PyTorch", category: "AI_ML", description: "Deep learning framework" },
  { name: "TensorFlow", category: "AI_ML", description: "Deep learning framework" },
  { name: "scikit-learn", category: "AI_ML", description: "ML toolkit" },
  { name: "LangChain", category: "AI_ML", description: "LLM application framework" },
  { name: "Generative AI", category: "AI_ML", description: "Content generation models" },
  { name: "Prompt Engineering", category: "AI_ML", description: "Designing LLM prompts" },
  { name: "RAG", category: "AI_ML", description: "Retrieval augmented generation" },
  { name: "LLM Fine-tuning", category: "AI_ML", description: "Adapting pretrained models" },
  // Cloud
  { name: "AWS", category: "CLOUD", description: "Amazon cloud platform" },
  { name: "Azure", category: "CLOUD", description: "Microsoft cloud platform" },
  { name: "Google Cloud", category: "CLOUD", description: "Google cloud platform" },
  { name: "Docker", category: "CLOUD", description: "Containerization" },
  { name: "Kubernetes", category: "CLOUD", description: "Container orchestration" },
  { name: "Serverless", category: "CLOUD", description: "Function-as-a-service" },
  // DevOps
  { name: "CI/CD", category: "DEVOPS", description: "Continuous integration/delivery" },
  { name: "GitHub Actions", category: "DEVOPS", description: "GitHub CI platform" },
  { name: "Jenkins", category: "DEVOPS", description: "CI server" },
  { name: "Terraform", category: "DEVOPS", description: "Infrastructure as code" },
  { name: "Linux", category: "DEVOPS", description: "Operating system" },
  // Tools / core CS
  { name: "Git", category: "TOOL", description: "Version control" },
  { name: "REST APIs", category: "TOOL", description: "HTTP API design" },
  { name: "GraphQL", category: "TOOL", description: "Query API language" },
  { name: "Data Structures", category: "TOOL", description: "Arrays, trees, graphs, hashing" },
  { name: "Algorithms", category: "TOOL", description: "Sorting, search, dynamic programming" },
  { name: "System Design", category: "TOOL", description: "Distributed systems architecture" },
  { name: "Design Patterns", category: "TOOL", description: "Reusable software design" },
  { name: "Operating Systems", category: "TOOL", description: "Processes, memory, concurrency" },
  { name: "Computer Networks", category: "TOOL", description: "Networking fundamentals" },
  { name: "Database Design", category: "TOOL", description: "Schema and query design" },
  { name: "Microservices", category: "TOOL", description: "Distributed service architecture" },
  { name: "Object-Oriented Programming", category: "TOOL", description: "OOP principles" },
  { name: "Unit Testing", category: "TOOL", description: "Automated test writing" },
  // Soft skills
  { name: "Communication", category: "SOFT_SKILL", description: "Verbal and written communication" },
  { name: "Teamwork", category: "SOFT_SKILL", description: "Collaboration" },
  { name: "Leadership", category: "SOFT_SKILL", description: "Guiding teams" },
  { name: "Problem Solving", category: "SOFT_SKILL", description: "Analytical problem solving" },
  { name: "Adaptability", category: "SOFT_SKILL", description: "Handling change" },
  { name: "Time Management", category: "SOFT_SKILL", description: "Prioritization" },
];

const PROBLEMS: Problem[] = [
  {
    title: "Two Sum",
    slug: "two-sum",
    description:
      "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`. You may assume that each input has exactly one solution, and you may not use the same element twice. Return the indices in increasing order.",
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
    ],
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0, 1]" },
      { input: "nums = [3,2,4], target = 6", output: "[1, 2]" },
    ],
    difficulty: "EASY",
    topics: ["Array", "Hash Table"],
    companies: ["Microsoft", "Google", "Amazon", "Meta", "Apple"],
    expectedComplexity: "O(n) time, O(n) space",
    timeLimitMs: 2000,
    starterPython: `def solution(nums, target):\n    # Return indices of the two numbers that add up to target\n    pass\n`,
    starterJs: `function solution(nums, target) {\n  // Return indices of the two numbers that add up to target\n  \n}\n`,
    testCases: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
    ],
    hiddenTestCases: [
      { args: [[1, 5, 3, 8], 8], expected: [1, 2] },
      { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
    ],
  },
  {
    title: "Reverse String",
    slug: "reverse-string",
    description:
      "Write a function that reverses a string. Return the reversed string.",
    constraints: ["1 <= s.length <= 10^5", "s consists of printable ASCII characters"],
    examples: [{ input: 's = "hello"', output: '"olleh"' }],
    difficulty: "EASY",
    topics: ["String", "Two Pointers"],
    companies: ["Google", "Amazon", "Meta"],
    expectedComplexity: "O(n) time, O(n) space",
    timeLimitMs: 2000,
    starterPython: `def solution(s):\n    # Return the reversed string\n    pass\n`,
    starterJs: `function solution(s) {\n  // Return the reversed string\n  \n}\n`,
    testCases: [
      { args: ["hello"], expected: "olleh" },
      { args: ["a"], expected: "a" },
      { args: ["racecar"], expected: "racecar" },
    ],
    hiddenTestCases: [
      { args: ["Was it a car or a cat I saw"], expected: "was I tac a ro rac a ti saW" },
    ],
  },
  {
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    description:
      "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. A string is valid if every open bracket is closed by the same type of bracket in the correct order.",
    constraints: ["1 <= s.length <= 10^4"],
    examples: [
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
    ],
    difficulty: "EASY",
    topics: ["Stack", "String"],
    companies: ["Microsoft", "Google", "Amazon", "Meta"],
    expectedComplexity: "O(n) time, O(n) space",
    timeLimitMs: 2000,
    starterPython: `def solution(s):\n    # Return True if the parentheses string is valid\n    pass\n`,
    starterJs: `function solution(s) {\n  // Return true if the parentheses string is valid\n  \n}\n`,
    testCases: [
      { args: ["()"], expected: true },
      { args: ["()[]{}"], expected: true },
      { args: ["(]"], expected: false },
      { args: ["([)]"], expected: false },
    ],
    hiddenTestCases: [
      { args: ["{[]}"], expected: true },
      { args: ["((()))[]{[()]}()"], expected: true },
      { args: [""], expected: true },
    ],
  },
  {
    title: "Roman to Integer",
    slug: "roman-to-integer",
    description:
      "Given a Roman numeral, convert it to an integer. Roman numerals use symbols I(1), V(5), X(10), L(50), C(100), D(500), M(1000). When a smaller value appears before a larger one it is subtracted (e.g. IV = 4, IX = 9).",
    constraints: ["1 <= s.length <= 15", "s contains only the characters (I, V, X, L, C, D, M)"],
    examples: [
      { input: 's = "III"', output: "3" },
      { input: 's = "MCMXCIV"', output: "1994" },
    ],
    difficulty: "EASY",
    topics: ["String", "Hash Table"],
    companies: ["Microsoft", "Amazon", "Uber"],
    expectedComplexity: "O(n) time, O(1) space",
    timeLimitMs: 2000,
    starterPython: `def solution(s):\n    # Return the integer value of the roman numeral\n    pass\n`,
    starterJs: `function solution(s) {\n  // Return the integer value of the roman numeral\n  \n}\n`,
    testCases: [
      { args: ["III"], expected: 3 },
      { args: ["LVIII"], expected: 58 },
      { args: ["MCMXCIV"], expected: 1994 },
    ],
    hiddenTestCases: [
      { args: ["IX"], expected: 9 },
      { args: ["MMMCMXCIX"], expected: 3999 },
    ],
  },
  {
    title: "Maximum Subarray",
    slug: "maximum-subarray",
    description:
      "Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    examples: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6" },
      { input: "nums = [1]", output: "1" },
    ],
    difficulty: "MEDIUM",
    topics: ["Array", "Dynamic Programming", "Divide and Conquer"],
    companies: ["Microsoft", "Google", "Amazon", "Meta", "Uber"],
    expectedComplexity: "O(n) time, O(1) space",
    timeLimitMs: 3000,
    starterPython: `def solution(nums):\n    # Return the maximum subarray sum\n    pass\n`,
    starterJs: `function solution(nums) {\n  // Return the maximum subarray sum\n  \n}\n`,
    testCases: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { args: [[1]], expected: 1 },
      { args: [[5, 4, -1, 7, 8]], expected: 23 },
    ],
    hiddenTestCases: [
      { args: [[-1]], expected: -1 },
      { args: [[-2, -1]], expected: -1 },
      { args: [[2, -1, 2, -3, 5]], expected: 5 },
    ],
  },
  {
    title: "Merge Intervals",
    slug: "merge-intervals",
    description:
      "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals and return an array of the non-overlapping intervals that cover all the intervals in the input. Intervals in the output must be sorted by start value.",
    constraints: ["1 <= intervals.length <= 10^4", "intervals[i].length == 2", "0 <= starti <= endi <= 10^4"],
    examples: [
      { input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]" },
      { input: "intervals = [[1,4],[4,5]]", output: "[[1,5]]" },
    ],
    difficulty: "MEDIUM",
    topics: ["Array", "Sorting"],
    companies: ["Google", "Amazon", "Meta", "Uber", "LinkedIn"],
    expectedComplexity: "O(n log n) time, O(n) space",
    timeLimitMs: 3000,
    starterPython: `def solution(intervals):\n    # Return merged intervals sorted by start\n    pass\n`,
    starterJs: `function solution(intervals) {\n  // Return merged intervals sorted by start\n  \n}\n`,
    testCases: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
    ],
    hiddenTestCases: [
      { args: [[[1, 4], [0, 2], [3, 5]]], expected: [[0, 5]] },
      { args: [[[5, 6]]], expected: [[5, 6]] },
    ],
  },
  {
    title: "Longest Substring Without Repeating Characters",
    slug: "longest-substring-without-repeating-characters",
    description:
      "Given a string `s`, find the length of the longest substring without repeating characters.",
    constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"],
    examples: [
      { input: 's = "abcabcbb"', output: "3" },
      { input: 's = "bbbbb"', output: "1" },
    ],
    difficulty: "MEDIUM",
    topics: ["String", "Sliding Window", "Hash Table"],
    companies: ["Microsoft", "Google", "Amazon", "Meta", "Adobe"],
    expectedComplexity: "O(n) time, O(min(n, charset)) space",
    timeLimitMs: 3000,
    starterPython: `def solution(s):\n    # Return the length of the longest substring without repeating characters\n    pass\n`,
    starterJs: `function solution(s) {\n  // Return the length of the longest substring without repeating characters\n  \n}\n`,
    testCases: [
      { args: ["abcabcbb"], expected: 3 },
      { args: ["bbbbb"], expected: 1 },
      { args: ["pwwkew"], expected: 3 },
      { args: [""], expected: 0 },
    ],
    hiddenTestCases: [
      { args: ["au"], expected: 2 },
      { args: ["dvdf"], expected: 3 },
    ],
  },
  {
    title: "Jump Game",
    slug: "jump-game",
    description:
      "You are given an integer array `nums`. You are initially positioned at the array's first index, and each element in the array represents your maximum jump length at that position. Return true if you can reach the last index, or false otherwise.",
    constraints: ["1 <= nums.length <= 10^4", "0 <= nums[i] <= 10^5"],
    examples: [
      { input: "nums = [2,3,1,1,4]", output: "true" },
      { input: "nums = [3,2,1,0,4]", output: "false" },
    ],
    difficulty: "MEDIUM",
    topics: ["Array", "Greedy", "Dynamic Programming"],
    companies: ["Google", "Amazon", "Meta", "Microsoft"],
    expectedComplexity: "O(n) time, O(1) space",
    timeLimitMs: 3000,
    starterPython: `def solution(nums):\n    # Return True if you can reach the last index\n    pass\n`,
    starterJs: `function solution(nums) {\n  // Return true if you can reach the last index\n  \n}\n`,
    testCases: [
      { args: [[2, 3, 1, 1, 4]], expected: true },
      { args: [[3, 2, 1, 0, 4]], expected: false },
    ],
    hiddenTestCases: [
      { args: [[0]], expected: true },
      { args: [[2, 0, 0]], expected: true },
      { args: [[1, 0, 1, 0]], expected: false },
    ],
  },
  {
    title: "Sliding Window Maximum",
    slug: "sliding-window-maximum",
    description:
      "You are given an array of integers `nums`, there is a sliding window of size `k` which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Return the max sliding window, i.e. an array of the maximum value in each window.",
    constraints: ["1 <= nums.length <= 10^5", "1 <= k <= nums.length"],
    examples: [
      { input: "nums = [1,3,-1,-3,5,3,6,7], k = 3", output: "[3,3,5,5,6,7]" },
    ],
    difficulty: "HARD",
    topics: ["Array", "Queue", "Sliding Window"],
    companies: ["Google", "Amazon", "Microsoft", "LinkedIn"],
    expectedComplexity: "O(n) time, O(k) space",
    timeLimitMs: 4000,
    starterPython: `def solution(nums, k):\n    # Return an array of the maximum value in each sliding window\n    pass\n`,
    starterJs: `function solution(nums, k) {\n  // Return an array of the maximum value in each sliding window\n  \n}\n`,
    testCases: [
      { args: [[1, 3, -1, -3, 5, 3, 6, 7], 3], expected: [3, 3, 5, 5, 6, 7] },
      { args: [[1], 1], expected: [1] },
    ],
    hiddenTestCases: [
      { args: [[9, 11], 2], expected: [11] },
      { args: [[4, -2], 2], expected: [4] },
    ],
  },
  {
    title: "Median of Two Sorted Arrays",
    slug: "median-of-two-sorted-arrays",
    description:
      "Given two sorted arrays `nums1` and `nums2` of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).",
    constraints: ["0 <= m, n <= 1000", "1 <= m + n <= 2000", "-10^6 <= nums1[i], nums2[i] <= 10^6"],
    examples: [
      { input: "nums1 = [1,3], nums2 = [2]", output: "2.0" },
      { input: "nums1 = [1,2], nums2 = [3,4]", output: "2.5" },
    ],
    difficulty: "HARD",
    topics: ["Array", "Binary Search", "Divide and Conquer"],
    companies: ["Google", "Amazon", "Microsoft", "Meta"],
    expectedComplexity: "O(log(m+n)) time",
    timeLimitMs: 4000,
    starterPython: `def solution(nums1, nums2):\n    # Return the median of the two sorted arrays\n    pass\n`,
    starterJs: `function solution(nums1, nums2) {\n  // Return the median of the two sorted arrays\n  \n}\n`,
    testCases: [
      { args: [[1, 3], [2]], expected: 2.0 },
      { args: [[1, 2], [3, 4]], expected: 2.5 },
    ],
    hiddenTestCases: [
      { args: [[], [1]], expected: 1.0 },
      { args: [[0, 0], [0, 0]], expected: 0.0 },
    ],
  },
  {
    title: "Minimum Window Substring",
    slug: "minimum-window-substring",
    description:
      "Given two strings `s` and `t` of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string. The test answer will be unique.",
    constraints: ["m == s.length", "n == t.length", "1 <= m, n <= 10^5"],
    examples: [
      { input: 's = "ADOBECODEBANC", t = "ABC"', output: '"BANC"' },
      { input: 's = "a", t = "a"', output: '"a"' },
    ],
    difficulty: "HARD",
    topics: ["String", "Sliding Window", "Hash Table"],
    companies: ["Microsoft", "Google", "Amazon", "Meta"],
    expectedComplexity: "O(m + n) time, O(n) space",
    timeLimitMs: 4000,
    starterPython: `def solution(s, t):\n    # Return the minimum window substring\n    pass\n`,
    starterJs: `function solution(s, t) {\n  // Return the minimum window substring\n  \n}\n`,
    testCases: [
      { args: ["ADOBECODEBANC", "ABC"], expected: "BANC" },
      { args: ["a", "a"], expected: "a" },
    ],
    hiddenTestCases: [
      { args: ["a", "aa"], expected: "" },
      { args: ["ab", "b"], expected: "b" },
    ],
  },
  {
    title: "Spiral Matrix",
    slug: "spiral-matrix",
    description:
      "Given an m x n matrix, return all elements of the matrix in spiral order (right, down, left, up, repeat).",
    constraints: ["m == matrix.length", "n == matrix[i].length", "1 <= m, n <= 10"],
    examples: [
      { input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]", output: "[1,2,3,6,9,8,7,4,5]" },
    ],
    difficulty: "MEDIUM",
    topics: ["Array", "Matrix", "Simulation"],
    companies: ["Microsoft", "Google", "Amazon", "Apple"],
    expectedComplexity: "O(m*n) time, O(1) extra space",
    timeLimitMs: 3000,
    starterPython: `def solution(matrix):\n    # Return all elements in spiral order\n    pass\n`,
    starterJs: `function solution(matrix) {\n  // Return all elements in spiral order\n  \n}\n`,
    testCases: [
      { args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [1, 2, 3, 6, 9, 8, 7, 4, 5] },
      { args: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], expected: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7] },
    ],
    hiddenTestCases: [
      { args: [[[7]]], expected: [7] },
      { args: [[[1, 2], [3, 4]]], expected: [1, 2, 4, 3] },
    ],
  },
  // ==================== EASY (6 new) ====================
  {
    title: "Valid Anagram",
    slug: "valid-anagram",
    description:
      "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise. An anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
    constraints: [
      "1 <= s.length, t.length <= 5 * 10^4",
      "s and t consist of lowercase English letters.",
    ],
    examples: [
      { input: 's = "anagram", t = "nagaram"', output: "true", explanation: 'The letters in "anagram" can be rearranged to form "nagaram".' },
      { input: 's = "rat", t = "car"', output: "false", explanation: '"rat" and "car" do not contain the same characters.' },
    ],
    difficulty: "EASY",
    topics: ["Hash Table", "String", "Sorting"],
    companies: ["Google", "Amazon", "Microsoft"],
    expectedComplexity: "O(n) time, O(1) space",
    timeLimitMs: 2000,
    starterPython: `def solution(s, t):\n    # Return True if t is an anagram of s\n    pass\n`,
    starterJs: `function solution(s, t) {\n  // Return true if t is an anagram of s\n  \n}\n`,
    testCases: [
      { args: ["anagram", "nagaram"], expected: true },
      { args: ["rat", "car"], expected: false },
      { args: ["listen", "silent"], expected: true },
    ],
    hiddenTestCases: [
      { args: ["a", "ab"], expected: false },
      { args: ["", ""], expected: true },
    ],
  },
  {
    title: "Best Time to Buy and Sell Stock",
    slug: "best-time-to-buy-and-sell-stock",
    description:
      "You are given an array `prices` where `prices[i]` is the price of a given stock on the `ith` day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.",
    constraints: [
      "1 <= prices.length <= 10^5",
      "0 <= prices[i] <= 10^4",
    ],
    examples: [
      { input: "prices = [7,1,5,3,6,4]", output: "5", explanation: "Buy on day 2 (price=1) and sell on day 5 (price=6), profit = 6-1 = 5." },
      { input: "prices = [7,6,4,3,1]", output: "0", explanation: "No transaction is done, max profit = 0." },
    ],
    difficulty: "EASY",
    topics: ["Array", "Dynamic Programming"],
    companies: ["Amazon", "Meta", "Google"],
    expectedComplexity: "O(n) time, O(1) space",
    timeLimitMs: 2000,
    starterPython: `def solution(prices):\n    # Return the maximum profit\n    pass\n`,
    starterJs: `function solution(prices) {\n  // Return the maximum profit\n  \n}\n`,
    testCases: [
      { args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
      { args: [[7, 6, 4, 3, 1]], expected: 0 },
      { args: [[1, 2]], expected: 1 },
    ],
    hiddenTestCases: [
      { args: [[2, 4, 1]], expected: 2 },
      { args: [[3, 3, 5, 0, 0, 3, 1, 4]], expected: 7 },
    ],
  },
  {
    title: "Linked List Cycle",
    slug: "linked-list-cycle",
    description:
      "Given `head`, the head of a linked list, determine if the linked list has a cycle in it. There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the `next` pointer. Internally, `pos` is used to denote the index of the node that the tail's `next` pointer is connected to. Note that `pos` is not passed as a parameter. Return `true` if there is a cycle in the linked list. Otherwise, return `false`.",
    constraints: [
      "The number of the nodes in the list is in the range [0, 10^4].",
      "-10^5 <= Node.val <= 10^5",
      "pos is -1 or a valid index in the linked-list.",
    ],
    examples: [
      { input: "head = [3,2,0,-4], pos = 1", output: "true", explanation: "There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed)." },
      { input: "head = [1,2], pos = -1", output: "false", explanation: "There is no cycle in the linked list." },
    ],
    difficulty: "EASY",
    topics: ["Linked List", "Two Pointers", "Floyd's"],
    companies: ["Microsoft", "Amazon", "Google"],
    expectedComplexity: "O(n) time, O(1) space",
    timeLimitMs: 2000,
    starterPython: `def solution(head):\n    # Return True if the linked list has a cycle\n    pass\n`,
    starterJs: `function solution(head) {\n  // Return true if the linked list has a cycle\n  \n}\n`,
    testCases: [
      { args: [[3, 2, 0, -4], 1], expected: true },
      { args: [[1, 2], -1], expected: false },
      { args: [[1], 0], expected: true },
    ],
    hiddenTestCases: [
      { args: [[1], -1], expected: false },
      { args: [[1, 2, 3, 4, 5], 2], expected: true },
    ],
  },
  {
    title: "Invert Binary Tree",
    slug: "invert-binary-tree",
    description:
      "Given the `root` of a binary tree, invert the tree, and return its root. Inverting a binary tree means swapping the left and right children of every node in the tree.",
    constraints: [
      "The number of nodes in the tree is in the range [0, 100].",
      "-100 <= Node.val <= 100",
    ],
    examples: [
      { input: "root = [4,2,7,1,3,6,9]", output: "[4,7,2,9,6,3,1]", explanation: "The left and right children of every node are swapped." },
      { input: "root = [2,1,3]", output: "[2,3,1]" },
    ],
    difficulty: "EASY",
    topics: ["Tree", "DFS", "BFS"],
    companies: ["Google", "Meta", "Apple"],
    expectedComplexity: "O(n) time, O(h) space",
    timeLimitMs: 2000,
    starterPython: `def solution(root):\n    # Return the root of the inverted binary tree\n    pass\n`,
    starterJs: `function solution(root) {\n  // Return the root of the inverted binary tree\n  \n}\n`,
    testCases: [
      { args: [[4, 2, 7, 1, 3, 6, 9]], expected: [4, 7, 2, 9, 6, 3, 1] },
      { args: [[2, 1, 3]], expected: [2, 3, 1] },
      { args: [[]], expected: [] },
    ],
    hiddenTestCases: [
      { args: [[1]], expected: [1] },
      { args: [[1, 2, 3, 4, 5]], expected: [1, 3, 2, 5, 4] },
    ],
  },
  {
    title: "Climbing Stairs",
    slug: "climbing-stairs",
    description:
      "You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?",
    constraints: [
      "1 <= n <= 45",
    ],
    examples: [
      { input: "n = 2", output: "2", explanation: "There are two ways: 1+1 and 2." },
      { input: "n = 3", output: "3", explanation: "There are three ways: 1+1+1, 1+2, and 2+1." },
    ],
    difficulty: "EASY",
    topics: ["Dynamic Programming", "Math"],
    companies: ["Amazon", "Apple", "Google"],
    expectedComplexity: "O(n) time, O(1) space",
    timeLimitMs: 2000,
    starterPython: `def solution(n):\n    # Return the number of distinct ways to climb to the top\n    pass\n`,
    starterJs: `function solution(n) {\n  // Return the number of distinct ways to climb to the top\n  \n}\n`,
    testCases: [
      { args: [2], expected: 2 },
      { args: [3], expected: 3 },
      { args: [5], expected: 8 },
    ],
    hiddenTestCases: [
      { args: [1], expected: 1 },
      { args: [10], expected: 89 },
    ],
  },
  {
    title: "Merge Two Sorted Lists",
    slug: "merge-two-sorted-lists",
    description:
      "You are given the heads of two sorted linked lists `list1` and `list2`. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.",
    constraints: [
      "Both lists are sorted in non-decreasing order.",
      "The number of nodes in both lists is in the range [0, 50].",
      "-100 <= Node.val <= 100",
    ],
    examples: [
      { input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]" },
      { input: "list1 = [], list2 = []", output: "[]" },
    ],
    difficulty: "EASY",
    topics: ["Linked List", "Recursion"],
    companies: ["Microsoft", "Amazon", "Meta"],
    expectedComplexity: "O(m+n) time, O(1) space",
    timeLimitMs: 2000,
    starterPython: `def solution(list1, list2):\n    # Return the head of the merged sorted linked list\n    pass\n`,
    starterJs: `function solution(list1, list2) {\n  // Return the head of the merged sorted linked list\n  \n}\n`,
    testCases: [
      { args: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4] },
      { args: [[], []], expected: [] },
      { args: [[], [0]], expected: [0] },
    ],
    hiddenTestCases: [
      { args: [[2], [1]], expected: [1, 2] },
      { args: [[1, 3, 5], [2, 4, 6]], expected: [1, 2, 3, 4, 5, 6] },
    ],
  },
  // ==================== MEDIUM (8 new) ====================
  {
    title: "Number of Islands",
    slug: "number-of-islands",
    description:
      "Given an `m x n` 2D binary grid `grid` which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.",
    constraints: [
      "m == grid.length",
      "n == grid[i].length",
      "1 <= m, n <= 300",
      "grid[i][j] is '0' or '1'.",
    ],
    examples: [
      { input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', output: "1" },
      { input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', output: "3" },
    ],
    difficulty: "MEDIUM",
    topics: ["Graph", "DFS", "BFS", "Matrix"],
    companies: ["Amazon", "Google", "Meta"],
    expectedComplexity: "O(m*n) time, O(m*n) space",
    timeLimitMs: 3000,
    starterPython: `def solution(grid):\n    # Return the number of islands\n    pass\n`,
    starterJs: `function solution(grid) {\n  // Return the number of islands\n  \n}\n`,
    testCases: [
      { args: [[["1", "1", "1", "1", "0"], ["1", "1", "0", "1", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "0", "0", "0"]]], expected: 1 },
      { args: [[["1", "1", "0", "0", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "1", "0", "0"], ["0", "0", "0", "1", "1"]]], expected: 3 },
      { args: [[["1", "0", "1"], ["0", "1", "0"], ["1", "0", "1"]]], expected: 5 },
    ],
    hiddenTestCases: [
      { args: [[["1"]]], expected: 1 },
      { args: [[["0"]]], expected: 0 },
    ],
  },
  {
    title: "Binary Tree Level Order Traversal",
    slug: "binary-tree-level-order-traversal",
    description:
      "Given the `root` of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).",
    constraints: [
      "The number of nodes in the tree is in the range [0, 2000].",
      "-1000 <= Node.val <= 1000",
    ],
    examples: [
      { input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]" },
      { input: "root = [1]", output: "[[1]]" },
    ],
    difficulty: "MEDIUM",
    topics: ["Tree", "BFS"],
    companies: ["Microsoft", "Google", "Meta"],
    expectedComplexity: "O(n) time, O(n) space",
    timeLimitMs: 3000,
    starterPython: `def solution(root):\n    # Return the level order traversal of the binary tree\n    pass\n`,
    starterJs: `function solution(root) {\n  // Return the level order traversal of the binary tree\n  \n}\n`,
    testCases: [
      { args: [[3, 9, 20, null, null, 15, 7]], expected: [[3], [9, 20], [15, 7]] },
      { args: [[1]], expected: [[1]] },
      { args: [[]], expected: [] },
    ],
    hiddenTestCases: [
      { args: [[1, 2, 3, 4, 5]], expected: [[1], [2, 3], [4, 5]] },
      { args: [[1, null, 2, null, 3]], expected: [[1], [2], [3]] },
    ],
  },
  {
    title: "Coin Change",
    slug: "coin-change",
    description:
      "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`. You may assume that you have an infinite number of each kind of coin.",
    constraints: [
      "1 <= coins.length <= 12",
      "1 <= coins[i] <= 2^31 - 1",
      "0 <= amount <= 10^4",
    ],
    examples: [
      { input: "coins = [1,5,10,25], amount = 30", output: "2", explanation: "5 + 25 = 30." },
      { input: "coins = [2], amount = 3", output: "-1", explanation: "It is impossible to make 3 with only coin of value 2." },
    ],
    difficulty: "MEDIUM",
    topics: ["Dynamic Programming", "BFS"],
    companies: ["Amazon", "Google", "Microsoft"],
    expectedComplexity: "O(amount * n) time, O(amount) space",
    timeLimitMs: 3000,
    starterPython: `def solution(coins, amount):\n    # Return the fewest number of coins needed, or -1\n    pass\n`,
    starterJs: `function solution(coins, amount) {\n  // Return the fewest number of coins needed, or -1\n  \n}\n`,
    testCases: [
      { args: [[1, 5, 10, 25], 30], expected: 2 },
      { args: [[2], 3], expected: -1 },
      { args: [[1], 0], expected: 0 },
    ],
    hiddenTestCases: [
      { args: [[1, 2, 5], 11], expected: 3 },
      { args: [[186, 419, 83, 408], 6249], expected: 20 },
    ],
  },
  {
    title: "Product of Array Except Self",
    slug: "product-of-array-except-self",
    description:
      "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`. The product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer. You must write an algorithm that runs in O(n) time and without using the division operation.",
    constraints: [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30",
      "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.",
    ],
    examples: [
      { input: "nums = [1,2,3,4]", output: "[24,12,8,6]" },
      { input: "nums = [-1,1,0,-3,3]", output: "[0,0,9,0,0]" },
    ],
    difficulty: "MEDIUM",
    topics: ["Array", "Prefix Sum"],
    companies: ["Amazon", "Meta", "Google"],
    expectedComplexity: "O(n) time, O(1) extra space",
    timeLimitMs: 3000,
    starterPython: `def solution(nums):\n    # Return array where answer[i] = product of all nums except nums[i]\n    pass\n`,
    starterJs: `function solution(nums) {\n  // Return array where answer[i] = product of all nums except nums[i]\n  \n}\n`,
    testCases: [
      { args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { args: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
      { args: [[2, 3]], expected: [3, 2] },
    ],
    hiddenTestCases: [
      { args: [[-1, -1]], expected: [-1, -1] },
      { args: [[1, 0]], expected: [0, 1] },
    ],
  },
  {
    title: "Search in Rotated Sorted Array",
    slug: "search-in-rotated-sorted-array",
    description:
      "Given a sorted array that has been rotated at some pivot unknown to you beforehand (i.e., `[0,1,2,4,5,6,7]` might become `[4,5,6,7,0,1,2]`). You are given a target value to search. If found in the array return its index, otherwise return `-1`. You may assume no duplicate exists in the array. Your algorithm's runtime complexity must be in the order of O(log n).",
    constraints: [
      "1 <= nums.length <= 5000",
      "-10^4 <= nums[i] <= 10^4",
      "All values of nums are unique.",
      "nums is an ascending array that is possibly rotated.",
    ],
    examples: [
      { input: "nums = [4,5,6,7,0,1,2], target = 0", output: "4" },
      { input: "nums = [4,5,6,7,0,1,2], target = 3", output: "-1" },
    ],
    difficulty: "MEDIUM",
    topics: ["Binary Search", "Array"],
    companies: ["Amazon", "Google", "Microsoft"],
    expectedComplexity: "O(log n) time, O(1) space",
    timeLimitMs: 3000,
    starterPython: `def solution(nums, target):\n    # Return the index of target in the rotated sorted array, or -1\n    pass\n`,
    starterJs: `function solution(nums, target) {\n  // Return the index of target in the rotated sorted array, or -1\n  \n}\n`,
    testCases: [
      { args: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4 },
      { args: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
      { args: [[1], 0], expected: -1 },
    ],
    hiddenTestCases: [
      { args: [[1], 1], expected: 0 },
      { args: [[5, 1, 3], 3], expected: 2 },
    ],
  },
  {
    title: "LRU Cache",
    slug: "lru-cache",
    description:
      "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the `LRUCache` class with `get(key)` and `put(key, value)` methods. Both operations must run in O(1) average time complexity. The cache has a fixed capacity. When the cache exceeds capacity, the least recently used item should be evicted.",
    constraints: [
      "1 <= capacity <= 3000",
      "0 <= key <= 10^4",
      "0 <= value <= 10^5",
      "At most 2 * 10^5 calls will be made to get and put.",
    ],
    examples: [
      { input: '["LRUCache","put","put","get","put","get","put","get","get","get"]\n[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]', output: "[null,null,null,1,null,-1,null,-1,3,4]" },
    ],
    difficulty: "MEDIUM",
    topics: ["Hash Table", "Linked List", "Design"],
    companies: ["Amazon", "Google", "Microsoft"],
    expectedComplexity: "O(1) time for get and put",
    timeLimitMs: 3000,
    starterPython: `class LRUCache:\n    def __init__(self, capacity):\n        pass\n    def get(self, key):\n        pass\n    def put(self, key, value):\n        pass\n`,
    starterJs: `class LRUCache {\n  constructor(capacity) {\n  }\n  get(key) {\n  }\n  put(key, value) {\n  }\n}\n`,
    testCases: [
      { args: [2, [[1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]], expected: [null, null, 1, null, -1, null, -1, 3, 4] },
      { args: [1, [[1, 1], [1, 2], [1]]], expected: [null, null, 2] },
      { args: [2, [[1, 1], [2, 2], [3, 3], [2]]], expected: [null, null, null, -1] },
    ],
    hiddenTestCases: [
      { args: [1, [[2, 1], [2], [2, 2], [2]]], expected: [null, 1, null, 2] },
      { args: [2, [[2, 1], [3, 2], [3], [2, 3], [4, 4], [3]]], expected: [null, null, 2, null, null, -1] },
    ],
  },
  {
    title: "Validate BST",
    slug: "validate-bst",
    description:
      "Given the `root` of a binary tree, determine if it is a valid binary search tree (BST). A valid BST is defined as follows: the left subtree of a node contains only nodes with keys less than the node's key; the right subtree of a node contains only nodes with keys greater than the node's key; both the left and right subtrees must also be binary search trees.",
    constraints: [
      "The number of nodes in the tree is in the range [1, 10^4].",
      "-2^31 <= Node.val <= 2^31 - 1",
    ],
    examples: [
      { input: "root = [2,1,3]", output: "true" },
      { input: "root = [5,1,4,null,null,3,6]", output: "false", explanation: "The node with value 4 is in the right subtree of 5, but 4 < 5, which violates the BST property." },
    ],
    difficulty: "MEDIUM",
    topics: ["Tree", "DFS", "Binary Search Tree"],
    companies: ["Amazon", "Google", "Microsoft"],
    expectedComplexity: "O(n) time, O(h) space",
    timeLimitMs: 3000,
    starterPython: `def solution(root):\n    # Return True if the binary tree is a valid BST\n    pass\n`,
    starterJs: `function solution(root) {\n  // Return true if the binary tree is a valid BST\n  \n}\n`,
    testCases: [
      { args: [[2, 1, 3]], expected: true },
      { args: [[5, 1, 4, null, null, 3, 6]], expected: false },
      { args: [[1]], expected: true },
    ],
    hiddenTestCases: [
      { args: [[1, 1]], expected: false },
      { args: [[10, 5, 15, null, null, 6, 20]], expected: false },
    ],
  },
  {
    title: "Graph Valid Tree",
    slug: "graph-valid-tree",
    description:
      "You have a list of `n` nodes labeled from `0` to `n - 1` and a list of `edges` where `edges[i] = [ai, bi]` indicates that there is an undirected edge between nodes `ai` and `bi` in the graph. Return `true` if the edges of the given graph make up a valid tree, and `false` otherwise. A valid tree is connected and has no cycles.",
    constraints: [
      "1 <= n <= 2000",
      "0 <= edges.length <= 5000",
      "All the pairs (ai, bi) are distinct.",
      "There are no self-loops or parallel edges.",
    ],
    examples: [
      { input: "n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]", output: "true", explanation: "All 5 nodes are connected and there are no cycles." },
      { input: "n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]", output: "false", explanation: "There is a cycle between nodes 1, 2, and 3." },
    ],
    difficulty: "MEDIUM",
    topics: ["Graph", "Union Find", "DFS"],
    companies: ["Google", "Amazon", "Meta"],
    expectedComplexity: "O(n + e) time, O(n) space",
    timeLimitMs: 3000,
    starterPython: `def solution(n, edges):\n    # Return True if the graph is a valid tree\n    pass\n`,
    starterJs: `function solution(n, edges) {\n  // Return true if the graph is a valid tree\n  \n}\n`,
    testCases: [
      { args: [5, [[0, 1], [0, 2], [0, 3], [1, 4]]], expected: true },
      { args: [5, [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]]], expected: false },
      { args: [1, []], expected: true },
    ],
    hiddenTestCases: [
      { args: [3, [[0, 1], [1, 2], [2, 0]]], expected: false },
      { args: [4, [[0, 1], [2, 3]]], expected: false },
    ],
  },
  // ==================== HARD (6 new) ====================
  {
    title: "Trapping Rain Water",
    slug: "trapping-rain-water",
    description:
      "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining. Each element in the array represents the height of a bar at that position.",
    constraints: [
      "n == height.length",
      "1 <= n <= 2 * 10^4",
      "0 <= height[i] <= 10^5",
    ],
    examples: [
      { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6", explanation: "6 units of rain water are trapped." },
      { input: "height = [4,2,0,3,2,5]", output: "9", explanation: "9 units of rain water are trapped." },
    ],
    difficulty: "HARD",
    topics: ["Array", "Two Pointers", "Stack"],
    companies: ["Amazon", "Google", "Microsoft"],
    expectedComplexity: "O(n) time, O(1) space",
    timeLimitMs: 5000,
    starterPython: `def solution(height):\n    # Return the total water trapped\n    pass\n`,
    starterJs: `function solution(height) {\n  // Return the total water trapped\n  \n}\n`,
    testCases: [
      { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
      { args: [[4, 2, 0, 3, 2, 5]], expected: 9 },
      { args: [[1]], expected: 0 },
    ],
    hiddenTestCases: [
      { args: [[1, 0, 1]], expected: 1 },
      { args: [[5, 4, 3, 2, 1]], expected: 0 },
    ],
  },
  {
    title: "Word Ladder",
    slug: "word-ladder",
    description:
      "A transformation sequence from word `beginWord` to word `endWord` using a dictionary `wordList` is a sequence of words `beginWord -> s1 -> s2 -> ... -> sk` such that every adjacent pair of words differs by a single letter, and every `si` is in `wordList`. Given `beginWord`, `endWord`, and a `wordList`, return the number of words in the shortest transformation sequence, or `0` if no such sequence exists.",
    constraints: [
      "1 <= beginWord.length <= 10",
      "beginWord, endWord, and wordList[i] consist of lowercase English letters.",
      "1 <= wordList.length <= 5000",
    ],
    examples: [
      { input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]', output: "5", explanation: 'hit -> hot -> dot -> dog -> cog (5 words).' },
      { input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]', output: "0", explanation: '"cog" is not in wordList, so no transformation exists.' },
    ],
    difficulty: "HARD",
    topics: ["Graph", "BFS", "String"],
    companies: ["Amazon", "Google", "Meta"],
    expectedComplexity: "O(M^2 * N) time where M is word length, N is wordList size",
    timeLimitMs: 5000,
    starterPython: `def solution(beginWord, endWord, wordList):\n    # Return the shortest transformation sequence length, or 0\n    pass\n`,
    starterJs: `function solution(beginWord, endWord, wordList) {\n  // Return the shortest transformation sequence length, or 0\n  \n}\n`,
    testCases: [
      { args: ["hit", "cog", ["hot", "dot", "dog", "lot", "log", "cog"]], expected: 5 },
      { args: ["hit", "cog", ["hot", "dot", "dog", "lot", "log"]], expected: 0 },
      { args: ["a", "c", ["a", "b", "c"]], expected: 2 },
    ],
    hiddenTestCases: [
      { args: ["lost", "cost", ["most", "fist", "lost", "cost", "boss"]], expected: 2 },
      { args: ["qa", "sq", ["si", "go", "se", "cm", "so", "ph", "mt", "db", "mb", "sb", "kr", "ln", "tm", "av", "sm", "ar", "ca", "ms", "ba", "rn", "di", "fa", "bt", "rb", "ab", "sb", "oa", "qp", "ki", "hm", "ba"]], expected: 5 },
    ],
  },
  {
    title: "Merge K Sorted Lists",
    slug: "merge-k-sorted-lists",
    description:
      "You are given an array of `k` linked lists `lists`, each linked list is sorted in ascending order. Merge all the linked lists into one sorted linked list and return it.",
    constraints: [
      "k == lists.length",
      "0 <= k <= 10^4",
      "0 <= lists[i].length <= 500",
      "-10^4 <= lists[i][j] <= 10^4",
      "Each lists[i] is sorted in ascending order.",
    ],
    examples: [
      { input: "lists = [[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]" },
      { input: "lists = []", output: "[]" },
    ],
    difficulty: "HARD",
    topics: ["Linked List", "Heap", "Divide and Conquer"],
    companies: ["Amazon", "Google", "Meta"],
    expectedComplexity: "O(N log k) time, O(1) space",
    timeLimitMs: 5000,
    starterPython: `def solution(lists):\n    # Return the head of the merged sorted linked list\n    pass\n`,
    starterJs: `function solution(lists) {\n  // Return the head of the merged sorted linked list\n  \n}\n`,
    testCases: [
      { args: [[1, 4, 5], [1, 3, 4], [2, 6]], expected: [1, 1, 2, 3, 4, 4, 5, 6] },
      { args: [[]], expected: [] },
      { args: [[], [1]], expected: [1] },
    ],
    hiddenTestCases: [
      { args: [[1]], expected: [1] },
      { args: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], expected: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    ],
  },
  {
    title: "Binary Tree Maximum Path Sum",
    slug: "binary-tree-maximum-path-sum",
    description:
      "A path in a binary tree is a sequence of nodes where each pair of adjacent nodes in the sequence has an edge connecting them. A node can only appear in the sequence at most once. The path does not need to pass through the root. The path sum of a path is the sum of the node's values in the path. Given the `root` of a binary tree, return the maximum path sum of any non-empty path.",
    constraints: [
      "The number of nodes in the tree is in the range [1, 3 * 10^4].",
      "-1000 <= Node.val <= 1000",
    ],
    examples: [
      { input: "root = [1,2,3]", output: "6", explanation: "The path is 2 -> 1 -> 3 with sum 6." },
      { input: "root = [-10,9,20,null,null,15,7]", output: "42", explanation: "The path is 15 -> 20 -> 7 with sum 42." },
    ],
    difficulty: "HARD",
    topics: ["Tree", "DFS", "Dynamic Programming"],
    companies: ["Amazon", "Google", "Meta"],
    expectedComplexity: "O(n) time, O(h) space",
    timeLimitMs: 5000,
    starterPython: `def solution(root):\n    # Return the maximum path sum\n    pass\n`,
    starterJs: `function solution(root) {\n  // Return the maximum path sum\n  \n}\n`,
    testCases: [
      { args: [[1, 2, 3]], expected: 6 },
      { args: [[-10, 9, 20, null, null, 15, 7]], expected: 42 },
      { args: [[-3]], expected: -3 },
    ],
    hiddenTestCases: [
      { args: [[5, -10, 20, -5, -2, null, null]], expected: 35 },
      { args: [[1, -2, 3]], expected: 3 },
    ],
  },
  {
    title: "Alien Dictionary",
    slug: "alien-dictionary",
    description:
      "There is a new alien language that uses the English alphabet, but the order among the letters is unknown. You are given a list of strings `words` from the alien language's dictionary, where the strings in `words` are sorted lexicographically according to the new language's rules. The characters in each string are also sorted according to the new language's rules. Return a string of the unique letters in the alien language's dictionary, sorted in lexicographically increasing order. If there is no solution (i.e., there are inconsistent or contradictory rules), return an empty string.",
    constraints: [
      "1 <= words.length <= 100",
      "1 <= words[i].length <= 100",
      "words[i] consists of only lowercase English letters.",
    ],
    examples: [
      { input: 'words = ["wrt","wrf","er","ett","rftt"]', output: "wertf", explanation: 'From the ordering: w < e < r < t < f.' },
      { input: 'words = ["z","x"]', output: "zx", explanation: 'From the ordering: z > x, so z comes before x.' },
    ],
    difficulty: "HARD",
    topics: ["Graph", "Topological Sort", "DFS"],
    companies: ["Amazon", "Google", "Meta"],
    expectedComplexity: "O(C) time where C is the total length of all words",
    timeLimitMs: 5000,
    starterPython: `def solution(words):\n    # Return the alien dictionary order as a string, or ""\n    pass\n`,
    starterJs: `function solution(words) {\n  // Return the alien dictionary order as a string, or ""\n  \n}\n`,
    testCases: [
      { args: [["wrt", "wrf", "er", "ett", "rftt"]], expected: "wertf" },
      { args: [["z", "x"]], expected: "zx" },
      { args: [["z", "x", "z"]], expected: "" },
    ],
    hiddenTestCases: [
      { args: [["abc", "ab"]], expected: "" },
      { args: [["abc", "ab", "bc"]], expected: "acb" },
    ],
  },
  {
    title: "Regular Expression Matching",
    slug: "regular-expression-matching",
    description:
      "Given an input string `s` and a pattern `p`, implement regular expression matching with support for `'.'` and `'*'` where `'.'` matches any single character and `'*'` matches zero or more of the preceding element. The matching should cover the entire input string (not partial).",
    constraints: [
      "1 <= s.length <= 20",
      "1 <= p.length <= 20",
      "s contains only lowercase English letters.",
      "p contains only lowercase English letters, '.', and '*'.",
      "It is guaranteed for each appearance of the character '*', there will be a previous valid character to match.",
    ],
    examples: [
      { input: 's = "aa", p = "a"', output: "false", explanation: '"a" does not match the entire string "aa".' },
      { input: 's = "aa", p = "a*"', output: "true", explanation: '"*" means zero or more of the preceding element "a".' },
    ],
    difficulty: "HARD",
    topics: ["String", "Dynamic Programming", "Recursion"],
    companies: ["Amazon", "Google", "Meta"],
    expectedComplexity: "O(m*n) time, O(m*n) space",
    timeLimitMs: 5000,
    starterPython: `def solution(s, p):\n    # Return True if s matches the pattern p\n    pass\n`,
    starterJs: `function solution(s, p) {\n  // Return true if s matches the pattern p\n  \n}\n`,
    testCases: [
      { args: ["aa", "a"], expected: false },
      { args: ["aa", "a*"], expected: true },
      { args: ["ab", ".*"], expected: true },
    ],
    hiddenTestCases: [
      { args: ["aab", "c*a*b"], expected: true },
      { args: ["mississippi", "mis*is*p*."], expected: false },
    ],
  },
];

// companies with job roles
const COMPANIES: {
  name: string;
  slug: string;
  industry: string;
  description: string;
  roles: { title: string; slug: string; level: string; minExperience: number; description: string; weights: Record<string, number>; reqs: Req[] }[];
}[] = [
  {
    name: "Microsoft",
    slug: "microsoft",
    industry: "Software & Cloud",
    description: "Global technology company known for Windows, Azure, and AI products.",
    roles: [
      {
        title: "AI Engineer",
        slug: "ai-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Builds AI-powered products and services on Azure AI infrastructure.",
        weights: { RESUME: 12, CODING: 22, INTERVIEW: 20, COMMUNICATION: 10, PROJECTS: 12, GITHUB: 9, LINKEDIN: 5, SKILL_COVERAGE: 10 },
        reqs: [
          { skill: "Python", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Machine Learning", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Deep Learning", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "Large Language Models", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "PyTorch", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Azure", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "SQL", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "System Design", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Prompt Engineering", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "RAG", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Communication", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "Problem Solving", importance: "ESSENTIAL", requiredRating: 5 },
        ],
      },
      {
        title: "Software Engineer",
        slug: "software-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Develops and ships software across Microsoft products.",
        weights: { RESUME: 15, CODING: 25, INTERVIEW: 20, COMMUNICATION: 10, PROJECTS: 10, GITHUB: 10, LINKEDIN: 5, SKILL_COVERAGE: 5 },
        reqs: [
          { skill: "C++", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "C#", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Operating Systems", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Computer Networks", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "System Design", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Azure", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "SQL", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Git", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Object-Oriented Programming", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "Communication", importance: "ESSENTIAL", requiredRating: 4 },
        ],
      },
      {
        title: "Data Engineer",
        slug: "data-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Designs and maintains data pipelines and infrastructure.",
        weights: { RESUME: 15, CODING: 22, INTERVIEW: 20, COMMUNICATION: 10, PROJECTS: 10, GITHUB: 8, LINKEDIN: 5, SKILL_COVERAGE: 10 },
        reqs: [
          { skill: "Python", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "SQL", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "Azure", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "PostgreSQL", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Apache Kafka", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Spark", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Database Design", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "System Design", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Communication", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
    ],
  },
  {
    name: "Google",
    slug: "google",
    industry: "Software & Cloud",
    description: "Technology company focused on search, cloud, and AI research.",
    roles: [
      {
        title: "Software Engineer",
        slug: "software-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Builds products at global scale.",
        weights: { RESUME: 15, CODING: 28, INTERVIEW: 22, COMMUNICATION: 8, PROJECTS: 10, GITHUB: 7, LINKEDIN: 5, SKILL_COVERAGE: 5 },
        reqs: [
          { skill: "C++", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Python", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Java", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "System Design", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Operating Systems", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Computer Networks", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Distributed Systems", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Google Cloud", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Problem Solving", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Communication", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
      {
        title: "Machine Learning Engineer",
        slug: "machine-learning-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Builds and deploys ML models at scale.",
        weights: { RESUME: 12, CODING: 25, INTERVIEW: 20, COMMUNICATION: 10, PROJECTS: 12, GITHUB: 8, LINKEDIN: 5, SKILL_COVERAGE: 8 },
        reqs: [
          { skill: "Python", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Machine Learning", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Deep Learning", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "TensorFlow", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "PyTorch", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "System Design", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "SQL", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Statistics", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Communication", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
    ],
  },
  {
    name: "Amazon",
    slug: "amazon",
    industry: "E-commerce & Cloud",
    description: "Global e-commerce and cloud computing company.",
    roles: [
      {
        title: "Software Development Engineer",
        slug: "sde",
        level: "ENTRY",
        minExperience: 0,
        description: "Designs and builds large-scale distributed systems.",
        weights: { RESUME: 15, CODING: 28, INTERVIEW: 22, COMMUNICATION: 8, PROJECTS: 10, GITHUB: 7, LINKEDIN: 5, SKILL_COVERAGE: 5 },
        reqs: [
          { skill: "Java", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "Python", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "System Design", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "AWS", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Docker", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Microservices", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "SQL", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Database Design", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Leadership", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Communication", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
      {
        title: "Data Engineer",
        slug: "data-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Builds data pipelines for analytics and ML.",
        weights: { RESUME: 15, CODING: 22, INTERVIEW: 20, COMMUNICATION: 10, PROJECTS: 10, GITHUB: 8, LINKEDIN: 5, SKILL_COVERAGE: 10 },
        reqs: [
          { skill: "Python", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "SQL", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "AWS", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Spark", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Apache Kafka", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "PostgreSQL", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "System Design", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
    ],
  },
  {
    name: "Meta",
    slug: "meta",
    industry: "Social Media & AI",
    description: "Social technology company focused on connection and AI.",
    roles: [
      {
        title: "Software Engineer",
        slug: "software-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Builds products used by billions of people.",
        weights: { RESUME: 15, CODING: 28, INTERVIEW: 22, COMMUNICATION: 8, PROJECTS: 10, GITHUB: 7, LINKEDIN: 5, SKILL_COVERAGE: 5 },
        reqs: [
          { skill: "Python", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Java", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "C++", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "System Design", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "React", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "GraphQL", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "SQL", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Communication", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
      {
        title: "AI Research Engineer",
        slug: "ai-research-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Advances AI research and applies it to products.",
        weights: { RESUME: 12, CODING: 24, INTERVIEW: 20, COMMUNICATION: 10, PROJECTS: 14, GITHUB: 8, LINKEDIN: 4, SKILL_COVERAGE: 8 },
        reqs: [
          { skill: "Python", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Machine Learning", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Deep Learning", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "PyTorch", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Large Language Models", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "System Design", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Communication", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
    ],
  },
  {
    name: "Apple",
    slug: "apple",
    industry: "Hardware & Software",
    description: "Consumer technology company.",
    roles: [
      {
        title: "Software Engineer",
        slug: "software-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Develops software for Apple platforms.",
        weights: { RESUME: 15, CODING: 25, INTERVIEW: 20, COMMUNICATION: 10, PROJECTS: 10, GITHUB: 10, LINKEDIN: 5, SKILL_COVERAGE: 5 },
        reqs: [
          { skill: "Swift", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "C++", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Objective-C", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Operating Systems", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "System Design", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "REST APIs", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Communication", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
    ],
  },
  {
    name: "Nvidia",
    slug: "nvidia",
    industry: "Semiconductors & AI",
    description: "Leader in GPUs and accelerated computing for AI.",
    roles: [
      {
        title: "AI Software Engineer",
        slug: "ai-software-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Builds software and tooling for AI acceleration.",
        weights: { RESUME: 12, CODING: 24, INTERVIEW: 20, COMMUNICATION: 10, PROJECTS: 12, GITHUB: 10, LINKEDIN: 4, SKILL_COVERAGE: 8 },
        reqs: [
          { skill: "C++", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Python", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "CUDA", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Deep Learning", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "Machine Learning", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "PyTorch", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Operating Systems", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Communication", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
    ],
  },
  {
    name: "Uber",
    slug: "uber",
    industry: "Transportation & Logistics",
    description: "Ridesharing and delivery platform.",
    roles: [
      {
        title: "Software Engineer",
        slug: "software-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Builds real-time marketplace systems.",
        weights: { RESUME: 15, CODING: 26, INTERVIEW: 21, COMMUNICATION: 8, PROJECTS: 10, GITHUB: 8, LINKEDIN: 5, SKILL_COVERAGE: 7 },
        reqs: [
          { skill: "Python", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Go", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "JavaScript", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "System Design", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Docker", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Microservices", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Redis", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Communication", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
    ],
  },
  {
    name: "Adobe",
    slug: "adobe",
    industry: "Software & Digital Media",
    description: "Creative software company.",
    roles: [
      {
        title: "Software Engineer",
        slug: "software-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Develops creative cloud products.",
        weights: { RESUME: 15, CODING: 25, INTERVIEW: 20, COMMUNICATION: 10, PROJECTS: 10, GITHUB: 10, LINKEDIN: 5, SKILL_COVERAGE: 5 },
        reqs: [
          { skill: "Java", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "JavaScript", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "C++", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "System Design", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "AWS", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "REST APIs", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Communication", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
    ],
  },
  {
    name: "JPMorgan Chase",
    slug: "jpmorgan-chase",
    industry: "Financial Services",
    description: "Global financial services firm.",
    roles: [
      {
        title: "Software Engineer",
        slug: "software-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Builds banking and payments technology.",
        weights: { RESUME: 15, CODING: 25, INTERVIEW: 20, COMMUNICATION: 10, PROJECTS: 10, GITHUB: 8, LINKEDIN: 6, SKILL_COVERAGE: 6 },
        reqs: [
          { skill: "Java", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "SQL", importance: "ESSENTIAL", requiredRating: 4 },
          { skill: "Spring Boot", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "System Design", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "REST APIs", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Database Design", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Communication", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Teamwork", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
    ],
  },
  {
    name: "Netflix",
    slug: "netflix",
    industry: "Media & Entertainment",
    description: "Streaming entertainment platform.",
    roles: [
      {
        title: "Software Engineer",
        slug: "software-engineer",
        level: "ENTRY",
        minExperience: 0,
        description: "Builds streaming platform services.",
        weights: { RESUME: 15, CODING: 26, INTERVIEW: 21, COMMUNICATION: 8, PROJECTS: 10, GITHUB: 8, LINKEDIN: 5, SKILL_COVERAGE: 7 },
        reqs: [
          { skill: "Java", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Python", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "Data Structures", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Algorithms", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "System Design", importance: "ESSENTIAL", requiredRating: 5 },
          { skill: "Microservices", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "AWS", importance: "IMPORTANT", requiredRating: 4 },
          { skill: "SQL", importance: "IMPORTANT", requiredRating: 3 },
          { skill: "Communication", importance: "IMPORTANT", requiredRating: 4 },
        ],
      },
    ],
  },
];

// Skills referenced in requirements but not in the SKILLS list above
const EXTRA_SKILLS: { name: string; category: SkillCategory }[] = [
  { name: "Apache Kafka", category: "DEVOPS" },
  { name: "Spark", category: "AI_ML" },
  { name: "Distributed Systems", category: "TOOL" },
  { name: "Statistics", category: "AI_ML" },
  { name: "CUDA", category: "TOOL" },
  { name: "Objective-C", category: "PROGRAMMING_LANGUAGE" },
];

async function main() {
  // Never upsert admin/demo accounts with known credentials into a real
  // production database by accident. Opt in explicitly if truly required.
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "true") {
    console.error("Refusing to seed in production. Set SEED_ALLOW_PRODUCTION=true to override.");
    process.exit(1);
  }

  console.log("Seeding database...");

  // --- Skills ---
  const skillMap = new Map<string, string>();
  const allSkills = [...SKILLS, ...EXTRA_SKILLS];
  for (const s of allSkills) {
    const skill = await prisma.skill.upsert({
      where: { name: s.name },
      update: { category: s.category, description: (s as { description?: string }).description },
      create: { name: s.name, category: s.category, description: (s as { description?: string }).description },
    });
    skillMap.set(s.name, skill.id);
  }

  // --- Companies, roles, requirements ---
  const companyIds: Record<string, string> = {};
  for (const c of COMPANIES) {
    const company = await prisma.company.upsert({
      where: { slug: c.slug },
      update: { name: c.name, industry: c.industry, description: c.description },
      create: { name: c.name, slug: c.slug, industry: c.industry, description: c.description },
    });
    companyIds[c.name] = company.id;

    for (const r of c.roles) {
      const role = await prisma.jobRole.upsert({
        where: { companyId_slug: { companyId: company.id, slug: r.slug } },
        update: { title: r.title, level: r.level, minExperience: r.minExperience, description: r.description, weights: r.weights },
        create: {
          companyId: company.id,
          title: r.title,
          slug: r.slug,
          level: r.level,
          minExperience: r.minExperience,
          description: r.description,
          weights: r.weights,
        },
      });

      for (const req of r.reqs) {
        const skillId = skillMap.get(req.skill);
        if (!skillId) {
          console.warn(`Missing skill definition: ${req.skill} (role ${r.title})`);
          continue;
        }
        await prisma.companySkillRequirement.upsert({
          where: { jobRoleId_skillId: { jobRoleId: role.id, skillId } },
          update: {
            companyId: company.id,
            importance: req.importance as Importance,
            requiredRating: req.requiredRating,
            weight: req.weight,
          },
          create: {
            companyId: company.id,
            jobRoleId: role.id,
            skillId,
            importance: req.importance as Importance,
            requiredRating: req.requiredRating,
            weight: req.weight,
          },
        });
      }
    }
  }

  // --- Coding problems ---
  const problemJson = (value: unknown) => value as unknown as Prisma.InputJsonValue;
  for (const p of PROBLEMS) {
    await prisma.codingProblem.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        description: p.description,
        constraints: problemJson(p.constraints),
        examples: problemJson(p.examples),
        difficulty: p.difficulty as Difficulty,
        topics: problemJson(p.topics),
        companies: problemJson(p.companies),
        starterCode: problemJson({ python: p.starterPython, javascript: p.starterJs }),
        testCases: problemJson(p.testCases),
        hiddenTestCases: problemJson(p.hiddenTestCases),
        timeLimitMs: p.timeLimitMs,
        expectedComplexity: p.expectedComplexity,
      },
      create: {
        title: p.title,
        slug: p.slug,
        description: p.description,
        constraints: problemJson(p.constraints),
        examples: problemJson(p.examples),
        difficulty: p.difficulty as Difficulty,
        topics: problemJson(p.topics),
        companies: problemJson(p.companies),
        starterCode: problemJson({ python: p.starterPython, javascript: p.starterJs }),
        testCases: problemJson(p.testCases),
        hiddenTestCases: problemJson(p.hiddenTestCases),
        timeLimitMs: p.timeLimitMs,
        expectedComplexity: p.expectedComplexity,
      },
    });
  }

  // --- Users ---
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@careerpilot.dev" },
    update: {},
    create: {
      name: "CareerPilot Admin",
      email: "admin@careerpilot.dev",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const demoPassword = await bcrypt.hash("student123", 10);
  const demo = await prisma.user.upsert({
    where: { email: "student@careerpilot.dev" },
    update: {},
    create: {
      name: "Demo Student",
      email: "student@careerpilot.dev",
      passwordHash: demoPassword,
      role: "STUDENT",
    },
  });

  // --- Demo student profile (populated so every screen has real data) ---
  const demoCompany = await prisma.company.findUnique({ where: { slug: "microsoft" } });
  // Scope the role lookup to the demo company so the target is deterministic
  // even if other companies share the "software-engineer" slug.
  const demoRole = demoCompany
    ? await prisma.jobRole.findFirst({ where: { companyId: demoCompany.id, slug: "software-engineer" } })
    : null;
  if (demoCompany && demoRole) {
    const demoProfile = await prisma.studentProfile.upsert({
      where: { userId: demo.id },
      update: {
        targetCompanyId: demoCompany.id,
        targetJobRoleId: demoRole.id,
        onboardingCompletedAt: new Date(),
      },
      create: {
        userId: demo.id,
        location: "Mumbai, India",
        bio: "Final-year computer science student preparing for a Software Engineer role at Microsoft.",
        experienceLevel: "INTERMEDIATE",
        studyHoursPerWeek: 15,
        targetCompanyId: demoCompany.id,
        targetJobRoleId: demoRole.id,
        onboardingCompletedAt: new Date(),
      },
    });

    await prisma.education.upsert({
      where: { profileId: demoProfile.id },
      update: {},
      create: {
        profileId: demoProfile.id,
        college: "National Institute of Technology",
        degree: "B.Tech Computer Science",
        branch: "Computer Science",
        graduationYear: 2027,
        cgpa: 8.4,
      },
    });

    const demoSkillRatings: { name: string; rating: number }[] = [
      { name: "Python", rating: 4 },
      { name: "C++", rating: 3 },
      { name: "JavaScript", rating: 4 },
      { name: "Data Structures", rating: 4 },
      { name: "Algorithms", rating: 3 },
      { name: "SQL", rating: 3 },
      { name: "Git", rating: 4 },
      { name: "Object-Oriented Programming", rating: 4 },
      { name: "Operating Systems", rating: 3 },
      { name: "Communication", rating: 3 },
      { name: "Problem Solving", rating: 4 },
      { name: "System Design", rating: 2 },
    ];
    for (const { name, rating } of demoSkillRatings) {
      const skill = await prisma.skill.findUnique({ where: { name } });
      if (!skill) continue;
      await prisma.studentSkill.upsert({
        where: { profileId_skillId: { profileId: demoProfile.id, skillId: skill.id } },
        update: { rating },
        create: {
          profileId: demoProfile.id,
          skillId: skill.id,
          rating,
          proficiency: rating >= 5 ? "EXPERT" : rating >= 4 ? "ADVANCED" : rating >= 3 ? "INTERMEDIATE" : "BEGINNER",
        },
      });
    }
  }

  console.log(`Seeded. Admin: ${admin.email} / admin123 | Demo: ${demo.email} / student123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
