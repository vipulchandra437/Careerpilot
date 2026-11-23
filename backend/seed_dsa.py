"""Seed a curated bank of classic DSA practice problems.

Idempotent: skips problems whose title already exists. Run with:
    python -m backend.seed_dsa

Problem statements are written in our own words — they are common CS exercises,
not copies of any commercial question bank. All problems are Python 3, stdin ->
stdout, with fixed deterministic expected outputs for the sandbox grader.
"""

import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import inspect, select, text

from backend.database import async_session, engine, Base
from backend.models.challenge import Challenge

DEFAULT_STARTER = """import sys


def solve():
    data = sys.stdin.read().split()
    # TODO: read the input and print the answer


if __name__ == "__main__":
    solve()
"""

LIST_STARTER = """import sys


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def solve():
    data = sys.stdin.read().split()
    # TODO: build the list, solve, then print values separated by spaces


if __name__ == "__main__":
    solve()
"""

TREE_STARTER = """import sys
from collections import deque


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build_tree(tokens):
    # tokens[0] is the count, the rest are level-order values ('N' = null)
    if not tokens or tokens[0] == 'N':
        return None
    root = TreeNode(int(tokens[0]))
    q = deque([root])
    i = 1
    while q and i < len(tokens):
        node = q.popleft()
        if i < len(tokens) and tokens[i] != 'N':
            node.left = TreeNode(int(tokens[i]))
            q.append(node.left)
        i += 1
        if i < len(tokens) and tokens[i] != 'N':
            node.right = TreeNode(int(tokens[i]))
            q.append(node.right)
        i += 1
    return root


def solve():
    tokens = sys.stdin.read().split()
    # TODO: use build_tree(tokens[1:]), solve, then print the answer


if __name__ == "__main__":
    solve()
"""


def _p(title, topic, difficulty, prompt, tests, complexity, starter=None, signature="def solve():"):
    return {
        "title": title,
        "skill": topic,
        "difficulty": difficulty,
        "prompt": prompt.strip(),
        "function_signature": signature,
        "starter_code": starter or DEFAULT_STARTER,
        "test_cases": [{"name": n, "stdin": s, "expected": e} for n, s, e in tests],
        "expected_time_complexity": complexity,
    }


PROBLEMS = [
    # ---------------------------- Arrays -----------------------------------
    _p("Largest Element", "arrays", "beginner", """
Read an integer n, followed by n integers on the same or following lines.
Print the largest of those integers.

Input: first line n; second line contains n space-separated integers.
Output: one integer, the maximum value.

Example
Input:
5
1 9 3 7 2
Output:
9
""", [("example", "5\n1 9 3 7 2", "9"), ("negatives", "4\n-5 -2 -9 -1", "-1"), ("single", "1\n42", "42")], "O(n) time, O(1) space"),

    _p("Second Largest Distinct", "arrays", "beginner", """
Read n and then n integers. Print the second largest DISTINCT value.
If no such value exists, print -1.

Example
Input:
6
4 1 7 7 3 5
Output:
5
""", [("example", "6\n4 1 7 7 3 5", "5"), ("none", "3\n2 2 2", "-1"), ("negatives", "5\n-1 -3 -2 -5 -4", "-2")], "O(n) time, O(1) space"),

    _p("Reverse the Array", "arrays", "beginner", """
Read n and then n integers. Print the same integers in reverse order,
separated by single spaces.

Example
Input:
5
1 2 3 4 5
Output:
5 4 3 2 1
""", [("example", "5\n1 2 3 4 5", "5 4 3 2 1"), ("single", "1\n9", "9"), ("negatives", "3\n-1 0 5", "5 0 -1")], "O(n) time, O(n) space"),

    _p("Push Zeroes to the End", "arrays", "beginner", """
Read n and then n integers. Print them with all zeroes moved to the end.
The relative order of the non-zero values must stay the same.

Example
Input:
6
0 1 0 3 12 0
Output:
1 3 12 0 0 0
""", [("example", "6\n0 1 0 3 12 0", "1 3 12 0 0 0"), ("no zeroes", "3\n1 2 3", "1 2 3"), ("all zeroes", "3\n0 0 0", "0 0 0")], "O(n) time, O(1) space"),

    _p("Maximum Subarray Sum", "arrays", "intermediate", """
Read n and then n integers. Print the largest sum of any contiguous
non-empty subarray.

Example
Input:
9
-2 1 -3 4 -1 2 1 -5 4
Output:
6
""", [("example", "9\n-2 1 -3 4 -1 2 1 -5 4", "6"), ("all negative", "4\n-5 -2 -9 -1", "-1"), ("single", "1\n7", "7")], "O(n) time, O(1) space"),

    _p("Rotate Array to the Right", "arrays", "intermediate", """
Read n, then n integers, then an integer k. Print the array after rotating
its elements k positions to the right. k may be larger than n.

Example
Input:
7
1 2 3 4 5 6 7
3
Output:
5 6 7 1 2 3 4
""", [("example", "7\n1 2 3 4 5 6 7\n3", "5 6 7 1 2 3 4"), ("k larger", "5\n1 2 3 4 5\n7", "4 5 1 2 3"), ("no rotation", "5\n1 2 3 4 5\n0", "1 2 3 4 5")], "O(n) time, O(n) space"),

    # ---------------------------- Strings ----------------------------------
    _p("Reverse the Order of Words", "strings", "beginner", """
Read one line of text. Print the words in reverse order, separated by
single spaces. Ignore leading, trailing and repeated spaces.

Example
Input:
the sky is blue
Output:
blue is sky the
""", [("example", "the sky is blue", "blue is sky the"), ("extra spaces", "  hello   world  ", "world hello"), ("one word", "alone", "alone")], "O(n) time, O(n) space"),

    _p("First Non-Repeating Character", "strings", "beginner", """
Read a lowercase string. Print the index of its first character that appears
exactly once, or -1 if every character repeats.

Example
Input:
leetcode
Output:
0
""", [("example", "leetcode", "0"), ("none", "aabb", "-1"), ("middle", "abcab", "2")], "O(n) time, O(1) space"),

    _p("Palindrome Check", "strings", "beginner", """
Read a line. Print true if it is a palindrome considering only letters and
digits and ignoring case, otherwise print false. Print an empty string as true.

Example
Input:
A man, a plan, a canal: Panama
Output:
true
""", [("example", "A man, a plan, a canal: Panama", "true"), ("false", "race a car", "false"), ("empty", "   ", "true")], "O(n) time, O(1) space"),

    _p("Count Vowels", "strings", "beginner", """
Read a line and print how many of its characters are vowels (a, e, i, o, u),
ignoring case.

Example
Input:
Hello World
Output:
3
""", [("example", "Hello World", "3"), ("none", "bcdfg", "0"), ("uppercase", "AEIOU", "5")], "O(n) time, O(1) space"),

    _p("Longest Unique Substring", "strings", "intermediate", """
Read a string. Print the length of the longest substring that contains no
repeated character.

Example
Input:
abcabcbb
Output:
3
""", [("example", "abcabcbb", "3"), ("all same", "bbbbb", "1"), ("mixed", "pwwkew", "3")], "O(n) time, O(k) space"),

    _p("Anagram Check", "strings", "beginner", """
Read two lines of lowercase letters. Print true if they are anagrams of each
other (same letters with the same counts), otherwise print false.

Example
Input:
listen
silent
Output:
true
""", [("example", "listen\nsilent", "true"), ("false", "rat\ncar", "false"), ("different length", "apple\napplepie", "false")], "O(n) time, O(1) space"),

    # ---------------------------- Hashing ----------------------------------
    _p("Two Sum", "hashing", "beginner", """
Read n, then n integers, then a target t. Print the two 0-based indices i and j
(i < j) whose values add up to t, separated by a space. Each test has exactly
one valid pair.

Example
Input:
4
2 7 11 15
9
Output:
0 1
""", [("example", "4\n2 7 11 15\n9", "0 1"), ("middle", "4\n3 2 4 6\n6", "1 2"), ("ends", "3\n5 1 9\n14", "0 2")], "O(n) time, O(n) space"),

    _p("Frequency Table", "hashing", "beginner", """
Read n and then n integers. For each distinct value in ascending order, print
one line containing the value and its frequency, separated by a space.

Example
Input:
6
3 1 2 3 2 3
Output:
1 1
2 2
3 3
""", [("example", "6\n3 1 2 3 2 3", "1 1\n2 2\n3 3"), ("negatives", "4\n-1 -1 0 0", "-1 2\n0 2"), ("single", "1\n7", "7 1")], "O(n log n) time, O(n) space"),

    # ------------------------ Stacks and queues ----------------------------
    _p("Balanced Brackets", "stacks", "beginner", """
Read a string made only of the characters ( ) [ ] { }. Print true if every
opening bracket is closed by the matching bracket in the correct order,
otherwise print false.

Example
Input:
()[]{}
Output:
true
""", [("example", "()[]{}", "true"), ("wrong order", "(]", "false"), ("nested", "([{}])", "true"), ("unclosed", "(((", "false")], "O(n) time, O(n) space"),

    _p("Evaluate Postfix Expression", "stacks", "intermediate", """
Read a postfix expression whose tokens are separated by spaces. Tokens are
integers or one of + - * /. Print the integer result. Division truncates toward
zero.

Example
Input:
2 3 +
Output:
5
""", [("example", "2 3 +", "5"), ("longer", "5 1 2 + 4 * + 3 -", "14"), ("single", "7", "7")], "O(n) time, O(n) space"),

    _p("First n Binary Numbers", "queues", "beginner", """
Read an integer n. Print the first n positive binary numbers as decimal-style
binary digits, separated by single spaces.

Example
Input:
5
Output:
1 10 11 100 101
""", [("example", "5", "1 10 11 100 101"), ("one", "1", "1"), ("ten", "4", "1 10 11 100")], "O(n) time, O(n) space"),

    # ---------------------- Sorting and searching --------------------------
    _p("Merge Two Sorted Arrays", "sorting", "beginner", """
Read n, then n sorted integers, then m, then m sorted integers. Print all the
values in one sorted non-decreasing sequence, separated by spaces.

Example
Input:
3
1 3 5
3
2 4 6
Output:
1 2 3 4 5 6
""", [("example", "3\n1 3 5\n3\n2 4 6", "1 2 3 4 5 6"), ("empty first", "0\n\n2\n1 2", "1 2"), ("duplicates", "2\n1 1\n2\n1 2", "1 1 1 2")], "O(n + m) time, O(n + m) space"),

    _p("Binary Search", "searching", "beginner", """
Read n, then n integers in ascending order, then a target. Print the index of
the target in the array, or -1 if it is not present.

Example
Input:
6
1 3 5 7 9 11
7
Output:
3
""", [("example", "6\n1 3 5 7 9 11\n7", "3"), ("missing", "5\n1 2 3 4 5\n6", "-1"), ("first", "4\n1 2 3 4\n1", "0")], "O(log n) time, O(1) space"),

    _p("Search in a Rotated Array", "searching", "intermediate", """
Read n, then n distinct integers that were sorted and then rotated, then a
target. Print the index of the target, or -1 if it is absent.

Example
Input:
5
4 5 6 7 0
0
Output:
4
""", [("example", "5\n4 5 6 7 0\n0", "4"), ("missing", "5\n4 5 6 7 0\n3", "-1"), ("not rotated", "4\n1 2 3 4\n3", "2")], "O(log n) time, O(1) space"),

    _p("Kth Largest Value", "sorting", "intermediate", """
Read n, then n integers, then k. Print the kth largest value. Repeated values
count separately.

Example
Input:
6
3 2 1 5 6 4
2
Output:
5
""", [("example", "6\n3 2 1 5 6 4\n2", "5"), ("duplicates", "5\n3 2 3 1 2\n2", "3"), ("first", "3\n7 2 9\n1", "9")], "O(n log n) time, O(n) space"),

    # ------------------------- Linked lists --------------------------------
    _p("Reverse a Linked List", "linked-list", "beginner", """
Read n and then n integers. Treat them as the values of a singly linked list
in the given order. Print the values of the reversed list, separated by spaces.

Example
Input:
4
1 2 3 4
Output:
4 3 2 1
""", [("example", "4\n1 2 3 4", "4 3 2 1"), ("single", "1\n5", "5"), ("two", "2\n1 2", "2 1")], "O(n) time, O(1) space", starter=LIST_STARTER),

    _p("Merge Two Sorted Lists", "linked-list", "beginner", """
Read n, then n sorted integers, then m, then m sorted integers. Treat each
group as a sorted singly linked list. Print the values of the merged sorted
list, separated by spaces.

Example
Input:
3
1 3 5
3
2 4 6
Output:
1 2 3 4 5 6
""", [("example", "3\n1 3 5\n3\n2 4 6", "1 2 3 4 5 6"), ("uneven", "2\n1 5\n3\n2 3 4", "1 2 3 4 5"), ("empty second", "2\n1 3\n0\n", "1 3")], "O(n + m) time, O(1) space", starter=LIST_STARTER),

    # ----------------------------- Trees -----------------------------------
    _p("Height of a Binary Tree", "trees", "beginner", """
Read n, then n level-order tokens describing a binary tree. A token is either
an integer or N for a missing node. Print the number of levels in the tree.

Example
Input:
7
3 9 20 N N 15 7
Output:
3
""", [("example", "7\n3 9 20 N N 15 7", "3"), ("single", "1\n5", "1"), ("left chain", "3\n1 2 N", "2")], "O(n) time, O(n) space", starter=TREE_STARTER),

    _p("Inorder Traversal", "trees", "beginner", """
Read n, then n level-order tokens describing a binary tree (N means missing).
Print the inorder traversal values separated by spaces.

Example
Input:
5
1 2 3 N N 4 5
Output:
2 1 4 3 5
""", [("example", "5\n1 2 3 N N 4 5", "2 1 4 3 5"), ("single", "1\n8", "8"), ("left chain", "3\n1 2 N", "2 1")], "O(n) time, O(n) space", starter=TREE_STARTER),

    # --------------------- Dynamic programming -----------------------------
    _p("Nth Fibonacci Number", "dynamic-programming", "beginner", """
Read an integer n >= 0. Print the nth Fibonacci number where F(0)=0 and F(1)=1.

Example
Input:
5
Output:
5
""", [("example", "5", "5"), ("ten", "10", "55"), ("zero", "0", "0")], "O(n) time, O(1) space"),

    _p("Climbing Stairs", "dynamic-programming", "beginner", """
There are n steps and you can climb either one or two steps at a time. Read n
and print the number of distinct ways to reach the top.

Example
Input:
3
Output:
3
""", [("example", "3", "3"), ("four", "4", "5"), ("one", "1", "1")], "O(n) time, O(1) space"),

    _p("House Robber", "dynamic-programming", "intermediate", """
Read n and then n house values in a row. A robber cannot take two neighbouring
houses. Print the maximum total value that can be taken.

Example
Input:
4
1 2 3 1
Output:
4
""", [("example", "4\n1 2 3 1", "4"), ("five", "5\n2 7 9 3 1", "12"), ("single", "1\n5", "5")], "O(n) time, O(1) space"),

    _p("Coin Change", "dynamic-programming", "intermediate", """
Read k, then k coin denominations, then a target amount. Print the fewest coins
needed to make exactly that amount, or -1 if it cannot be made. Each coin may
be used any number of times.

Example
Input:
3
1 2 5
11
Output:
3
""", [("example", "3\n1 2 5\n11", "3"), ("impossible", "2\n2 5\n3", "-1"), ("zero", "1\n1\n0", "0")], "O(k * amount) time, O(amount) space"),

    _p("Longest Increasing Subsequence", "dynamic-programming", "intermediate", """
Read n and then n integers. Print the length of the longest strictly increasing
subsequence (the elements need not be contiguous).

Example
Input:
7
10 9 2 5 3 7 101
Output:
4
""", [("example", "7\n10 9 2 5 3 7 101", "4"), ("sorted", "4\n1 2 3 4", "4"), ("same", "3\n5 5 5", "1")], "O(n^2) time, O(n) space"),

    # ----------------------- Graphs and matrices ---------------------------
    _p("Count Islands", "graphs", "intermediate", """
Read the number of rows r and columns c, then r strings of length c containing
only 0 (water) and 1 (land). Two land cells are connected horizontally or
vertically. Print the number of islands.

Example
Input:
4 5
11000
11000
00100
00011
Output:
2
""", [("example", "4 5\n11000\n11000\n00100\n00011", "2"), ("none", "2 2\n00\n00", "0"), ("one", "1 1\n1", "1")], "O(r * c) time, O(r * c) space"),

    _p("Spiral Order Traversal", "matrices", "intermediate", """
Read rows and cols, then the matrix values row by row. Print all values in
clockwise spiral order starting from the top-left corner, separated by spaces.

Example
Input:
3 3
1 2 3
4 5 6
7 8 9
Output:
1 2 3 6 9 8 7 4 5
""", [("example", "3 3\n1 2 3\n4 5 6\n7 8 9", "1 2 3 6 9 8 7 4 5"), ("two by two", "2 2\n1 2\n3 4", "1 2 4 3"), ("one row", "1 4\n1 2 3 4", "1 2 3 4")], "O(rows * cols) time, O(rows * cols) space"),

    # ----------------------- Math and bit tricks ---------------------------
    _p("Greatest Common Divisor", "math", "beginner", """
Read two positive integers and print their greatest common divisor.

Example
Input:
12 18
Output:
6
""", [("example", "12 18", "6"), ("coprime", "7 13", "1"), ("same", "9 9", "9")], "O(log min(a, b)) time, O(1) space"),

    _p("Prime Number Check", "math", "beginner", """
Read an integer n. Print true if n is prime, otherwise print false.

Example
Input:
17
Output:
true
""", [("example", "17", "true"), ("composite", "18", "false"), ("one", "1", "false"), ("two", "2", "true")], "O(sqrt(n)) time, O(1) space"),

    _p("Count Set Bits", "bit-manipulation", "beginner", """
Read a non-negative integer. Print the number of 1s in its binary form.

Example
Input:
11
Output:
3
""", [("example", "11", "3"), ("zero", "0", "0"), ("all ones", "255", "8")], "O(log n) time, O(1) space"),
]


async def ensure_dsa_challenges() -> int:
    """Make the built-in bank available on whichever database the app uses.

    Idempotent and safe to call at startup: adds the language column if an old
    schema lacks it, then inserts only titles that are not already present.
    """
    async with engine.begin() as conn:
        cols = await conn.run_sync(
            lambda c: [col["name"] for col in inspect(c).get_columns("challenges")]
        )
        if "language" not in cols:
            await conn.execute(text(
                "ALTER TABLE challenges ADD COLUMN language VARCHAR(32) NOT NULL DEFAULT 'python'"
            ))

    async with async_session() as db:
        existing = set((await db.execute(select(Challenge.title))).scalars().all())
        added = 0
        for spec in PROBLEMS:
            if spec["title"] in existing:
                continue
            db.add(Challenge(
                id=str(uuid.uuid4()),
                target_role_id="general",
                skill=spec["skill"],
                difficulty=spec["difficulty"],
                title=spec["title"],
                prompt=spec["prompt"],
                function_signature=spec["function_signature"],
                starter_code=spec["starter_code"],
                language="python",
                test_cases=spec["test_cases"],
                expected_time_complexity=spec["expected_time_complexity"],
                created_at=datetime.now(timezone.utc),
            ))
            added += 1
        await db.commit()
        return added


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    added = await ensure_dsa_challenges()
    print(f"DSA seed: {added} added, {len(PROBLEMS) - added} already present")


if __name__ == "__main__":
    asyncio.run(main())
