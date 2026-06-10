import { r as reactExports, j as jsxRuntimeExports, m as motion, S as Square, f as Play, g as Pause, k as ReactDOM } from "./index-Dpe5W8Yb.js";
function Widget() {
  const [session, setSession] = reactExports.useState(null);
  const [elapsedSeconds, setElapsedSeconds] = reactExports.useState(0);
  const [distractionCount, setDistractionCount] = reactExports.useState(0);
  const [summary, setSummary] = reactExports.useState(null);
  const [targetMinutes, setTargetMinutes] = reactExports.useState(25);
  reactExports.useEffect(() => {
    window.widgetAPI.getActiveSession().then((s) => {
      setSession(s);
      if (s) {
        setDistractionCount(s.distractionCount);
        const mins = s.targetDurationMins || s.target_duration_mins || 25;
        setTargetMinutes(mins);
      }
    });
    const cleanupTick = window.widgetAPI.onSessionTick((data) => {
      setElapsedSeconds(data.seconds);
      setDistractionCount(data.distractionCount);
      if (data.targetDurationMins) {
        setTargetMinutes(data.targetDurationMins);
      }
    });
    const cleanupSummary = window.widgetAPI.onSessionStopped((data) => {
      setSummary(data);
      setSession(null);
    });
    return () => {
      cleanupTick();
      cleanupSummary();
    };
  }, []);
  const handleTogglePause = async () => {
    if (!session) return;
    if (session.status === "active") {
      await window.widgetAPI.pauseSession();
      setSession({ ...session, status: "paused" });
    } else {
      await window.widgetAPI.resumeSession();
      setSession({ ...session, status: "active" });
    }
  };
  const handleStop = async () => {
    const data = await window.widgetAPI.stopSession();
    if (data) {
      setSummary({
        durationMins: data.durationMins,
        durationSeconds: data.durationSeconds,
        distractionCount: data.distractionCount
      });
      setSession(null);
    }
  };
  const handleDone = () => {
    window.electronAPI.closeWindow();
  };
  const targetSeconds = targetMinutes * 60;
  const progressRatio = Math.min(1, elapsedSeconds / targetSeconds);
  const strokeDashoffset = 339 * (1 - progressRatio);
  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };
  if (summary) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-[380px] h-[320px] rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-white relative overflow-hidden select-none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 w-full h-8 flex items-center justify-center p-2", style: { WebkitAppRegion: "drag" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-1 bg-white/20 rounded-full" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        motion.div,
        {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          className: "flex flex-col items-center",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { className: "text-emerald-400 w-8 h-8 fill-current" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold mb-2", children: "Session Complete" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-4 text-sm text-white/50 mb-8", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: summary.durationSeconds !== void 0 ? summary.durationSeconds >= 60 ? `${Math.floor(summary.durationSeconds / 60)}m ${summary.durationSeconds % 60}s logged` : `${summary.durationSeconds}s logged` : `${summary.durationMins} min logged` }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "·" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                summary.distractionCount,
                " distractions"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: handleDone,
                className: "px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-colors",
                children: "Done"
              }
            )
          ]
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-[380px] h-[320px] rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 flex flex-col text-white relative overflow-hidden select-none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full h-6 flex items-center justify-center", style: { WebkitAppRegion: "drag" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-24 h-1.5 bg-white/20 rounded-full mt-2" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col items-center justify-center px-6", style: { WebkitAppRegion: "no-drag" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-white/80 w-full text-center truncate mb-4", children: session?.taskId || session?.task_id ? "Task in progress" : session?.projectId || session?.project_id ? "Project focus session" : "Focus Session" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center justify-center w-32 h-32 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { className: "w-full h-full transform -rotate-90", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "64", cy: "64", r: "54", stroke: "currentColor", strokeWidth: "4", fill: "none", className: "text-white/10" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            motion.circle,
            {
              cx: "64",
              cy: "64",
              r: "54",
              stroke: "currentColor",
              strokeWidth: "4",
              fill: "none",
              strokeLinecap: "round",
              className: "text-emerald-400",
              style: { strokeDasharray: 339 },
              animate: { strokeDashoffset },
              transition: { duration: 1, ease: "linear" }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute flex flex-col items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-3xl font-light tracking-tight", children: formatTime(elapsedSeconds) }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs font-semibold uppercase tracking-wider text-white/40 mb-2", children: [
        "Focusing · ",
        distractionCount,
        " distractions"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-white/30 truncate w-full text-center mb-4", children: "Keep it up!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleTogglePause,
            className: "w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shadow-lg",
            children: session?.status === "paused" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "w-4 h-4 fill-current ml-0.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { className: "w-4 h-4 fill-current" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleStop,
            className: "w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors shadow-lg",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { className: "w-4 h-4 fill-current" })
          }
        )
      ] })
    ] })
  ] });
}
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Widget, {}) })
);
