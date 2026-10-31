export type PracticeDifficulty = "Easy" | "Medium" | "Hard";

export interface PracticeExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface PracticeProblem {
  id: string;
  title: string;
  difficulty: PracticeDifficulty;
  tags: string[];
  description: string;
  example: PracticeExample;
  constraints?: string;
  starterCode?: string;
}

export const PRACTICE_PROBLEMS: PracticeProblem[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    description:
      "Given an array of integers nums and an integer target, return indices of the " +
      "two numbers such that they add up to target.\n\nYou may assume that each input " +
      "would have exactly one solution, and you may not use the same element twice.\n\n" +
      "You can return the answer in any order.",
    example: {
      input: "nums = [2,7,11,15], target = 9",
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 2 + 7 == 9, we return [0, 1].",
    },
    constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
    starterCode: "function twoSum(nums, target) {\n  // Write your code here\n  return [];\n}",
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    tags: ["Stack", "String"],
    description:
      "Given a string s containing just the characters '(', ')', '{', '}', '[' and " +
      "]', determine if the input string is valid.\n\nAn input string is valid if:\n1. " +
      "Open brackets must be closed by the same type of brackets.\n2. Open brackets " +
      "must be closed in the correct order.\n3. Every close bracket has its matching " +
      "open bracket.",
    example: {
      input: "s = \"()[]{}\"",
      output: "true",
    },
    constraints: "1 <= s.length <= 10^4; s consists of only '()[]{}'",
    starterCode: "function isValid(s) {\n  // Write your code here\n  return false;\n}",
  },
  {
    id: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    tags: ["Array", "Dynamic Programming"],
    description:
      "You want to maximize your profit by choosing a single day to buy one stock and " +
      "choosing a different day in the future to sell that stock.\n\nReturn the maximum " +
      "profit you can achieve from this transaction. If you cannot achieve any profit, " +
      "return 0.",
    example: {
      input: "prices = [7,1,5,3,6,4]",
      output: "5",
      explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 5.",
    },
    constraints: "1 <= prices.length <= 10^5; 0 <= prices[i] <= 10^4",
    starterCode: "function maxProfit(prices) {\n  // Write your code here\n  return 0;\n}",
  },
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Medium",
    tags: ["Array", "Sorting"],
    description:
      "Given an array of intervals where intervals[i] = [start_i, end_i], merge all " +
      "overlapping intervals and return an array of the non-overlapping intervals that " +
      "cover all the intervals in the input.",
    example: {
      input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
      output: "[[1,6],[8,10],[15,18]]",
      explanation: "Intervals [1,3] and [2,6] overlap and are merged into [1,6].",
    },
    constraints:
      "1 <= intervals.length <= 10^4\nintervals[i].length == 2\n0 <= start_i <= end_i <= 10^4",
    starterCode: "function merge(intervals) {\n  // Write your code here\n  return [];\n}",
  },
  {
    id: "group-anagrams",
    title: "Group Anagrams",
    difficulty: "Medium",
    tags: ["Hash Table", "Sorting"],
    description:
      "Given an array of strings strs, group the anagrams together. You can return " +
      "the answer in any order.\n\nAn anagram is a word formed by rearranging the " +
      "letters of a different word, using all the original letters exactly once.",
    example: {
      input: "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]",
      output: "[['bat'],['eat','tea','ate','tan','nat']]",
      explanation:
        "The anagrams 'eat', 'tea', 'ate' are grouped together, as are 'tan' and 'nat'.",
    },
    constraints:
      "1 <= strs.length <= 10^4\n0 <= strs[i].length <= 100\nstrs[i] consists of lowercase English letters.",
    starterCode: "function groupAnagrams(strs) {\n  // Write your code here\n  return [];\n}",
  },
  {
    id: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    tags: ["Hash Table", "Sliding Window"],
    description:
      "Given a string s, find the length of the longest substring without repeating " +
      "characters.",
    example: {
      input: "s = \"abcabcbb\"",
      output: "3",
      explanation: "The answer is 'abc', which has a length of 3.",
    },
    constraints: "0 <= s.length <= 5 * 10^4; s consists of English letters, digits, spaces and symbols.",
    starterCode: "function lengthOfLongestSubstring(s) {\n  // Write your code here\n  return 0;\n}",
  },
  {
    id: "median-of-two-sorted-arrays",
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    tags: ["Array", "Binary Search"],
    description:
      "Given two sorted arrays nums1 and nums2 of size m and n respectively, return " +
      "the median of the two sorted arrays.\n\nThe overall run time complexity should " +
      "be O(log (m+n)).",
    example: {
      input: "nums1 = [1,3], nums2 = [2]",
      output: "2.0",
      explanation: "The median of [1,2,3] is 2.0.",
    },
    constraints:
      "nums1 and nums2 are sorted in ascending order.\n0 <= nums1.length, nums2.length <= 1000",
    starterCode: "function findMedianSortedArrays(nums1, nums2) {\n  // Write your code here\n  return 0;\n}",
  },
  {
    id: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "Hard",
    tags: ["Array", "Two Pointers"],
    description:
      "Given n non-negative integers representing an elevation map where the width of " +
      "each bar is 1, compute how much water it can trap after raining.",
    example: {
      input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
      output: "6",
      explanation: "The elevation map traps 6 units of rainwater between the bars.",
    },
    constraints:
      "1 <= height.length <= 2 * 10^4\n0 <= height[i] <= 10^4",
    starterCode: "function trap(height) {\n  // Write your code here\n  return 0;\n}",
  },
];

export const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"] as const;
