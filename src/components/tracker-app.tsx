"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  Activity,
  AlertCircle,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  ListChecks,
  LogIn,
  LogOut,
  Mail,
  PenLine,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Utensils,
  Weight,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createEmptyExerciseItem,
  createEmptyRecord,
  DailyRecord,
  mealKeys,
  mealLabels,
  normalizeRecord,
  sortRecords,
  summarizeMonth,
} from "@/lib/tracker";

type TabKey = "today" | "records" | "summary";
type Supabase = SupabaseClient;
type AuthStatus = "idle" | "loading" | "sent" | "signedIn" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";
type AuthFeedback = {
  status: AuthStatus;
  title: string;
  message: string;
};

const demoStorageKey = "behavior-tracker-demo-records";
const defaultSiteUrl = "https://behavior-tracker-app-khaki.vercel.app";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || defaultSiteUrl;
const accentColors = {
  weight: "bg-blue-50 text-blue-700 ring-blue-100",
  meals: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  exercise: "bg-orange-50 text-orange-700 ring-orange-100",
  study: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  poetry: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
  reading: "bg-cyan-50 text-cyan-700 ring-cyan-100",
};

export function TrackerApp() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const demoMode = !supabase;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authFeedback, setAuthFeedback] = useState<AuthFeedback>({
    status: "idle",
    title: "",
    message: "",
  });
  const [pendingSignupEmail, setPendingSignupEmail] = useState("");
  const [records, setRecords] = useState<DailyRecord[]>(() => {
    if (typeof window === "undefined" || !demoMode) return [];
    const stored = window.localStorage.getItem(demoStorageKey);
    const parsed = stored ? (JSON.parse(stored) as DailyRecord[]) : [];
    return sortRecords(parsed.map(normalizeRecord));
  });
  const [draft, setDraft] = useState<DailyRecord>(() => createEmptyRecord());
  const [tab, setTab] = useState<TabKey>("today");
  const [status, setStatus] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveToast, setSaveToast] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const currentMonth = draft.date.slice(0, 7);
  const summary = useMemo(() => summarizeMonth(records, currentMonth), [records, currentMonth]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) return;

    let cancelled = false;

    async function loadRecords(client: Supabase) {
      const { data, error } = await client
        .from("daily_records")
        .select("payload")
        .order("record_date", { ascending: false });

      if (cancelled) return;
      if (error) {
        setStatus(error.message);
        return;
      }

      const nextRecords = (data ?? []).map((row) =>
        normalizeRecord((row as { payload: unknown }).payload as DailyRecord),
      );
      setRecords(sortRecords(nextRecords));
    }

    loadRecords(supabase);

    return () => {
      cancelled = true;
    };
  }, [session, supabase]);

  function updateDraft(updater: (record: DailyRecord) => DailyRecord) {
    setDraft((current) => normalizeRecord(updater(current)));
  }

  function getAuthRedirectUrl() {
    return siteUrl;
  }

  function toKoreanAuthMessage(errorMessage: string) {
    const lower = errorMessage.toLowerCase();

    if (lower.includes("email not confirmed")) {
      return {
        title: "메일 인증이 아직 완료되지 않았습니다",
        message: "받은 메일함에서 인증 링크를 누른 뒤 다시 로그인해 주세요.",
      };
    }

    if (lower.includes("invalid login credentials")) {
      return {
        title: "이메일이나 비밀번호가 맞지 않아",
        message: "오타가 없는지 확인한 뒤 다시 시도해 주세요.",
      };
    }

    if (lower.includes("rate limit") || lower.includes("too many")) {
      return {
        title: "잠시 후 다시 시도해 주세요",
        message: "메일 요청이 너무 빠르게 반복됐을 수 있습니다. 1분 뒤 다시 시도해 주세요.",
      };
    }

    if (lower.includes("already registered") || lower.includes("already exists")) {
      return {
        title: "이미 가입된 이메일일 수 있어",
        message: "로그인으로 전환해 다시 시도해 주세요.",
      };
    }

    return {
      title: "처리하지 못했습니다",
      message: errorMessage || "잠시 후 다시 시도해 주세요.",
    };
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setAuthFeedback({
        status: "error",
        title: "이메일을 입력해 주세요",
        message: "인증 메일을 받을 주소가 필요합니다.",
      });
      return;
    }

    if (password.length < 8) {
      setAuthFeedback({
        status: "error",
        title: "비밀번호가 너무 짧아",
        message: "8자 이상으로 입력해 주세요.",
      });
      return;
    }

    setAuthFeedback({
      status: "loading",
      title: authMode === "signin" ? "로그인 중" : "인증 메일 보내는 중",
      message: "잠시만 기다려 주세요.",
    });

    const action =
      authMode === "signin"
        ? supabase.auth.signInWithPassword({ email: trimmedEmail, password })
        : supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
              emailRedirectTo: getAuthRedirectUrl(),
            },
          });

    const { data, error } = await action;
    if (error) {
      const mapped = toKoreanAuthMessage(error.message);
      setAuthFeedback({
        status: "error",
        title: mapped.title,
        message: mapped.message,
      });
      return;
    }

    if (authMode === "signup") {
      if (data.session) {
        setAuthFeedback({
          status: "signedIn",
          title: "가입과 로그인이 완료되었습니다",
          message: "바로 오늘 기록을 남길 수 있습니다.",
        });
        return;
      }

      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setAuthFeedback({
          status: "error",
          title: "이미 가입된 이메일일 수 있어",
          message: "로그인으로 전환해 다시 시도해 주세요.",
        });
        return;
      }

      setPendingSignupEmail(trimmedEmail);
      setAuthFeedback({
        status: "sent",
        title: "인증 메일을 보냈습니다",
        message: "메일함에서 인증 링크를 누른 뒤 로그인해 주세요.",
      });
      return;
    }

    setAuthFeedback({
      status: "signedIn",
      title: "로그인되었습니다",
      message: "오늘 기록을 남겨보세요.",
    });
  }

  async function handleResendSignupEmail() {
    if (!supabase) return;
    const targetEmail = pendingSignupEmail || email.trim();

    if (!targetEmail) {
      setAuthFeedback({
        status: "error",
        title: "이메일을 입력해 주세요",
        message: "다시 보낼 주소가 필요합니다.",
      });
      return;
    }

    setAuthFeedback({
      status: "loading",
      title: "메일 다시 보내는 중",
      message: "잠시만 기다려 주세요.",
    });

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      const mapped = toKoreanAuthMessage(error.message);
      setAuthFeedback({
        status: "error",
        title: mapped.title,
        message: mapped.message,
      });
      return;
    }

    setPendingSignupEmail(targetEmail);
    setAuthFeedback({
      status: "sent",
      title: "인증 메일을 다시 보냈습니다",
      message: "스팸함이나 프로모션함도 함께 확인해 주세요.",
    });
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setRecords([]);
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveToast(null);
    const prepared = normalizeRecord({
      ...draft,
      updatedAt: new Date().toISOString(),
    });

    if (supabase && session) {
      const { error } = await supabase.from("daily_records").upsert(
        {
          user_id: session.user.id,
          record_date: prepared.date,
          payload: prepared,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,record_date" },
      );

      if (error) {
        setSaveState("error");
        setStatus("저장하지 못했어요. 다시 시도해 주세요.");
        setSaveToast({ tone: "error", message: "저장하지 못했어요. 다시 시도해 주세요." });
        window.setTimeout(() => setSaveState("idle"), 1800);
        window.setTimeout(() => setSaveToast(null), 2800);
        return;
      }
    }

    const nextRecords = sortRecords([
      prepared,
      ...records.filter((record) => record.date !== prepared.date),
    ]);
    setRecords(nextRecords);
    if (!supabase) window.localStorage.setItem(demoStorageKey, JSON.stringify(nextRecords));
    setDraft(prepared);
    setSaveState("saved");
    setSaveToast({ tone: "success", message: "오늘 기록을 저장했어요" });
    setStatus(prepared.meals.praise || "기록을 저장했어요");
    window.setTimeout(() => setSaveState("idle"), 1800);
    window.setTimeout(() => setSaveToast(null), 2800);
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8fb] text-slate-600">
        <motion.div
          animate={{ scale: [1, 1.04, 1], opacity: [0.72, 1, 0.72] }}
          transition={{ duration: 1.1, repeat: Infinity }}
          className="rounded-full bg-white px-5 py-3 text-sm shadow-sm ring-1 ring-slate-200"
        >
          불러오는 중
        </motion.div>
      </main>
    );
  }

  const isSignedIn = demoMode || Boolean(session);

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: -6, scale: 1.05 }}
              className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm"
            >
              <ListChecks size={20} />
            </motion.div>
            <div>
              <p className="text-sm font-semibold leading-5">행동 트래커</p>
              <p className="text-xs text-slate-500">오늘을 짧게 남기는 앱</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {demoMode ? (
              <span className="hidden rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100 sm:inline-flex">
                임시 저장
              </span>
            ) : (
              session && (
                <button
                  onClick={handleSignOut}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut size={16} />
                  로그아웃
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="min-w-0">
          {!isSignedIn ? (
            <AuthPanel
              authMode={authMode}
              email={email}
              password={password}
              feedback={authFeedback}
              pendingEmail={pendingSignupEmail}
              onModeChange={setAuthMode}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleAuthSubmit}
              onResend={handleResendSignupEmail}
            />
          ) : (
            <div className="space-y-4">
              <Tabs active={tab} onChange={setTab} />
              <AnimatePresence mode="wait">
                {tab === "today" && (
                  <motion.div
                    key="today"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22 }}
                  >
                    <TodayForm
                      draft={draft}
                      saveState={saveState}
                      saveToast={saveToast}
                      onDraftChange={updateDraft}
                      onSave={handleSave}
                    />
                  </motion.div>
                )}
                {tab === "records" && (
                  <motion.div
                    key="records"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22 }}
                  >
                    <RecordsList
                      records={records}
                      onEdit={(record) => {
                        setDraft(record);
                        setTab("today");
                      }}
                    />
                  </motion.div>
                )}
                {tab === "summary" && (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22 }}
                  >
                    <MonthlySummaryPanel month={currentMonth} summary={summary} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <SidePanel
            status={status}
            draft={draft}
            recordCount={records.length}
            summary={summary}
            demoMode={demoMode}
          />
        </aside>
      </main>
    </div>
  );
}

function AuthPanel({
  authMode,
  email,
  password,
  feedback,
  pendingEmail,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onResend,
}: {
  authMode: "signin" | "signup";
  email: string;
  password: string;
  feedback: AuthFeedback;
  pendingEmail: string;
  onModeChange: (mode: "signin" | "signup") => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
}) {
  const isLoading = feedback.status === "loading";
  const isSignup = authMode === "signup";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200"
    >
      <div className="border-b border-slate-100 p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <motion.div
            animate={isLoading ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 0.8, repeat: isLoading ? Infinity : 0 }}
            className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"
          >
            {isSignup ? <Mail size={22} /> : <LogIn size={22} />}
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {isSignup ? "회원가입" : "로그인"}
            </h1>
            <p className="text-sm text-slate-500">
              {isSignup ? "메일 인증 후 실제 웹사이트로 이동합니다" : "모바일과 PC 기록을 같이 봐요"}
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <SegmentButton active={authMode === "signin"} onClick={() => onModeChange("signin")}>
            로그인
          </SegmentButton>
          <SegmentButton active={authMode === "signup"} onClick={() => onModeChange("signup")}>
            가입
          </SegmentButton>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <TextInput
            label="이메일"
            type="email"
            value={email}
            onChange={onEmailChange}
            placeholder="you@example.com"
          />
          <TextInput
            label="비밀번호"
            type="password"
            value={password}
            onChange={onPasswordChange}
            placeholder="8자 이상"
          />
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
            className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? (
              <RefreshCw className="animate-spin" size={18} />
            ) : isSignup ? (
              <Mail size={18} />
            ) : (
              <LogIn size={18} />
            )}
            {isLoading ? "처리 중" : authMode === "signin" ? "로그인하기" : "인증 메일 받기"}
          </motion.button>
        </form>
      </div>

      <AnimatePresence mode="wait">
        {feedback.status !== "idle" && (
          <AuthFeedbackPanel
            key={`${feedback.status}-${feedback.title}`}
            feedback={feedback}
            email={pendingEmail || email}
            onResend={onResend}
            onSwitchToSignin={() => onModeChange("signin")}
          />
        )}
      </AnimatePresence>

      <div className="grid gap-3 bg-slate-50 p-5 text-sm text-slate-600 sm:p-6">
        <div className="flex gap-3">
          <Clock className="mt-0.5 shrink-0 text-slate-400" size={17} />
          <p>인증 메일은 보통 1분 안에 도착합니다. 보이지 않으면 스팸함과 프로모션함도 확인해 주세요.</p>
        </div>
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 shrink-0 text-slate-400" size={17} />
          <p>인증 링크를 누르면 실제 웹사이트로 이동합니다. 계속 오지 않으면 이메일 주소 오타를 확인해 주세요.</p>
        </div>
      </div>
    </motion.div>
  );
}

function AuthFeedbackPanel({
  feedback,
  email,
  onResend,
  onSwitchToSignin,
}: {
  feedback: AuthFeedback;
  email: string;
  onResend: () => void;
  onSwitchToSignin: () => void;
}) {
  const isSent = feedback.status === "sent";
  const isError = feedback.status === "error";
  const isLoading = feedback.status === "loading";
  const Icon = isSent ? CheckCircle2 : isError ? AlertCircle : isLoading ? RefreshCw : Check;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
      className={`m-5 rounded-3xl p-4 sm:m-6 ${
        isError
          ? "bg-red-50 text-red-800 ring-1 ring-red-100"
          : isSent
            ? "bg-blue-50 text-blue-900 ring-1 ring-blue-100"
            : "bg-slate-50 text-slate-800 ring-1 ring-slate-100"
      }`}
    >
      <div className="flex gap-3">
        <motion.span
          animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 0.9, repeat: isLoading ? Infinity : 0, ease: "linear" }}
          className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/80"
        >
          <Icon size={20} />
        </motion.span>
        <div className="min-w-0">
          <h2 className="font-bold">{feedback.title}</h2>
          <p className="mt-1 text-sm leading-6 opacity-85">{feedback.message}</p>
          {isSent && (
            <p className="mt-2 truncate rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold">
              {email}
            </p>
          )}
        </div>
      </div>

      {isSent && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onResend}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-blue-800 shadow-sm transition hover:bg-blue-100"
          >
            <RefreshCw size={16} />
            다시 보내기
          </button>
          <button
            type="button"
            onClick={onSwitchToSignin}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            인증 후 로그인
          </button>
        </div>
      )}
    </motion.div>
  );
}

function Tabs({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  const tabs = [
    { key: "today" as const, label: "오늘", icon: CalendarDays },
    { key: "records" as const, label: "기록", icon: ListChecks },
    { key: "summary" as const, label: "요약", icon: BarChart3 },
  ];

  return (
    <nav className="grid grid-cols-3 gap-2 rounded-[24px] bg-white p-2 shadow-sm ring-1 ring-slate-200">
      {tabs.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`relative flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition ${
              active === item.key ? "text-white" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {active === item.key && (
              <motion.span
                layoutId="active-tab"
                className="absolute inset-0 rounded-2xl bg-slate-950"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <Icon className="relative" size={17} />
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function TodayForm({
  draft,
  saveState,
  saveToast,
  onDraftChange,
  onSave,
}: {
  draft: DailyRecord;
  saveState: SaveState;
  saveToast: { tone: "success" | "error"; message: string } | null;
  onDraftChange: (updater: (record: DailyRecord) => DailyRecord) => void;
  onSave: () => void;
}) {
  const isSaving = saveState === "saving";
  const saveLabel = isSaving
    ? "저장 중이에요"
    : saveState === "saved"
      ? "저장됐어요"
      : saveState === "error"
        ? "다시 시도해 주세요"
        : "저장하기";

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <TextInput
            label="날짜"
            type="date"
            value={draft.date}
            onChange={(value) =>
              onDraftChange((record) => ({
                ...record,
                date: value,
              }))
            }
          />
          <TextInput
            label="기분"
            value={draft.mood}
            onChange={(value) =>
              onDraftChange((record) => ({
                ...record,
                mood: value,
              }))
            }
            placeholder="보통, 좋음, 피곤함"
          />
        </div>
      </section>

      <RecordSection
        title="몸무게"
        icon={<Weight size={19} />}
        tone={accentColors.weight}
        question="몸무게를 쟀나요?"
        done={draft.weight.done}
        onDoneChange={(done) =>
          onDraftChange((record) => ({
            ...record,
            weight: { ...record.weight, done },
          }))
        }
      >
        <TextInput
          label="몸무게"
          type="number"
          value={draft.weight.value}
          onChange={(value) =>
            onDraftChange((record) => ({
              ...record,
              weight: { ...record.weight, value },
            }))
          }
          suffix="kg"
          placeholder="86.8"
        />
      </RecordSection>

      <RecordSection
        title="식단"
        icon={<Utensils size={19} />}
        tone={accentColors.meals}
        question="식단을 기록할까요?"
        done={draft.meals.done}
        onDoneChange={(done) =>
          onDraftChange((record) => ({
            ...record,
            meals: { ...record.meals, done },
          }))
        }
      >
        <div className="space-y-3">
          {mealKeys.map((key) => (
            <div key={key} className="grid gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-[220px_1fr]">
              <MealChoice
                label={mealLabels[key]}
                eaten={draft.meals.items[key].checked}
                onChange={(checked) =>
                  onDraftChange((record) => ({
                    ...record,
                    meals: {
                      ...record.meals,
                      items: {
                        ...record.meals.items,
                        [key]: {
                          ...record.meals.items[key],
                          checked,
                          food: checked ? record.meals.items[key].food : "",
                        },
                      },
                    },
                  }))
                }
              />
              <AnimatePresence initial={false}>
                {draft.meals.items[key].checked ? (
                  <motion.input
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 44 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    value={draft.meals.items[key].food}
                    onChange={(event) =>
                      onDraftChange((record) => ({
                        ...record,
                        meals: {
                          ...record.meals,
                          items: {
                            ...record.meals.items,
                            [key]: { ...record.meals.items[key], food: event.target.value },
                          },
                        },
                      }))
                    }
                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
                    placeholder={`${mealLabels[key]}에 먹은 음식`}
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 44 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center rounded-xl border border-dashed border-slate-200 px-3 text-sm font-medium text-slate-400"
                  >
                    안 먹은 것으로 기록됩니다
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          <motion.div
            key={draft.meals.praise}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <span className="font-semibold">{draft.meals.praise || "기록 습관은 아주 좋아요"}</span>
            <span>{draft.meals.score}점</span>
          </motion.div>
        </div>
      </RecordSection>

      <RecordSection
        title="운동"
        icon={<Dumbbell size={19} />}
        tone={accentColors.exercise}
        question="운동을 했나요?"
        done={draft.exercise.done}
        onDoneChange={(done) =>
          onDraftChange((record) => ({
            ...record,
            exercise: { ...record.exercise, done },
          }))
        }
      >
        <div className="space-y-3">
          {draft.exercise.items.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              className="rounded-2xl bg-slate-50 p-3"
            >
              <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
                <input
                  value={item.name}
                  onChange={(event) =>
                    onDraftChange((record) => ({
                      ...record,
                      exercise: {
                        ...record.exercise,
                        items: record.exercise.items.map((next) =>
                          next.id === item.id ? { ...next, name: event.target.value } : next,
                        ),
                      },
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="운동 이름"
                />
                <input
                  value={item.minutes}
                  onChange={(event) =>
                    onDraftChange((record) => ({
                      ...record,
                      exercise: {
                        ...record.exercise,
                        items: record.exercise.items.map((next) =>
                          next.id === item.id ? { ...next, minutes: event.target.value } : next,
                        ),
                      },
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="분"
                  inputMode="numeric"
                />
                <input
                  value={item.count}
                  onChange={(event) =>
                    onDraftChange((record) => ({
                      ...record,
                      exercise: {
                        ...record.exercise,
                        items: record.exercise.items.map((next) =>
                          next.id === item.id ? { ...next, count: event.target.value } : next,
                        ),
                      },
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="회"
                  inputMode="numeric"
                />
                <input
                  value={item.sets}
                  onChange={(event) =>
                    onDraftChange((record) => ({
                      ...record,
                      exercise: {
                        ...record.exercise,
                        items: record.exercise.items.map((next) =>
                          next.id === item.id ? { ...next, sets: event.target.value } : next,
                        ),
                      },
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="세트"
                />
                <button
                  onClick={() =>
                    onDraftChange((record) => ({
                      ...record,
                      exercise: {
                        ...record.exercise,
                        items:
                          record.exercise.items.length === 1
                            ? record.exercise.items
                            : record.exercise.items.filter((next) => next.id !== item.id),
                      },
                    }))
                  }
                  className="grid size-11 place-items-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200 transition hover:text-red-500"
                  aria-label={`${index + 1}번째 운동 삭제`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </motion.div>
          ))}
          <button
            onClick={() =>
              onDraftChange((record) => ({
                ...record,
                exercise: {
                  ...record.exercise,
                  items: [...record.exercise.items, createEmptyExerciseItem()],
                },
              }))
            }
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-50 px-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            <Plus size={17} />
            운동 추가
          </button>
        </div>
      </RecordSection>

      <RecordSection
        title="공부"
        icon={<Activity size={19} />}
        tone={accentColors.study}
        question="공부를 했나요?"
        done={draft.study.done}
        onDoneChange={(done) =>
          onDraftChange((record) => ({
            ...record,
            study: { ...record.study, done },
          }))
        }
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <TextInput
            label="공부한 것"
            value={draft.study.subject}
            onChange={(value) =>
              onDraftChange((record) => ({
                ...record,
                study: { ...record.study, subject: value },
              }))
            }
            placeholder="중국어, 취준"
          />
          <TextInput
            label="공부 시간"
            value={draft.study.minutes}
            onChange={(value) =>
              onDraftChange((record) => ({
                ...record,
                study: { ...record.study, minutes: value },
              }))
            }
            suffix="분"
          />
        </div>
        <Textarea
          label="메모"
          value={draft.study.note}
          onChange={(value) =>
            onDraftChange((record) => ({
              ...record,
              study: { ...record.study, note: value },
            }))
          }
          placeholder="단어 복습, 이력서 문장 정리"
        />
      </RecordSection>

      <RecordSection
        title="시쓰기"
        icon={<PenLine size={19} />}
        tone={accentColors.poetry}
        question="시쓰기를 했나요?"
        done={draft.poetry.done}
        onDoneChange={(done) =>
          onDraftChange((record) => ({
            ...record,
            poetry: { ...record.poetry, done },
          }))
        }
      >
        <TextInput
          label="시 제목"
          value={draft.poetry.title}
          onChange={(value) =>
            onDraftChange((record) => ({
              ...record,
              poetry: { ...record.poetry, title: value },
            }))
          }
        />
        <Textarea
          label="본문"
          value={draft.poetry.body}
          onChange={(value) =>
            onDraftChange((record) => ({
              ...record,
              poetry: { ...record.poetry, body: value },
            }))
          }
          placeholder="초안이나 일부 문장"
        />
        <TextInput
          label="링크"
          value={draft.poetry.link}
          onChange={(value) =>
            onDraftChange((record) => ({
              ...record,
              poetry: { ...record.poetry, link: value },
            }))
          }
          placeholder="구글 독스 링크"
        />
      </RecordSection>

      <RecordSection
        title="책읽기"
        icon={<BookOpen size={19} />}
        tone={accentColors.reading}
        question="책읽기를 했나요?"
        done={draft.reading.done}
        onDoneChange={(done) =>
          onDraftChange((record) => ({
            ...record,
            reading: { ...record.reading, done },
          }))
        }
      >
        <TextInput
          label="책 제목"
          value={draft.reading.bookTitle}
          onChange={(value) =>
            onDraftChange((record) => ({
              ...record,
              reading: { ...record.reading, bookTitle: value },
            }))
          }
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <TextInput
            label="시작"
            value={draft.reading.startPage}
            onChange={(value) =>
              onDraftChange((record) => ({
                ...record,
                reading: { ...record.reading, startPage: value },
              }))
            }
            suffix="쪽"
          />
          <TextInput
            label="끝"
            value={draft.reading.endPage}
            onChange={(value) =>
              onDraftChange((record) => ({
                ...record,
                reading: { ...record.reading, endPage: value },
              }))
            }
            suffix="쪽"
          />
          <TextInput
            label="총 페이지"
            value={draft.reading.totalPages}
            onChange={(value) =>
              onDraftChange((record) => ({
                ...record,
                reading: { ...record.reading, totalPages: value },
              }))
            }
            suffix="쪽"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricPill label="읽은 쪽수" value={`${draft.reading.pagesRead}쪽`} />
          <MetricPill label="진행률" value={`${draft.reading.progress}%`} />
        </div>
        <Textarea
          label="메모"
          value={draft.reading.note}
          onChange={(value) =>
            onDraftChange((record) => ({
              ...record,
              reading: { ...record.reading, note: value },
            }))
          }
          placeholder="인상 깊은 부분"
        />
      </RecordSection>

      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="space-y-3">
          <Textarea
            label="기타"
            value={draft.extraNote}
            onChange={(value) =>
              onDraftChange((record) => ({
                ...record,
                extraNote: value,
              }))
            }
            placeholder="산책, 청소, 병원, 친구 만남"
          />
          <Textarea
            label="오늘의 한 줄"
            value={draft.dailyNote}
            onChange={(value) =>
              onDraftChange((record) => ({
                ...record,
                dailyNote: value,
              }))
            }
            placeholder="하루를 짧게 남기기"
          />
        </div>
      </section>

      <div className="sticky bottom-4 z-20 space-y-3">
        <AnimatePresence>
          {saveToast && (
            <motion.div
              key={saveToast.message}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className={`mx-auto flex w-fit max-w-full items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-lg ring-1 ${
                saveToast.tone === "success"
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
                  : "bg-red-50 text-red-800 ring-red-100"
              }`}
            >
              {saveToast.tone === "success" ? (
                <CheckCircle2 size={17} />
              ) : (
                <AlertCircle size={17} />
              )}
              {saveToast.message}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onSave}
          disabled={isSaving}
          animate={saveState === "saved" ? { scale: [1, 1.015, 1] } : { scale: 1 }}
          transition={{ duration: 0.28 }}
          className={`inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold text-white shadow-xl shadow-slate-300/40 transition ${
            saveState === "saved"
              ? "bg-emerald-600 hover:bg-emerald-600"
              : saveState === "error"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-slate-950 hover:bg-slate-800"
          } disabled:cursor-not-allowed disabled:bg-slate-500`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={saveState}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="inline-flex items-center gap-2"
            >
              {isSaving ? (
                <RefreshCw className="animate-spin" size={20} />
              ) : saveState === "saved" ? (
                <CheckCircle2 size={20} />
              ) : saveState === "error" ? (
                <AlertCircle size={20} />
              ) : (
                <Save size={20} />
              )}
              {saveLabel}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}

function RecordSection({
  title,
  icon,
  tone,
  question,
  done,
  onDoneChange,
  children,
}: {
  title: string;
  icon: ReactNode;
  tone: string;
  question: string;
  done: boolean;
  onDoneChange: (done: boolean) => void;
  children: ReactNode;
}) {
  return (
    <motion.section
      layout
      className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`grid size-10 place-items-center rounded-2xl ring-1 ${tone}`}>
            {icon}
          </span>
          <div>
            <h2 className="text-base font-bold">{title}</h2>
            <p className="text-sm text-slate-500">{question}</p>
          </div>
        </div>
        <YesNo value={done} onChange={onDoneChange} />
      </div>
      <AnimatePresence initial={false}>
        {done && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.24 }}
            className="space-y-3 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function RecordsList({
  records,
  onEdit,
}: {
  records: DailyRecord[];
  onEdit: (record: DailyRecord) => void;
}) {
  if (records.length === 0) {
    return (
      <section className="rounded-[28px] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="font-semibold">아직 기록이 없어요</p>
        <p className="mt-1 text-sm text-slate-500">오늘 기록을 저장하면 여기에 쌓입니다.</p>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record, index) => (
        <motion.article
          key={record.date}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: index * 0.03 }}
          className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">{record.date}</p>
              <h3 className="mt-1 text-lg font-bold">{record.dailyNote || record.mood}</h3>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                {record.weight.done && <Badge>몸무게 {record.weight.value}kg</Badge>}
                {record.meals.done && <Badge>{record.meals.praise}</Badge>}
                {record.exercise.done && <Badge>운동 {record.exercise.items.length}개</Badge>}
                {record.study.done && <Badge>공부 {record.study.minutes}분</Badge>}
                {record.poetry.done && <Badge>시쓰기</Badge>}
                {record.reading.done && <Badge>독서 {record.reading.pagesRead}쪽</Badge>}
              </div>
            </div>
            <button
              onClick={() => onEdit(record)}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              수정
            </button>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

function MonthlySummaryPanel({ month, summary }: { month: string; summary: ReturnType<typeof summarizeMonth> }) {
  const items = [
    { label: "기록일", value: `${summary.recordDays}일` },
    { label: "최근 몸무게", value: summary.latestWeight ? `${summary.latestWeight}kg` : "-" },
    {
      label: "몸무게 변화",
      value: summary.weightChange === null ? "-" : `${summary.weightChange > 0 ? "+" : ""}${summary.weightChange}kg`,
    },
    { label: "운동 시간", value: `${summary.exerciseMinutes}분` },
    { label: "운동 횟수", value: `${summary.exerciseCount}회` },
    { label: "공부 시간", value: `${summary.studyMinutes}분` },
    { label: "독서량", value: `${summary.readingPages}쪽` },
    { label: "시쓴 날", value: `${summary.poetryDays}일` },
    { label: "식단 평균", value: `${summary.averageMealScore}점` },
  ];

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{month}</p>
          <h2 className="text-xl font-bold">월간 요약</h2>
        </div>
        <span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <BarChart3 size={21} />
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.025 }}
            className="rounded-2xl bg-slate-50 p-4"
          >
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-black tracking-tight">{item.value}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function SidePanel({
  status,
  draft,
  recordCount,
  summary,
  demoMode,
}: {
  status: string;
  draft: DailyRecord;
  recordCount: number;
  summary: ReturnType<typeof summarizeMonth>;
  demoMode: boolean;
}) {
  return (
    <>
      <motion.section
        key={status || draft.meals.praise}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[28px] bg-slate-950 p-5 text-white shadow-sm"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-white/10">
            <Sparkles size={19} />
          </span>
          <div>
            <p className="text-sm text-white/60">오늘 피드백</p>
            <h2 className="text-lg font-bold">{status || draft.meals.praise || "기록부터 한 걸음 시작해 보아요"}</h2>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="기록" value={`${recordCount}`} />
          <MiniStat label="식단" value={`${draft.meals.score}`} />
          <MiniStat label="독서" value={`${draft.reading.pagesRead}`} />
        </div>
      </motion.section>

      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-bold">이번 달</h2>
        <div className="mt-4 space-y-3">
          <CompactRow label="기록일" value={`${summary.recordDays}일`} />
          <CompactRow label="운동" value={`${summary.exerciseMinutes}분 / ${summary.exerciseCount}회`} />
          <CompactRow label="공부" value={`${summary.studyMinutes}분`} />
          <CompactRow label="독서" value={`${summary.readingPages}쪽`} />
        </div>
      </section>

      {demoMode && (
        <section className="rounded-[24px] bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100">
          <p className="font-bold">Supabase 연결 전</p>
          <p className="mt-1 leading-6">지금은 이 브라우저에만 임시 저장됩니다.</p>
        </section>
      )}
    </>
  );
}

function YesNo({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 sm:w-36">
      <SegmentButton active={value} onClick={() => onChange(true)}>
        예
      </SegmentButton>
      <SegmentButton active={!value} onClick={() => onChange(false)}>
        아니오
      </SegmentButton>
    </div>
  );
}

function MealChoice({
  label,
  eaten,
  onChange,
}: {
  label: string;
  eaten: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[52px_1fr] sm:items-center">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-200">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`inline-flex h-10 items-center justify-center gap-1 rounded-xl text-sm font-bold transition ${
            eaten ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
          }`}
          aria-pressed={eaten}
          aria-label={`${label} 먹음`}
        >
          <Check size={15} />
          먹음
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`inline-flex h-10 items-center justify-center gap-1 rounded-xl text-sm font-bold transition ${
            !eaten ? "bg-slate-100 text-slate-950 shadow-sm" : "text-slate-500 hover:bg-slate-50"
          }`}
          aria-pressed={!eaten}
          aria-label={`${label} 안 먹음`}
        >
          <X size={15} />
          안 먹음
        </button>
      </div>
    </div>
  );
}

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-xl text-sm font-bold transition ${
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <span className="flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-3 transition focus-within:border-slate-400">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        {suffix && <span className="pl-2 text-sm font-semibold text-slate-400">{suffix}</span>}
      </span>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
      />
    </label>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-cyan-800">
      <p className="text-xs font-bold">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{children}</span>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3">
      <p className="text-xs text-white/55">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function CompactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
