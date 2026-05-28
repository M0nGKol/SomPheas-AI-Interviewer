"""Seed the database with classic coding interview problems."""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.core.config import settings
from src.models.problem import Problem

PROBLEMS = [
    # ── EASY ────────────────────────────────────────────────────────────────
    {
        "title": "Two Sum",
        "difficulty": "EASY",
        "language": "python",
        "description": """\
Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example 1:**
- Input: nums = [2, 7, 11, 15], target = 9
- Output: [0, 1]
- Explanation: nums[0] + nums[1] = 2 + 7 = 9

**Example 2:**
- Input: nums = [3, 2, 4], target = 6
- Output: [1, 2]

**Constraints:**
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- Only one valid answer exists.

**Follow-up:** Can you solve it in O(n) time complexity?""",
        "starter_code": """\
def two_sum(nums: list[int], target: int) -> list[int]:
    # Your solution here
    pass


# Test your solution
if __name__ == "__main__":
    print(two_sum([2, 7, 11, 15], 9))   # Expected: [0, 1]
    print(two_sum([3, 2, 4], 6))         # Expected: [1, 2]
    print(two_sum([3, 3], 6))            # Expected: [0, 1]
""",
        "expected_solution": """\
def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
""",
        "test_cases": [
            {"input": {"nums": [2, 7, 11, 15], "target": 9}, "expected": [0, 1]},
            {"input": {"nums": [3, 2, 4], "target": 6}, "expected": [1, 2]},
            {"input": {"nums": [3, 3], "target": 6}, "expected": [0, 1]},
        ],
    },
    {
        "title": "Reverse a String",
        "difficulty": "EASY",
        "language": "python",
        "description": """\
Write a function that reverses a string. The input string is given as an array of characters `s`.

You must do this by modifying the input array in-place with O(1) extra memory.

**Example 1:**
- Input: s = ["h","e","l","l","o"]
- Output: ["o","l","l","e","h"]

**Example 2:**
- Input: s = ["H","a","n","n","a","h"]
- Output: ["h","a","n","n","a","H"]

**Constraints:**
- 1 <= s.length <= 10^5
- s[i] is a printable ASCII character.""",
        "starter_code": """\
def reverse_string(s: list[str]) -> None:
    # Modify s in-place, return nothing
    pass


if __name__ == "__main__":
    s = ["h","e","l","l","o"]
    reverse_string(s)
    print(s)  # Expected: ["o","l","l","e","h"]
""",
        "expected_solution": """\
def reverse_string(s: list[str]) -> None:
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1
""",
        "test_cases": [
            {"input": {"s": ["h","e","l","l","o"]}, "expected": ["o","l","l","e","h"]},
            {"input": {"s": ["H","a","n","n","a","h"]}, "expected": ["h","a","n","n","a","H"]},
        ],
    },
    {
        "title": "FizzBuzz",
        "difficulty": "EASY",
        "language": "python",
        "description": """\
Given an integer `n`, return a list of strings for each number from 1 to n:
- `"FizzBuzz"` if divisible by both 3 and 5
- `"Fizz"` if divisible by 3
- `"Buzz"` if divisible by 5
- The number itself (as a string) otherwise

**Example:**
- Input: n = 15
- Output: ["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]

**Constraints:** 1 <= n <= 10^4""",
        "starter_code": """\
def fizz_buzz(n: int) -> list[str]:
    # Your solution here
    pass


if __name__ == "__main__":
    print(fizz_buzz(15))
""",
        "expected_solution": """\
def fizz_buzz(n: int) -> list[str]:
    result = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            result.append("FizzBuzz")
        elif i % 3 == 0:
            result.append("Fizz")
        elif i % 5 == 0:
            result.append("Buzz")
        else:
            result.append(str(i))
    return result
""",
        "test_cases": [
            {"input": {"n": 3}, "expected": ["1","2","Fizz"]},
            {"input": {"n": 5}, "expected": ["1","2","Fizz","4","Buzz"]},
        ],
    },
    {
        "title": "Valid Parentheses",
        "difficulty": "EASY",
        "language": "python",
        "description": """\
Given a string `s` containing only `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

**Example 1:** Input: s = "()" → Output: True
**Example 2:** Input: s = "()[]{}" → Output: True
**Example 3:** Input: s = "(]" → Output: False
**Example 4:** Input: s = "([)]" → Output: False

**Constraints:** 1 <= s.length <= 10^4""",
        "starter_code": """\
def is_valid(s: str) -> bool:
    # Your solution here
    pass


if __name__ == "__main__":
    print(is_valid("()"))       # True
    print(is_valid("()[]{}"))   # True
    print(is_valid("(]"))       # False
    print(is_valid("([)]"))     # False
    print(is_valid("{[]}"))     # True
""",
        "expected_solution": """\
def is_valid(s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for ch in s:
        if ch in mapping:
            top = stack.pop() if stack else '#'
            if mapping[ch] != top:
                return False
        else:
            stack.append(ch)
    return not stack
""",
        "test_cases": [
            {"input": {"s": "()"}, "expected": True},
            {"input": {"s": "()[]{}"}, "expected": True},
            {"input": {"s": "(]"}, "expected": False},
            {"input": {"s": "([)]"}, "expected": False},
        ],
    },
    # ── MEDIUM ──────────────────────────────────────────────────────────────
    {
        "title": "Longest Substring Without Repeating Characters",
        "difficulty": "MEDIUM",
        "language": "python",
        "description": """\
Given a string `s`, find the length of the longest substring without repeating characters.

**Example 1:**
- Input: s = "abcabcbb"
- Output: 3  (the answer is "abc")

**Example 2:**
- Input: s = "bbbbb"
- Output: 1  (the answer is "b")

**Example 3:**
- Input: s = "pwwkew"
- Output: 3  (the answer is "wke")

**Constraints:**
- 0 <= s.length <= 5 * 10^4
- s consists of English letters, digits, symbols and spaces.""",
        "starter_code": """\
def length_of_longest_substring(s: str) -> int:
    # Your solution here
    pass


if __name__ == "__main__":
    print(length_of_longest_substring("abcabcbb"))  # 3
    print(length_of_longest_substring("bbbbb"))      # 1
    print(length_of_longest_substring("pwwkew"))     # 3
""",
        "expected_solution": """\
def length_of_longest_substring(s: str) -> int:
    char_index = {}
    max_len = 0
    left = 0
    for right, ch in enumerate(s):
        if ch in char_index and char_index[ch] >= left:
            left = char_index[ch] + 1
        char_index[ch] = right
        max_len = max(max_len, right - left + 1)
    return max_len
""",
        "test_cases": [
            {"input": {"s": "abcabcbb"}, "expected": 3},
            {"input": {"s": "bbbbb"}, "expected": 1},
            {"input": {"s": "pwwkew"}, "expected": 3},
            {"input": {"s": ""}, "expected": 0},
        ],
    },
    {
        "title": "Maximum Subarray",
        "difficulty": "MEDIUM",
        "language": "python",
        "description": """\
Given an integer array `nums`, find the subarray with the largest sum and return its sum.

**Example 1:**
- Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
- Output: 6  (subarray [4,-1,2,1])

**Example 2:**
- Input: nums = [1]
- Output: 1

**Example 3:**
- Input: nums = [5,4,-1,7,8]
- Output: 23

**Constraints:**
- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4

**Follow-up:** Can you solve it in O(n) time (Kadane's algorithm)?""",
        "starter_code": """\
def max_subarray(nums: list[int]) -> int:
    # Your solution here
    pass


if __name__ == "__main__":
    print(max_subarray([-2,1,-3,4,-1,2,1,-5,4]))  # 6
    print(max_subarray([1]))                         # 1
    print(max_subarray([5,4,-1,7,8]))                # 23
""",
        "expected_solution": """\
def max_subarray(nums: list[int]) -> int:
    max_sum = current = nums[0]
    for num in nums[1:]:
        current = max(num, current + num)
        max_sum = max(max_sum, current)
    return max_sum
""",
        "test_cases": [
            {"input": {"nums": [-2,1,-3,4,-1,2,1,-5,4]}, "expected": 6},
            {"input": {"nums": [1]}, "expected": 1},
            {"input": {"nums": [5,4,-1,7,8]}, "expected": 23},
        ],
    },
    {
        "title": "Binary Search",
        "difficulty": "EASY",
        "language": "python",
        "description": """\
Given an array of integers `nums` sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists return its index, otherwise return `-1`.

You must write an algorithm with O(log n) runtime complexity.

**Example 1:**
- Input: nums = [-1,0,3,5,9,12], target = 9
- Output: 4

**Example 2:**
- Input: nums = [-1,0,3,5,9,12], target = 2
- Output: -1

**Constraints:**
- 1 <= nums.length <= 10^4
- All integers in nums are unique
- nums is sorted in ascending order""",
        "starter_code": """\
def search(nums: list[int], target: int) -> int:
    # Your solution here
    pass


if __name__ == "__main__":
    print(search([-1,0,3,5,9,12], 9))  # 4
    print(search([-1,0,3,5,9,12], 2))  # -1
""",
        "expected_solution": """\
def search(nums: list[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
""",
        "test_cases": [
            {"input": {"nums": [-1,0,3,5,9,12], "target": 9}, "expected": 4},
            {"input": {"nums": [-1,0,3,5,9,12], "target": 2}, "expected": -1},
        ],
    },
    {
        "title": "Merge Two Sorted Lists",
        "difficulty": "MEDIUM",
        "language": "python",
        "description": """\
You are given the heads of two sorted linked lists `list1` and `list2`.

Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.

Return the head of the merged linked list.

**Example 1:**
- Input: list1 = [1,2,4], list2 = [1,3,4]
- Output: [1,1,2,3,4,4]

**Example 2:**
- Input: list1 = [], list2 = []
- Output: []

**Note:** For this exercise, represent lists as Python lists for simplicity.

**Constraints:**
- 0 <= length of each list <= 50
- -100 <= Node.val <= 100
- Both lists are sorted in non-decreasing order.""",
        "starter_code": """\
def merge_sorted_lists(list1: list[int], list2: list[int]) -> list[int]:
    # Your solution here
    pass


if __name__ == "__main__":
    print(merge_sorted_lists([1,2,4], [1,3,4]))  # [1,1,2,3,4,4]
    print(merge_sorted_lists([], []))              # []
    print(merge_sorted_lists([], [0]))             # [0]
""",
        "expected_solution": """\
def merge_sorted_lists(list1: list[int], list2: list[int]) -> list[int]:
    result = []
    i = j = 0
    while i < len(list1) and j < len(list2):
        if list1[i] <= list2[j]:
            result.append(list1[i]); i += 1
        else:
            result.append(list2[j]); j += 1
    result.extend(list1[i:])
    result.extend(list2[j:])
    return result
""",
        "test_cases": [
            {"input": {"list1": [1,2,4], "list2": [1,3,4]}, "expected": [1,1,2,3,4,4]},
            {"input": {"list1": [], "list2": []}, "expected": []},
            {"input": {"list1": [], "list2": [0]}, "expected": [0]},
        ],
    },
    # ── HARD ────────────────────────────────────────────────────────────────
    {
        "title": "Median of Two Sorted Arrays",
        "difficulty": "HARD",
        "language": "python",
        "description": """\
Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays.

The overall run time complexity should be O(log(m+n)).

**Example 1:**
- Input: nums1 = [1,3], nums2 = [2]
- Output: 2.0  (merged = [1,2,3])

**Example 2:**
- Input: nums1 = [1,2], nums2 = [3,4]
- Output: 2.5  (merged = [1,2,3,4], median = (2+3)/2 = 2.5)

**Constraints:**
- nums1.length == m, nums2.length == n
- 0 <= m, n <= 1000
- 1 <= m + n <= 2000
- -10^6 <= nums1[i], nums2[i] <= 10^6""",
        "starter_code": """\
def find_median_sorted_arrays(nums1: list[int], nums2: list[int]) -> float:
    # Your solution here
    pass


if __name__ == "__main__":
    print(find_median_sorted_arrays([1,3], [2]))     # 2.0
    print(find_median_sorted_arrays([1,2], [3,4]))   # 2.5
""",
        "expected_solution": """\
def find_median_sorted_arrays(nums1: list[int], nums2: list[int]) -> float:
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    m, n = len(nums1), len(nums2)
    half = (m + n) // 2
    left, right = 0, m
    while left <= right:
        i = (left + right) // 2
        j = half - i
        left1  = nums1[i-1] if i > 0 else float('-inf')
        right1 = nums1[i]   if i < m else float('inf')
        left2  = nums2[j-1] if j > 0 else float('-inf')
        right2 = nums2[j]   if j < n else float('inf')
        if left1 <= right2 and left2 <= right1:
            if (m + n) % 2:
                return float(min(right1, right2))
            return (max(left1, left2) + min(right1, right2)) / 2
        elif left1 > right2:
            right = i - 1
        else:
            left = i + 1
    return 0.0
""",
        "test_cases": [
            {"input": {"nums1": [1,3], "nums2": [2]}, "expected": 2.0},
            {"input": {"nums1": [1,2], "nums2": [3,4]}, "expected": 2.5},
        ],
    },
    {
        "title": "Climbing Stairs",
        "difficulty": "EASY",
        "language": "python",
        "description": """\
You are climbing a staircase. It takes `n` steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?

**Example 1:**
- Input: n = 2
- Output: 2
- Explanation: 1+1 or 2

**Example 2:**
- Input: n = 3
- Output: 3
- Explanation: 1+1+1, 1+2, or 2+1

**Constraints:** 1 <= n <= 45

**Hint:** This is essentially the Fibonacci sequence.""",
        "starter_code": """\
def climb_stairs(n: int) -> int:
    # Your solution here
    pass


if __name__ == "__main__":
    print(climb_stairs(2))  # 2
    print(climb_stairs(3))  # 3
    print(climb_stairs(5))  # 8
""",
        "expected_solution": """\
def climb_stairs(n: int) -> int:
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
""",
        "test_cases": [
            {"input": {"n": 2}, "expected": 2},
            {"input": {"n": 3}, "expected": 3},
            {"input": {"n": 5}, "expected": 8},
        ],
    },
    {
        "title": "Number of Islands",
        "difficulty": "MEDIUM",
        "language": "python",
        "description": """\
Given an m x n 2D binary grid `grid` which represents a map of '1's (land) and '0's (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.

**Example 1:**
```
Input:
grid = [
  ["1","1","1","1","0"],
  ["1","1","0","1","0"],
  ["1","1","0","0","0"],
  ["0","0","0","0","0"]
]
Output: 1
```

**Example 2:**
```
Input:
grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]
Output: 3
```

**Constraints:**
- m == grid.length, n == grid[i].length
- 1 <= m, n <= 300""",
        "starter_code": """\
def num_islands(grid: list[list[str]]) -> int:
    # Your solution here
    pass


if __name__ == "__main__":
    g1 = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]
    print(num_islands(g1))  # 1

    g2 = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]
    print(num_islands(g2))  # 3
""",
        "expected_solution": """\
def num_islands(grid: list[list[str]]) -> int:
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    count = 0

    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != '1':
            return
        grid[r][c] = '0'
        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                dfs(r, c)
                count += 1
    return count
""",
        "test_cases": [
            {"input": {"grid": [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]}, "expected": 1},
            {"input": {"grid": [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]}, "expected": 3},
        ],
    },
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Skip titles that already exist
        existing_result = await db.execute(select(Problem.title))
        existing_titles = {row[0] for row in existing_result.fetchall()}

        inserted = 0
        skipped = 0
        for p in PROBLEMS:
            if p["title"] in existing_titles:
                print(f"  SKIP  {p['title']}")
                skipped += 1
                continue
            problem = Problem(
                title=p["title"],
                description=p["description"],
                difficulty=p["difficulty"],
                language=p["language"],
                starter_code=p.get("starter_code"),
                expected_solution=p.get("expected_solution"),
                test_cases=p.get("test_cases"),
                created_by=1,
            )
            db.add(problem)
            inserted += 1
            print(f"  ADD   [{p['difficulty']}] {p['title']}")

        await db.commit()
        print(f"\nDone — {inserted} inserted, {skipped} skipped.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
