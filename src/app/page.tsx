import Link from "next/link";

const FEATURES = [
  {
    href: "/questions",
    icon: "📚",
    title: "题库",
    desc: "单选 / 多选 / 填空 / 编程 / 打印结果 / 问答，六种题型全覆盖",
    color: "from-blue-500/10 to-indigo-500/10 border-blue-200 dark:border-blue-900",
    iconBg: "bg-blue-100 dark:bg-blue-950",
  },
  {
    href: "/plan",
    icon: "🗓️",
    title: "学习计划",
    desc: "基于艾宾浩斯遗忘曲线自动生成每日 / 每周复习计划",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-900",
    iconBg: "bg-emerald-100 dark:bg-emerald-950",
  },
  {
    href: "/interview",
    icon: "🎯",
    title: "模拟面试",
    desc: "随机 N 题或定时模式，模拟真实面试场景",
    color: "from-orange-500/10 to-amber-500/10 border-orange-200 dark:border-orange-900",
    iconBg: "bg-orange-100 dark:bg-orange-950",
  },
  {
    href: "/stats",
    icon: "📊",
    title: "学习统计",
    desc: "按日 / 周 / 月查看正确率、连续打卡天数和题型分布",
    color: "from-purple-500/10 to-violet-500/10 border-purple-200 dark:border-purple-900",
    iconBg: "bg-purple-100 dark:bg-purple-950",
  },
  {
    href: "/level",
    icon: "🏆",
    title: "能力评估",
    desc: "六维雷达图 + 阿里 P / 腾讯 T / 百度 T 等级对标",
    color: "from-rose-500/10 to-pink-500/10 border-rose-200 dark:border-rose-900",
    iconBg: "bg-rose-100 dark:bg-rose-950",
  },
  {
    href: "/cards",
    icon: "🃏",
    title: "卡片学习",
    desc: "闪卡模式快速浏览知识点，随时随地高效复习",
    color: "from-cyan-500/10 to-sky-500/10 border-cyan-200 dark:border-cyan-900",
    iconBg: "bg-cyan-100 dark:bg-cyan-950",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMCAwdi02aC02djZoNnptNiAwaDZ2LTZoLTZ2NnptLTEyIDBoLTZ2Nmg2di02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white/90 text-sm mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            前端面试刷题平台
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            系统备战前端面试
          </h1>
          <p className="text-lg text-white/75 mb-8 max-w-xl mx-auto">
            六种题型 · 艾宾浩斯复习计划 · 模拟面试 · 能力等级评估
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/questions"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-700 font-semibold hover:bg-blue-50 transition shadow-lg shadow-blue-900/20"
            >
              进入题库 →
            </Link>
            <Link
              href="/plan"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/15 text-white font-medium hover:bg-white/25 transition backdrop-blur-sm border border-white/20"
            >
              查看今日计划
            </Link>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className={`group p-5 rounded-2xl border bg-gradient-to-br ${f.color} hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
            >
              <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center text-xl mb-3`}>
                {f.icon}
              </div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                {f.title}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {f.desc}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
