import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Difficulty = "EASY" | "MEDIUM" | "HARD";

interface Seed {
  id?: string;
  type: "SINGLE" | "MULTI" | "FILL" | "CODING" | "PRINT" | "QA";
  title: string;
  body: string;
  difficulty: Difficulty;
  tags: string[];
  source: string;
  score?: number;
  payload: unknown;
  explanation: string;
}

const seeds: Seed[] = [
  // ---------- 单选 ----------
  {
    type: "SINGLE",
    title: "JavaScript 中 `typeof null` 的结果是什么？",
    body: "下列代码 `console.log(typeof null)` 的输出是？",
    difficulty: "EASY",
    tags: ["JavaScript", "基础"],
    source: "前端面试题宝典 / JS 基础",
    payload: {
      options: [
        { id: "A", label: "\"null\"" },
        { id: "B", label: "\"object\"" },
        { id: "C", label: "\"undefined\"" },
        { id: "D", label: "\"number\"" },
      ],
      answer: ["B"],
    },
    explanation:
      "`typeof null === \"object\"` 是 JS 历史遗留 bug：在最初实现中类型标签 0 表示对象，而 null 的内部表示恰好是全 0。规范保留了这一行为以维持兼容。",
  },
  {
    type: "SINGLE",
    title: "React 中下面哪个 Hook 用于副作用？",
    body: "在函数组件里执行订阅、发起请求等副作用应该使用：",
    difficulty: "EASY",
    tags: ["React", "Hook"],
    source: "React 官方文档",
    payload: {
      options: [
        { id: "A", label: "useMemo" },
        { id: "B", label: "useCallback" },
        { id: "C", label: "useEffect" },
        { id: "D", label: "useRef" },
      ],
      answer: ["C"],
    },
    explanation:
      "`useEffect` 在渲染提交后异步执行，用于处理订阅、网络请求、手动 DOM 操作等副作用。",
  },

  // ---------- 多选 ----------
  {
    type: "MULTI",
    title: "下列哪些是 JavaScript 的原始类型？",
    body: "选出所有原始（primitive）类型：",
    difficulty: "EASY",
    tags: ["JavaScript", "类型"],
    source: "前端面试题宝典 / JS 类型",
    payload: {
      options: [
        { id: "A", label: "string" },
        { id: "B", label: "number" },
        { id: "C", label: "Object" },
        { id: "D", label: "symbol" },
        { id: "E", label: "bigint" },
        { id: "F", label: "Array" },
      ],
      answer: ["A", "B", "D", "E"],
    },
    explanation:
      "原始类型有 string、number、bigint、boolean、undefined、symbol、null。Object 与 Array 都是引用类型。",
  },
  {
    type: "MULTI",
    title: "以下哪些方法会修改原数组？",
    body: "选出所有会原地修改数组的方法：",
    difficulty: "MEDIUM",
    tags: ["JavaScript", "数组"],
    source: "MDN Array",
    payload: {
      options: [
        { id: "A", label: "push" },
        { id: "B", label: "map" },
        { id: "C", label: "splice" },
        { id: "D", label: "slice" },
        { id: "E", label: "reverse" },
      ],
      answer: ["A", "C", "E"],
    },
    explanation:
      "push / pop / shift / unshift / splice / sort / reverse / fill / copyWithin 都会修改原数组；map / slice / concat / filter 等返回新数组。",
  },

  // ---------- 填空 ----------
  {
    type: "FILL",
    title: "盒模型 box-sizing 关键字",
    body: "CSS 中让元素的 width/height 包含 padding 与 border 的取值是：______",
    difficulty: "EASY",
    tags: ["CSS", "盒模型"],
    source: "MDN CSS box-sizing",
    payload: {
      answers: ["border-box"],
      caseSensitive: false,
    },
    explanation: "`box-sizing: border-box` 让 padding 与 border 计入元素的尺寸，常用于布局重置。",
  },
  {
    type: "FILL",
    title: "HTTP 状态码：永久重定向",
    body: "表示「资源已永久重定向」的标准 HTTP 状态码是：______",
    difficulty: "EASY",
    tags: ["HTTP", "网络"],
    source: "RFC 9110",
    payload: {
      answers: ["301"],
    },
    explanation: "301 Moved Permanently；308 与之类似但保留原方法。",
  },

  // ---------- 编程 ----------
  {
    type: "CODING",
    title: "实现数组去重 unique",
    body:
      "请实现 `unique(arr)`，对任意数组去重并保持首次出现顺序。\n\n示例：`unique([1,1,2,3,2])` => `[1,2,3]`",
    difficulty: "EASY",
    tags: ["JavaScript", "数组"],
    source: "前端算法题库",
    score: 20,
    payload: {
      language: "js",
      entryFn: "unique",
      starterCode:
        "function unique(arr) {\n  // TODO: 实现数组去重，保持首次出现顺序\n  return arr;\n}\n",
      tests: [
        { name: "数字数组", input: [[1, 1, 2, 3, 2]], expected: [1, 2, 3] },
        { name: "字符串数组", input: [["a", "b", "a", "c"]], expected: ["a", "b", "c"] },
        { name: "空数组", input: [[]], expected: [] },
        { name: "全相同", input: [[5, 5, 5]], expected: [5] },
      ],
    },
    explanation:
      "可用 `Set`：`return [...new Set(arr)]`，时间复杂度 O(n)。也可以用 `filter + indexOf` (O(n²))，或对象/Map 做哈希记录。",
  },
  {
    type: "CODING",
    title: "实现防抖 debounce",
    body:
      "请实现一个简单 `debounce(fn, wait)`，返回新函数：连续触发时只在最后一次触发后 `wait` 毫秒执行 `fn`。\n\n为方便评测，本题在测试中会 mock 时间——只需保证函数签名与基础行为即可。",
    difficulty: "MEDIUM",
    tags: ["JavaScript", "函数"],
    source: "前端算法题库",
    score: 20,
    payload: {
      language: "js",
      entryFn: "runDebounce",
      starterCode:
        "function debounce(fn, wait) {\n  // TODO: 实现防抖\n}\n\n// 测试入口：模拟在 [delays] 时刻触发，最终在 totalMs 后取值\nasync function runDebounce(delays, wait, totalMs) {\n  let calls = 0;\n  const debounced = debounce(() => { calls++; }, wait);\n  let t = 0;\n  for (const d of delays) {\n    await new Promise(r => setTimeout(r, d - t));\n    t = d;\n    debounced();\n  }\n  await new Promise(r => setTimeout(r, totalMs - t));\n  return calls;\n}\n",
      tests: [
        { name: "单次触发应执行 1 次", input: [[0], 30, 100], expected: 1 },
        { name: "连续触发只执行 1 次", input: [[0, 10, 20], 50, 200], expected: 1 },
        { name: "两段触发分别执行", input: [[0, 200], 50, 400], expected: 2 },
      ],
    },
    explanation:
      "经典实现：闭包持有 `timer`，每次调用 `clearTimeout(timer)` 后 `setTimeout(() => fn.apply(this, args), wait)`。",
  },

  // ---------- 打印结果 ----------
  {
    type: "PRINT",
    title: "事件循环：宏/微任务顺序",
    body:
      "下列代码的输出顺序是什么？请把每行 `console.log` 的输出按顺序写在编辑器中（每行一个，与代码运行顺序一致）。",
    difficulty: "MEDIUM",
    tags: ["JavaScript", "事件循环"],
    source: "前端面试题宝典 / 异步",
    score: 15,
    payload: {
      language: "js",
      starterCode:
        "console.log('1');\nsetTimeout(() => console.log('2'), 0);\nPromise.resolve().then(() => console.log('3'));\nconsole.log('4');\n",
      expectedOutput: "1\n4\n3\n2",
    },
    explanation:
      "同步代码先执行 → 1, 4；微任务（Promise.then）在当前宏任务结束后执行 → 3；setTimeout 是新的宏任务 → 2。",
  },

  // ---------- 问答 ----------
  {
    type: "QA",
    title: "什么是闭包？",
    body: "请用自己的话解释 JavaScript 中的闭包（Closure）以及一个常见用途。",
    difficulty: "MEDIUM",
    tags: ["JavaScript", "作用域"],
    source: "前端面试题宝典 / JS 进阶",
    score: 20,
    payload: {
      referenceAnswer:
        "闭包是指函数与其词法作用域（lexical scope）的组合：内部函数可以访问外部函数的变量，即使外部函数已经返回。常见用途包括：实现私有变量、模块模式、函数柯里化、防抖/节流、setTimeout 中保留状态等。",
      keywords: ["函数", "作用域", "变量", "词法", "返回"],
    },
    explanation:
      "评分按关键词命中比例打分。完整答案应包含：定义（函数 + 词法作用域）、能访问外部变量、即使外部函数已返回、应用场景。",
  },
];

async function main() {
  await prisma.attempt.deleteMany();
  await prisma.question.deleteMany();
  for (const s of seeds) {
    await prisma.question.create({
      data: {
        type: s.type,
        title: s.title,
        body: s.body,
        difficulty: s.difficulty,
        tags: JSON.stringify(s.tags),
        source: s.source,
        score: s.score ?? 10,
        payload: JSON.stringify(s.payload),
        explanation: s.explanation,
      },
    });
  }
  console.log(`Seeded ${seeds.length} questions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
