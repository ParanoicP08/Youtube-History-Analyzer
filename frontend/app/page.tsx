"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";

type AnalysisResult = {
  totalVideos: number;
  uniqueChannels: number;
  topChannels: Array<{ name: string; count: number }>;
  topTitles: string[];
};

type VideoEntry = {
  title: string;
  channel: string;
  time: Date | null;
};

type GenreSummary = {
  name: string;
  count: number;
  percentage: number;
  color: string;
};

type ProfileSummary = {
  totalVideos: number;
  uniqueChannels: number;
  topGenres: GenreSummary[];
  topChannels: Array<{ name: string; count: number }>;
  topVideos: Array<{ name: string; count: number }>;
  estimatedWatchTimeStr: string;
  peakActivity: string;
  lateNightPct: number;
  insights: string[];
  summaryText: string;
  totalDated: number;
  dayHourGrid: number[][];
  weeklyTrend: number[];
};

type SavedReport = {
  id: string;
  userName: string;
  createdAt: string;
  sourceName: string;
  analysis: AnalysisResult;
  profile: ProfileSummary;
  jobId: string;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

const demoVideos: VideoEntry[] = [
  { title: "How I built a side project in 30 days", channel: "Theo - t3.gg", time: new Date("2025-07-20T20:00:00") },
  { title: "React patterns you should know", channel: "Jack Herris", time: new Date("2025-07-21T19:30:00") },
  { title: "AI coding tools in 2025", channel: "Fireship", time: new Date("2025-07-21T21:15:00") },
  { title: "Best indie games of the month", channel: "Game Theory", time: new Date("2025-07-22T18:00:00") },
  { title: "Deep dive into Next.js", channel: "Theo - t3.gg", time: new Date("2025-07-23T20:30:00") },
  { title: "CRYPTO explained simply", channel: "Investopedia", time: new Date("2025-07-24T22:00:00") },
  { title: "Lo-fi study beats", channel: "Chillhop", time: new Date("2025-07-25T23:20:00") },
  { title: "Python for automation", channel: "Corey Schafer", time: new Date("2025-07-26T17:00:00") },
];

export default function Home() {
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("Select a watch-history.json file to upload.");
  const [jobId, setJobId] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [allVideos, setAllVideos] = useState<VideoEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [hasAutoLoadedDemo, setHasAutoLoadedDemo] = useState(false);
  const [userName, setUserName] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  const uploadUrl = apiBaseUrl ? `${apiBaseUrl}/api/upload` : "/api/upload";

  const parseDate = (value: unknown): Date | null => {
    if (value == null) return null;
    if (value instanceof Date && !Number.isNaN(value)) return value;
    if (typeof value === "number") {
      if (value > 1e12) return new Date(value);
      if (value > 1e9) return new Date(value * 1000);
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) {
        if (numeric > 1e12) return new Date(numeric);
        if (numeric > 1e9) return new Date(numeric * 1000);
      }
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const firstText = (entry: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = entry[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  };

  const normalize = (value: string) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();

  const parseHistory = (raw: string): VideoEntry[] => {
    let data: unknown = null;
    try {
      data = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        try {
          data = JSON.parse(match[0]);
        } catch {
          data = null;
        }
      }
    }

    if (!data) return [];
    let list: unknown[] = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === "object") {
      const container = data as Record<string, unknown>;
      if (Array.isArray(container.items)) list = container.items as unknown[];
      else if (Array.isArray(container.videos)) list = container.videos as unknown[];
      else if (Array.isArray(container.history)) list = container.history as unknown[];
      else list = [container];
    }

    return list
      .map((entry) => {
        const item = entry as Record<string, unknown>;
        const title = firstText(item, ["title", "videoTitle", "name"]) || "";
        const channel = (
          (item.subtitles as Array<{ name?: string }> | undefined)?.find((entry) => entry?.name)?.name ||
          (item.details as Array<{ name?: string }> | undefined)?.find((entry) => entry?.name)?.name ||
          (item as Record<string, unknown>).channelName ||
          (item as Record<string, unknown>).author ||
          (item as Record<string, unknown>).creator ||
          "Unknown"
        ) as string;
        const time =
          parseDate(item.time) ||
          parseDate(item.timestamp) ||
          parseDate(item.time_usec) ||
          parseDate(item.modifiedTime) ||
          parseDate(item.activity_time) ||
          parseDate(item.endedAt) ||
          null;

        return {
          title: title.replace(/^Watched\s+/i, "").trim(),
          channel: String(channel).trim() || "Unknown",
          time,
        } as VideoEntry;
      })
      .filter((video) => {
        const title = normalize(video.title);
        return !!title && !title.includes("has been removed") && !title.includes("deleted video");
      });
  };

  const classifyCategory = (video: VideoEntry) => {
    const text = normalize(`${video.title} ${video.channel}`);
    const rules: Array<[string, RegExp[]]> = [
      ["Gaming", [/gameplay|walkthrough|lets play|bgmi|pubg|gta|minecraft|valorant|fortnite|cs2|gaming|stream/]],
      ["Tech & AI", [/ai|machine learning|coding|programming|developer|software|tech|javascript|python|android|iphone|review|gpu/]],
      ["Education", [/lecture|tutorial|explained|course|study|math|physics|history|engineering|how to|lesson/]],
      ["Music", [/song|music|remix|cover|album|playlist|lofi|beat|rap/]],
      ["Entertainment", [/vlog|reaction|comedy|meme|podcast|interview|funny|challenge/]],
      ["News", [/news|breaking|update|headline|politics/]],
      ["Finance", [/stock|trading|invest|crypto|bitcoin|economy|business|finance/]],
      ["Sports", [/cricket|football|soccer|nba|match|highlights|goal|sports/]],
      ["Documentary", [/documentary|mystery|investigation|history|true story/]],
    ];
    for (const [name, patterns] of rules) {
      if (patterns.some((pattern) => pattern.test(text))) return name;
    }
    return "Other";
  };

  const topEntries = (map: Map<string, number>, limit: number) =>
    Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);

  const buildProfile = (videos: VideoEntry[]): ProfileSummary | null => {
    const valid = videos.filter((video) => Boolean(video.title));
    if (!valid.length) return null;

    const dated = valid.filter((video) => video.time instanceof Date && !Number.isNaN(video.time.getTime()));
    const channelCounts = new Map<string, number>();
    const genreCounts = new Map<string, number>();
    const videoCounts = new Map<string, number>();
    const hourCounts = Array(24).fill(0);
    const dayCounts = Array(7).fill(0);
    const dayHourGrid = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const video of valid) {
      const channel = video.channel || "Unknown";
      channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);
      const category = classifyCategory(video);
      genreCounts.set(category, (genreCounts.get(category) || 0) + 1);
      const videoKey = `${video.title} — ${channel}`;
      videoCounts.set(videoKey, (videoCounts.get(videoKey) || 0) + 1);
    }

    for (const video of dated) {
      const hour = video.time!.getHours();
      const day = video.time!.getDay();
      hourCounts[hour] += 1;
      dayCounts[day] += 1;
      dayHourGrid[day][hour] += 1;
    }

    const topGenresRaw = topEntries(genreCounts, 6);
    const genreTotal = topGenresRaw.reduce((sum, [, count]) => sum + count, 0) || 1;
    const topGenres = topGenresRaw.map(([name, count], index) => ({
      name,
      count,
      percentage: Math.max(1, Math.round((count / genreTotal) * 100)),
      color: COLORS[index % COLORS.length],
    }));

    const pctSum = topGenres.reduce((sum, genre) => sum + genre.percentage, 0);
    if (topGenres.length && pctSum !== 100) {
      topGenres[topGenres.length - 1].percentage += 100 - pctSum;
    }

    const total = valid.length;
    const estimatedMinutes = total * 10;
    const estimatedHours = Math.floor(estimatedMinutes / 60);
    const estimatedDays = Math.floor(estimatedHours / 24);
    const remainingHours = estimatedHours % 24;
    const estimatedWatchTimeStr = estimatedDays > 0 ? `${estimatedDays}d ${remainingHours}h` : `${estimatedHours}h`;

    const topChannels = topEntries(channelCounts, 10).map(([name, count]) => ({ name, count }));
    const topVideos = topEntries(videoCounts, 8).map(([name, count]) => ({ name, count }));
    const uniqueChannels = channelCounts.size;

    const peakHourIndex = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
    const lateNight = dated.filter((video) => {
      const hour = video.time!.getHours();
      return hour >= 22 || hour <= 5;
    }).length;
    const lateNightPct = dated.length ? Math.round((lateNight / dated.length) * 100) : 0;
    const hourLabel = peakHourIndex >= 0 ? HOURS[peakHourIndex] : "Unknown";
    const dayLabel = peakDayIndex >= 0 ? DAYS[peakDayIndex] : "Unknown";
    const topGenre = topGenres[0]?.name || "Mixed";

    const maxDate = dated.length ? dated.reduce((latest, current) => (current.time! > latest.time! ? current : latest), dated[0]).time! : new Date();
    const weeklyTrend = Array.from({ length: 7 }, (_, index) => {
      const target = new Date(maxDate);
      target.setDate(target.getDate() - (6 - index));
      const dayStart = new Date(target);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(target);
      dayEnd.setHours(23, 59, 59, 999);
      return dated.filter((video) => video.time! >= dayStart && video.time! <= dayEnd).length;
    });

    return {
      totalVideos: total,
      uniqueChannels,
      topGenres,
      topChannels,
      topVideos,
      estimatedWatchTimeStr,
      peakActivity: `${dayLabel}s at ${hourLabel}`,
      lateNightPct,
      insights: [
        `You watch across ${uniqueChannels} distinct channels, indicating a ${uniqueChannels > 50 ? "broad discovery pattern" : "curated, focused feed"}.`,
        topGenres[0]?.percentage >= 45 ? `Your viewing is highly concentrated, with ${topGenre} taking up nearly half your time.` : "You have a diverse taste profile, spreading time across multiple categories.",
        lateNightPct >= 40 ? `A significant portion (${lateNightPct}%) happens between 10 PM and 6 AM.` : "Most of your watch time occurs during standard daytime or evening hours.",
      ],
      summaryText: `Your history is heavily influenced by <strong>${topGenre}</strong> content. You are generally most active on <strong>${dayLabel}s</strong> around <strong>${hourLabel}</strong>. You've engaged with <strong>${uniqueChannels.toLocaleString()}</strong> unique creators.`,
      totalDated: dated.length,
      dayHourGrid,
      weeklyTrend,
    };
  };

  useEffect(() => {
    if (!allVideos.length) {
      setProfile(null);
      return;
    }
    setProfile(buildProfile(allVideos));
  }, [allVideos]);

  useEffect(() => {
    if (!hasAutoLoadedDemo && !allVideos.length) {
      setHasAutoLoadedDemo(true);
      void loadDemoData();
    }
  }, [allVideos, hasAutoLoadedDemo]);

  useEffect(() => {
    try {
      const storedUser = window.localStorage.getItem("yt-taste-ai:user");
      if (storedUser) {
        setUserName(storedUser);
        setIsSignedIn(true);
      }
      const storedReports = window.localStorage.getItem("yt-taste-ai:saved-reports");
      if (storedReports) {
        const parsed = JSON.parse(storedReports) as SavedReport[];
        if (Array.isArray(parsed)) {
          setSavedReports(parsed);
        }
      }
    } catch {
      // Ignore storage errors and continue with defaults.
    }
  }, []);

  const buildLocalAnalysis = (videos: VideoEntry[]): AnalysisResult => {
    const channelCounts = new Map<string, number>();
    const titleCounts = new Map<string, number>();

    for (const video of videos) {
      const channel = video.channel || "Unknown";
      channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);
      const title = video.title || "Untitled";
      titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
    }

    const topChannels = Array.from(channelCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topTitles = Array.from(titleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    return {
      totalVideos: videos.length,
      uniqueChannels: channelCounts.size,
      topChannels,
      topTitles,
    };
  };

  const handleFileSelection = async (file: File) => {
    if (!file) return;

    setFileName(file.name);
    setStatus("Reading file...");
    setIsLoading(true);
    setProfile(null);
    setAnalysis(null);
    setJobId("");

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = Array.isArray(parsed)
        ? { items: parsed }
        : parsed && typeof parsed === "object"
          ? parsed
          : { items: [] };

      const parsedVideos = parseHistory(text);
      setAllVideos(parsedVideos);
      setStatus("Uploading to backend...");
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const result = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        throw new Error(typeof result === "string" ? result : result?.error || "Upload failed");
      }

      if (!isJson || !result?.success) {
        throw new Error(typeof result === "string" ? result : result?.error || "Upload failed");
      }

      setJobId(result.jobId);
      setAnalysis(result.result ?? null);
      setStatus(`Accepted for processing (${result.mode}).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
      setJobId("");
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await handleFileSelection(file);
  };

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await handleFileSelection(file);
  };

  const loadDemoData = async () => {
    const demoVideosWithDates = demoVideos.map((video) => ({ ...video, time: video.time instanceof Date ? new Date(video.time) : null }));
    setFileName("demo-watch-history.json");
    setStatus("Loaded built-in sample dashboard. No upload needed.");
    setIsLoading(false);
    setProfile(null);
    setAnalysis(null);
    setJobId("");
    setAllVideos(demoVideosWithDates);
    setAnalysis(buildLocalAnalysis(demoVideosWithDates));
  };

  const handleSignIn = () => {
    const nextName = userName.trim() || "Guest";
    setUserName(nextName);
    setIsSignedIn(true);
    window.localStorage.setItem("yt-taste-ai:user", nextName);
    setSaveMessage(`Signed in as ${nextName}.`);
  };

  const saveCurrentReport = () => {
    if (!profile || !analysis) {
      setSaveMessage("Create a report first so it can be saved.");
      return;
    }

    const nextReport: SavedReport = {
      id: `${Date.now()}`,
      userName: isSignedIn ? userName.trim() || "Guest" : "Guest",
      createdAt: new Date().toISOString(),
      sourceName: fileName || "demo-watch-history.json",
      analysis,
      profile,
      jobId: jobId || "local-demo",
    };

    const nextReports = [nextReport, ...savedReports].slice(0, 6);
    setSavedReports(nextReports);
    window.localStorage.setItem("yt-taste-ai:saved-reports", JSON.stringify(nextReports));
    setSaveMessage(`Saved ${nextReport.sourceName}.`);
  };

  const loadSavedReport = (report: SavedReport) => {
    setAnalysis(report.analysis);
    setProfile(report.profile);
    setFileName(report.sourceName);
    setJobId(report.jobId);
    setStatus(`Loaded saved report from ${new Date(report.createdAt).toLocaleDateString()}.`);
    setSaveMessage(`Loaded ${report.sourceName}.`);
  };

  const exportJson = () => {
    if (!profile || !analysis) return;
    const blob = new Blob([JSON.stringify({ analysis, profile, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "yt-taste-ai-report.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!profile || !analysis) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>YT Taste AI report</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin-bottom:8px}p{margin:4px 0}ul{padding-left:18px}</style></head><body><h1>YT Taste AI report</h1><p>Videos: ${analysis.totalVideos}</p><p>Unique channels: ${analysis.uniqueChannels}</p><h2>Top channels</h2><ul>${analysis.topChannels.map((channel) => `<li>${channel.name}: ${channel.count}</li>`).join("")}</ul><h2>Insights</h2><ul>${profile.insights.map((insight) => `<li>${insight}</li>`).join("")}</ul></body></html>`;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-zinc-800 bg-zinc-900/90 px-6 py-5 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-zinc-400">YT Taste AI</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">YouTube history, decoded into a living dashboard.</h1>
            </div>
            <div className="rounded-full border border-zinc-700 bg-zinc-800/70 px-3 py-1 text-sm text-zinc-300">Local-only analysis</div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white">Upload your watch-history.json</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              The app reads your export locally, sends it to the backend for processing, and turns the result into a profile dashboard with charts, filters, and export actions.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">Privacy first</span>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">Offline capable</span>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">Instant insights</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center transition ${dragActive ? "border-blue-500 bg-zinc-800" : "border-zinc-700 bg-zinc-900/70"}`}
            >
              <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleInputChange} />
              <div className="text-lg font-semibold text-white">Choose watch-history.json</div>
              <div className="mt-2 text-sm text-zinc-400">Or drag and drop it here to start the analysis.</div>
            </label>
            <button onClick={() => { void loadDemoData(); }} className="rounded-2xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-zinc-800">
              Try sample dashboard
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">Status</p>
              <p className="mt-1 text-lg font-medium text-white">{isLoading ? "Working..." : status}</p>
            </div>
            {fileName ? <div className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-300">{fileName}</div> : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <input
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Your name"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
            <button onClick={handleSignIn} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
              {isSignedIn ? "Update profile" : "Sign in"}
            </button>
            <button onClick={saveCurrentReport} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
              Save report
            </button>
            {saveMessage ? <span className="text-sm text-emerald-400">{saveMessage}</span> : null}
          </div>
          {jobId ? <p className="mt-3 text-sm text-emerald-400">Job ID: {jobId}</p> : null}
          {analysis ? (
            <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-sm font-semibold text-zinc-200">Analysis summary</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Videos</p>
                  <p className="mt-1 text-xl font-semibold text-white">{analysis.totalVideos}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Channels</p>
                  <p className="mt-1 text-xl font-semibold text-white">{analysis.uniqueChannels}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Top channel</p>
                  <p className="mt-1 text-sm font-semibold text-white">{analysis.topChannels[0]?.name || "—"}</p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {savedReports.length ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">Saved reports</p>
                <p className="mt-2 text-lg font-semibold text-white">Pick up where you left off.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {savedReports.map((report) => (
                <button key={report.id} onClick={() => loadSavedReport(report)} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-left transition hover:border-blue-500">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{report.sourceName}</span>
                    <span className="text-xs text-zinc-500">{new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{report.analysis.totalVideos} videos · {report.analysis.uniqueChannels} channels</p>
                  <p className="mt-1 text-xs text-zinc-500">Saved for {report.userName}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {profile ? (
          <section className="grid gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">Viewer Profile</p>
                  <p className="mt-2 text-xl font-semibold text-white">{profile.summaryText ? <span dangerouslySetInnerHTML={{ __html: profile.summaryText }} /> : "Profile summary"}</p>
                </div>
                <div className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-300">{profile.totalDated} dated items</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
              <button onClick={exportJson} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
                Export JSON
              </button>
              <button onClick={exportPdf} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
                Export PDF
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Total videos</p>
                <p className="mt-2 text-2xl font-semibold text-white">{profile.totalVideos}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Est. watch time</p>
                <p className="mt-2 text-2xl font-semibold text-white">{profile.estimatedWatchTimeStr}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Unique channels</p>
                <p className="mt-2 text-2xl font-semibold text-white">{profile.uniqueChannels}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Peak activity</p>
                <p className="mt-2 text-xl font-semibold text-white">{profile.peakActivity}</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Category breakdown</h3>
                  <span className="text-sm text-zinc-400">By inferred interest</span>
                </div>
                <div className="mb-5 h-48 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <svg viewBox="0 0 320 140" className="h-full w-full">
                    {profile.topGenres.map((genre, index) => {
                      const barHeight = (genre.percentage / 100) * 100;
                      const x = 24 + index * 48;
                      const y = 120 - barHeight;
                      return (
                        <g key={genre.name}>
                          <rect x={x} y={y} width="28" height={barHeight} rx="6" fill={genre.color} />
                          <text x={x + 14} y="132" textAnchor="middle" fontSize="10" fill="#a1a1aa">{genre.name.slice(0, 8)}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="space-y-4">
                  {profile.topGenres.map((genre) => (
                    <div key={genre.name}>
                      <div className="mb-1 flex items-center justify-between text-sm text-zinc-300">
                        <span>{genre.name}</span>
                        <span className="text-zinc-500">{genre.percentage}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800">
                        <div className="h-2 rounded-full" style={{ width: `${genre.percentage}%`, backgroundColor: genre.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Activity trend</h3>
                  <span className="text-sm text-zinc-400">Last 7 days</span>
                </div>
                <svg viewBox="0 0 320 160" className="h-48 w-full">
                  <line x1="20" y1="130" x2="300" y2="130" stroke="#3f3f46" />
                  <line x1="20" y1="20" x2="20" y2="130" stroke="#3f3f46" />
                  {profile.weeklyTrend.map((value, index) => {
                    const x = 40 + index * 40;
                    const y = 130 - (value / Math.max(1, Math.max(...profile.weeklyTrend))) * 90;
                    return <circle key={`${value}-${index}`} cx={x} cy={y} r="4" fill="#3b82f6" />;
                  })}
                  <path d={profile.weeklyTrend.map((value, index) => `${index === 0 ? "M" : "L"} ${40 + index * 40} ${130 - (value / Math.max(1, Math.max(...profile.weeklyTrend))) * 90}`).join(" ")} stroke="#3b82f6" strokeWidth="2" fill="none" />
                </svg>
                <div className="mt-3 flex justify-between text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {profile.weeklyTrend.map((value, index) => <span key={`${value}-${index}`}>{index === 6 ? "Today" : `D-${6 - index}`}</span>)}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                <h3 className="text-lg font-semibold text-white">Most watched creators</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.topChannels.map((channel) => (
                    <span key={channel.name} className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                      {channel.name} · {channel.count}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                <h3 className="text-lg font-semibold text-white">Most rewatched videos</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.topVideos.map((video) => (
                    <span key={video.name} className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                      {video.name} · {video.count}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                <h3 className="text-lg font-semibold text-white">Key insights</h3>
                <div className="mt-4 space-y-3 text-sm text-zinc-400">
                  {profile.insights.map((insight) => (
                    <div key={insight} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
