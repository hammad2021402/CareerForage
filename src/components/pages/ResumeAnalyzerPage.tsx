import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Building2,
  Briefcase,
  Sparkles,
  FileCheck,
  Upload,
  Copy,
  Check,
  Award,
  TrendingUp,
  Brain,
  ListTodo,
  Download,
  Target,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { careerApi, type ResumeReviewFeedback, type TailoredResume } from '@/services/api';
import { useUser } from '@/context/UserContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { AppPageLayout } from '@/components/layout/AppPageLayout';
import { PageHero, GlassCard, EmptyState, Input, Textarea } from '@/components/ui';

/* ─────────────────────────────────────────────────────────────
   Score colour helpers
───────────────────────────────────────────────────────────── */
function scoreColor(s: number) {
  if (s >= 75) return '#22c55e';
  if (s >= 50) return '#f59e0b';
  return '#ef4444';
}
function scoreLabel(s: number) {
  if (s >= 75) return 'Strong';
  if (s >= 50) return 'Average';
  return 'Weak';
}
function scoreBadgeClass(s: number) {
  if (s >= 75) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (s >= 50) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20';
}

/* ─────────────────────────────────────────────────────────────
   Sub-component: Score Breakdown Bar
───────────────────────────────────────────────────────────── */
function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = scoreColor(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sub-component: ATS Score Ring
───────────────────────────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = circ - (score / 100) * circ;
  const color = scoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={130} height={130} className="-rotate-90">
        <circle cx={65} cy={65} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={8} />
        <motion.circle
          cx={65} cy={65} r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: dash }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black text-[var(--text-primary)]">{score}%</span>
        <span
          className="text-[10px] font-bold uppercase tracking-wider mt-0.5"
          style={{ color }}
        >
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */
export default function ResumeAnalyzerPage() {
  const { token, user } = useUser();
  const [activeTab, setActiveTab] = useState<'analyze' | 'rebuild'>('analyze');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inputs
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Results
  const [analysisResult, setAnalysisResult] = useState<ResumeReviewFeedback | null>(null);
  const [rebuildResult, setRebuildResult] = useState<ResumeReviewFeedback | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Copy helper ── */
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* ── Build full tailored resume text for download ── */
  const buildDownloadText = (r: ResumeReviewFeedback): string => {
    const tr = r.tailored_resume as TailoredResume | null | undefined;
    if (!tr) return r.summary || '';
    const candidateName = tr.candidate_name || user?.full_name || 'Resume';
    let out = `${candidateName}\n${'═'.repeat(50)}\n${targetRole || 'Software Engineer'}\n\n`;
    if (tr.professional_summary) {
      out += `PROFESSIONAL SUMMARY\n${'─'.repeat(40)}\n${tr.professional_summary}\n\n`;
    }
    if (tr.skills?.length) {
      out += `SKILLS\n${'─'.repeat(40)}\n${tr.skills.join(' • ')}\n\n`;
    }
    if (tr.experience_bullets?.length) {
      out += `EXPERIENCE HIGHLIGHTS\n${'─'.repeat(40)}\n${tr.experience_bullets.map(b => `• ${b}`).join('\n')}\n\n`;
    }
    if (tr.projects?.length) {
      out += `PROJECTS\n${'─'.repeat(40)}\n${tr.projects.map(p => `• ${p}`).join('\n')}\n`;
    }
    return out;
  };

  const downloadAsPDF = (r: ResumeReviewFeedback) => {
    const tr = r.tailored_resume as TailoredResume | null | undefined;
    if (!tr) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked! Please allow popups to generate PDF.');
      return;
    }

    const candidateName = tr.candidate_name || user?.full_name || 'Resume';
    const companyLine = targetCompany ? ` | Targeting: ${targetCompany}` : '';

    const skillsHtml = tr.skills?.length
      ? `<div class="section">
          <h2>SKILLS</h2>
          <div class="skills-list">${tr.skills.join(' &bull; ')}</div>
         </div>`
      : '';

    const experienceHtml = tr.experience_bullets?.length
      ? `<div class="section">
          <h2>PROFESSIONAL EXPERIENCE</h2>
          <ul>
            ${tr.experience_bullets.map(bullet => `<li>${bullet}</li>`).join('')}
          </ul>
         </div>`
      : '';

    const projectsHtml = tr.projects?.length
      ? `<div class="section">
          <h2>PROJECTS</h2>
          <ul>
            ${tr.projects.map(project => `<li>${project}</li>`).join('')}
          </ul>
         </div>`
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Tailored Resume - ${candidateName} - ${targetRole || 'Resume'}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #333;
              line-height: 1.5;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              font-size: 26px;
              margin-bottom: 5px;
              text-transform: uppercase;
              text-align: center;
              letter-spacing: 1px;
            }
            .subtitle {
              text-align: center;
              font-size: 13px;
              color: #555;
              margin-bottom: 4px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .company-tag {
              text-align: center;
              font-size: 11px;
              color: #888;
              margin-bottom: 28px;
            }
            .section {
              margin-bottom: 25px;
            }
            h2 {
              font-size: 16px;
              border-bottom: 2px solid #333;
              padding-bottom: 5px;
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            p {
              font-size: 14px;
              margin: 0 0 10px 0;
              text-align: justify;
            }
            .skills-list {
              font-size: 14px;
            }
            ul {
              margin: 0;
              padding-left: 20px;
            }
            li {
              font-size: 14px;
              margin-bottom: 6px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${candidateName}</h1>
          <div class="subtitle">${targetRole || 'Software Engineer'}</div>
          ${companyLine ? `<div class="company-tag">${companyLine}</div>` : '<div style="margin-bottom:28px"></div>'}
          
          <div class="section">
            <h2>PROFESSIONAL SUMMARY</h2>
            <p>${tr.professional_summary || ''}</p>
          </div>
          
          ${skillsHtml}
          ${experienceHtml}
          ${projectsHtml}
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadAsDOCX = (r: ResumeReviewFeedback) => {
    const tr = r.tailored_resume as TailoredResume | null | undefined;
    if (!tr) return;

    const candidateName = tr.candidate_name || user?.full_name || 'Resume';

    const skillsHtml = tr.skills?.length
      ? `<h2>SKILLS</h2>
         <p>${tr.skills.join(' • ')}</p>`
      : '';

    const experienceHtml = tr.experience_bullets?.length
      ? `<h2>PROFESSIONAL EXPERIENCE</h2>
         <ul>
           ${tr.experience_bullets.map(bullet => `<li>${bullet}</li>`).join('')}
         </ul>`
      : '';

    const projectsHtml = tr.projects?.length
      ? `<h2>PROJECTS</h2>
         <ul>
           ${tr.projects.map(project => `<li>${project}</li>`).join('')}
         </ul>`
      : '';

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>Tailored Resume - ${candidateName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.4; }
            h1 { text-align: center; font-size: 24pt; margin-bottom: 2pt; }
            .subtitle { text-align: center; font-size: 12pt; color: #555555; margin-bottom: 4pt; text-transform: uppercase; }
            .company-tag { text-align: center; font-size: 10pt; color: #888888; margin-bottom: 20pt; }
            h2 { font-size: 14pt; border-bottom: 1px solid #000000; padding-bottom: 3pt; margin-top: 18pt; margin-bottom: 6pt; text-transform: uppercase; }
            p { font-size: 11pt; margin-bottom: 6pt; }
            ul { margin-top: 0; margin-bottom: 6pt; }
            li { font-size: 11pt; margin-bottom: 3pt; }
          </style>
        </head>
        <body>
          <h1>${candidateName}</h1>
          <div class="subtitle">${targetRole || 'Software Engineer'}</div>
          ${targetCompany ? `<div class="company-tag">Targeting: ${targetCompany}</div>` : ''}
          
          <h2>PROFESSIONAL SUMMARY</h2>
          <p>${tr.professional_summary || ''}</p>
          
          ${skillsHtml}
          ${experienceHtml}
          ${projectsHtml}
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tailored_resume_${candidateName.replace(/\s+/g, '_')}_${(targetRole || 'resume').replace(/\s+/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('DOCX Downloaded!');
  };

  /* ── File upload (PDF, DOCX, or TXT) ── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'txt') {
      // Plain text — read directly
      const reader = new FileReader();
      reader.onload = (ev) => {
        setResumeText(ev.target?.result as string);
        toast.success(`Loaded: ${file.name}`);
      };
      reader.readAsText(file);
    } else if (ext === 'pdf' || ext === 'docx') {
      // PDF or DOCX — convert to base64 and let backend extract text immediately
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const b64 = (ev.target?.result as string).split(',')[1];
        setLoading(true);
        try {
          const res = await careerApi.extractPdf(b64, ext, token || undefined);
          setResumeText(res.text);
          toast.success(`Successfully loaded ${res.length} characters from ${file.name}`);
        } catch (err: any) {
          console.error('[file-extraction]', err);
          toast.error(err.message || `Failed to extract text from ${ext.toUpperCase()}. Please paste manually.`);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Supported formats: .txt, .pdf, .docx');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Build request body ── */
  const buildPayload = (mode: 'analyze' | 'rebuild') => {
    return {
      resume: resumeText,
      role: targetRole || 'Software Engineer',
      company: targetCompany || undefined,
      requirements: jobDescription || undefined,
      mode,
    };
  };

  /* ── Analyze ── */
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim()) {
      toast.error('Please paste or upload your resume first');
      return;
    }
    setLoading(true);
    setAnalysisResult(null);
    try {
      const res = await careerApi.reviewResume(buildPayload('analyze'), token || undefined);
      setAnalysisResult(res);
      toast.success('Resume analyzed!');
    } catch (err: any) {
      console.error('[analyze]', err);
      toast.error(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  /* ── Rebuild ── */
  const handleRebuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim()) {
      toast.error('Please paste or upload your resume first');
      return;
    }
    if (!jobDescription.trim()) {
      toast.error('Please enter the job description / requirements');
      return;
    }
    setLoading(true);
    setRebuildResult(null);
    try {
      const res = await careerApi.reviewResume(buildPayload('rebuild'), token || undefined);
      setRebuildResult(res);
      toast.success('Resume tailored!');
    } catch (err: any) {
      console.error('[rebuild]', err);
      toast.error(err.message || 'Rebuild failed');
    } finally {
      setLoading(false);
    }
  };

  /* ── Result used for current tab ── */
  const currentResult = activeTab === 'analyze' ? analysisResult : rebuildResult;

  /* ─────────────────────────────────────────────────────────── */
  return (
    <AppPageLayout>
      <PageHero
        icon="📄"
        title="Resume Studio"
        description="Real ATS scoring powered by Gemini AI — upload your resume, target a role, and get instant results."
      />

      {/* Tab switcher */}
      <div className="flex border-b border-[var(--border-subtle)] mb-8 gap-6">
        {(['analyze', 'rebuild'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2',
              activeTab === tab
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            {tab === 'analyze' ? <FileCheck className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {tab === 'analyze' ? 'ATS Resume Analyzer' : 'AI Resume Rebuilder'}
          </button>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-12 gap-8 items-start relative z-10">

        {/* ── INPUT PANEL ── */}
        <div className="lg:col-span-5 space-y-5">
          <GlassCard className="p-6 relative overflow-hidden" glow>
            <div
              className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-20"
              style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
            />

            <h2 className="text-base font-bold text-[var(--text-primary)] mb-5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-400" />
              Resume Information
            </h2>

            <div className="space-y-4">
              {/* Upload zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group border border-dashed border-[var(--border)] hover:border-violet-500/40 rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all bg-[var(--surface-hover)] hover:bg-[var(--surface-card-hover)]"
              >
                <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-all">
                  <Upload className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {resumeText
                      ? `✅ ${resumeText.length} characters loaded`
                      : 'Upload Resume'}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    .pdf or .txt · Or paste text below
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Textarea */}
              <Textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Or paste the full text of your resume here..."
                className="h-52"
              />

              {/* Target Role */}
              <Input
                label="Target Role *"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Frontend Engineer, Data Scientist"
                leftIcon={<Briefcase className="w-4 h-4 text-[var(--text-muted)]" />}
              />

              {/* Target Company */}
              <Input
                label="Target Company"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Google, Deloitte, TCS, Razorpay"
                leftIcon={<Building2 className="w-4 h-4 text-[var(--text-muted)]" />}
              />

              {/* Rebuild-only: Job Description */}
              <AnimatePresence>
                {activeTab === 'rebuild' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <Textarea
                      label="Job Description / Requirements *"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste requirements, tech stack, role responsibilities..."
                      className="h-28"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <button
                onClick={activeTab === 'analyze' ? handleAnalyze : handleRebuild}
                disabled={loading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-950/20 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {activeTab === 'analyze' ? 'Analyzing…' : 'Rebuilding resume…'}
                  </>
                ) : activeTab === 'analyze' ? (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    Analyze ATS Score
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Tailored Resume
                  </>
                )}
              </button>

              {/* Differentiation note */}
              {activeTab === 'rebuild' && (
                <p className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed">
                  ✨ Resume content adapts significantly per role & company combination —
                  Frontend vs Backend vs Data will produce entirely different summaries, skills &amp; projects.
                </p>
              )}
            </div>
          </GlassCard>

          {/* Tips card */}
          <GlassCard className="p-4 bg-[var(--surface-hover)] border-[var(--border-subtle)]">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">💡 Pro Tips</p>
            <ul className="space-y-1.5">
              {[
                'Include the exact job title in your summary',
                'Match keywords verbatim from the job description',
                'Quantify every achievement with numbers',
                'Use one-page resume for ATS best results',
              ].map((tip, i) => (
                <li key={i} className="text-[11px] text-[var(--text-secondary)] flex items-start gap-1.5">
                  <span className="text-violet-500 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>

        {/* ── RESULTS PANEL ── */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">

            {currentResult ? (
              <motion.div
                key={activeTab + '-result'}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-5"
              >

                {/* ── Score Header Card ── */}
                <GlassCard className="p-6 relative overflow-hidden" glow>
                  <div
                    className="absolute inset-0 pointer-events-none opacity-10"
                    style={{ background: `radial-gradient(ellipse at top right, ${scoreColor(currentResult.ats_score || 0)}, transparent 60%)` }}
                  />
                  <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">

                    {/* Ring */}
                    <div className="flex-shrink-0">
                      <ScoreRing score={currentResult.ats_score || 0} />
                    </div>

                    {/* Right side */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-bold text-[var(--text-primary)]">
                            {activeTab === 'analyze' ? 'ATS Compatibility Score' : 'Predicted Match Score'}
                          </h3>
                          <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold border', scoreBadgeClass(currentResult.ats_score || 0))}>
                            {scoreLabel(currentResult.ats_score || 0)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {targetRole || 'Software Engineer'}
                          {(targetCompany && activeTab === 'rebuild') ? ` · ${targetCompany}` : ''}
                        </p>
                      </div>

                      {/* Keyword match % */}
                      {currentResult.keyword_match_pct !== undefined && (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${currentResult.keyword_match_pct}%` }}
                              transition={{ duration: 1 }}
                            />
                          </div>
                          <span className="text-xs text-[var(--text-secondary)] font-semibold whitespace-nowrap">
                            {currentResult.keyword_match_pct}% keyword match
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>

                {/* ── Score Breakdown ── */}
                {currentResult.score_breakdown && (
                  <GlassCard className="p-5">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] mb-4 uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-violet-400" />
                      Score Breakdown
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {(Object.entries(currentResult.score_breakdown) as [string, number][]).map(([cat, val]) => (
                        <ScoreBar key={cat} label={cat} value={val} />
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* ── Keyword Match / Missing Panel ── */}
                {(currentResult.matched_keywords?.length || currentResult.missing_keywords?.length) ? (
                  <div className="grid sm:grid-cols-2 gap-4">

                    {/* Matched */}
                    <div className="p-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/15">
                      <h4 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Matched Keywords ({currentResult.matched_keywords?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {currentResult.matched_keywords?.map((k, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
                          >
                            ✓ {k}
                          </span>
                        ))}
                        {!currentResult.matched_keywords?.length && (
                          <p className="text-[10px] text-[var(--text-muted)]">None found</p>
                        )}
                      </div>
                    </div>

                    {/* Missing */}
                    <div className="p-4 rounded-2xl bg-red-500/[0.04] border border-red-500/15">
                      <h4 className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        Missing Keywords ({currentResult.missing_keywords?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {currentResult.missing_keywords?.map((k, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-medium text-red-700 dark:text-red-300"
                          >
                            ✗ {k}
                          </span>
                        ))}
                        {!currentResult.missing_keywords?.length && (
                          <p className="text-[10px] text-[var(--text-muted)]">None missing 🎉</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* ── AI Summary ── */}
                {currentResult.summary && (
                  <GlassCard className="p-5">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-violet-400" />
                      AI Assessment
                    </h3>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{currentResult.summary}</p>
                  </GlassCard>
                )}

                {/* ── Strengths & Improvements ── */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <GlassCard className="p-5 border-emerald-500/10 hover:border-emerald-500/20">
                    <h4 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-3 uppercase tracking-widest flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {currentResult.highlights?.map((h, i) => (
                        <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2 leading-relaxed">
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">✔</span>
                          {h}
                        </li>
                      ))}
                      {!currentResult.highlights?.length && (
                        <p className="text-xs text-[var(--text-muted)]">No strengths identified</p>
                      )}
                    </ul>
                  </GlassCard>

                  {/* Improvements */}
                  <GlassCard className="p-5 border-violet-500/10 hover:border-violet-500/20">
                    <h4 className="text-[10px] font-bold text-violet-600 dark:text-violet-400 mb-3 uppercase tracking-widest flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Suggested Fixes
                    </h4>
                    <ul className="space-y-2">
                      {currentResult.improvements?.map((imp, i) => (
                        <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2 leading-relaxed">
                          <span className="text-violet-500 mt-0.5 flex-shrink-0">✦</span>
                          {imp}
                        </li>
                      ))}
                      {!currentResult.improvements?.length && (
                        <p className="text-xs text-[var(--text-muted)]">No improvements needed</p>
                      )}
                    </ul>
                  </GlassCard>
                </div>

                {/* ── All ATS Keywords ── */}
                {currentResult.keywords?.length ? (
                  <GlassCard className="p-5">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Target className="w-4 h-4 text-cyan-400" />
                      Critical ATS Keywords for This Role
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {currentResult.keywords.map((k, i) => {
                        const isMatched = currentResult.matched_keywords?.includes(k);
                        return (
                          <span
                            key={i}
                            onClick={() => copy(k, `kw-${i}`)}
                            className={cn(
                              'group px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all',
                              isMatched
                                ? 'bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-600 dark:text-emerald-300 hover:border-emerald-500/40'
                                : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-cyan-500/30 hover:text-[var(--text-primary)]'
                            )}
                          >
                            {isMatched && <span className="text-emerald-400 text-[9px]">✓</span>}
                            {k}
                            {copiedId === `kw-${i}` ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </GlassCard>
                ) : null}

                {/* ── TARGET INFO CARD (Rebuild mode) ── */}
                {activeTab === 'rebuild' && currentResult.tailored_resume && (
                  <GlassCard className="p-5 border-violet-500/25 bg-gradient-to-r from-violet-500/[0.04] to-cyan-500/[0.04] dark:from-violet-950/30 dark:to-cyan-950/20">
                    <p className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3">🎯 Resume Target Summary</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-[var(--surface-hover)] rounded-xl p-3 border border-[var(--border-subtle)]">
                        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Target Role</p>
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{targetRole || 'Not set'}</p>
                      </div>
                      <div className="bg-[var(--surface-hover)] rounded-xl p-3 border border-[var(--border-subtle)]">
                        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Company</p>
                        <p className="text-xs font-bold text-cyan-600 dark:text-cyan-300 truncate">{targetCompany || '—'}</p>
                      </div>
                      <div className="bg-[var(--surface-hover)] rounded-xl p-3 border border-[var(--border-subtle)]">
                        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-1">ATS Score</p>
                        <p className="text-sm font-black" style={{ color: scoreColor(currentResult.ats_score || 0) }}>
                          {currentResult.ats_score || 0}%
                        </p>
                      </div>
                      <div className="bg-[var(--surface-hover)] rounded-xl p-3 border border-[var(--border-subtle)]">
                        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Keywords</p>
                        <p className="text-xs font-bold">
                          <span className="text-emerald-600 dark:text-emerald-400">✓ {currentResult.matched_keywords?.length || 0}</span>
                          <span className="text-[var(--text-muted)] mx-1">/</span>
                          <span className="text-red-600 dark:text-red-400">✗ {currentResult.missing_keywords?.length || 0}</span>
                        </p>
                      </div>
                    </div>
                    {currentResult.tailored_resume?.candidate_name && (
                      <p className="mt-3 text-[10px] text-[var(--text-muted)]">
                        <span className="text-[var(--text-secondary)] font-semibold">Candidate:</span> {currentResult.tailored_resume.candidate_name}
                      </p>
                    )}
                  </GlassCard>
                )}

                {/* ── TAILORED RESUME (Rebuild mode) ── */}
                {activeTab === 'rebuild' && currentResult.tailored_resume && (
                  <GlassCard className="p-6 border-violet-500/20 bg-gradient-to-br from-violet-500/[0.03] to-cyan-500/[0.01] dark:from-violet-950/20 dark:to-cyan-950/10">
                    <div
                      className="absolute inset-0 pointer-events-none opacity-10"
                      style={{ background: 'radial-gradient(ellipse at top left, #8b5cf6, transparent 60%)' }}
                    />

                    <div className="relative">
                      {/* Header */}
                      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                        <div>
                          <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/20 dark:border-violet-500/30 text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider inline-block mb-1.5">
                            AI Tailored Resume
                          </span>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">
                            Optimized for {targetRole || 'Target Role'}
                            {targetCompany ? ` at ${targetCompany}` : ''}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => copy(buildDownloadText(currentResult), 'full-resume')}
                            className="h-8 px-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] hover:bg-[var(--surface-card-hover)] text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5 transition-all"
                          >
                            {copiedId === 'full-resume' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            Copy All
                          </button>
                          <button
                            onClick={() => downloadAsPDF(currentResult)}
                            className="h-8 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white flex items-center gap-1.5 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download PDF
                          </button>
                          <button
                            onClick={() => downloadAsDOCX(currentResult)}
                            className="h-8 px-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] hover:bg-[var(--surface-card-hover)] text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download DOCX
                          </button>
                        </div>
                      </div>

                      <div className="space-y-5">

                        {/* Professional Summary */}
                        {currentResult.tailored_resume.professional_summary && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-[10px] font-bold text-[var(--violet)] uppercase tracking-wider">Professional Summary</h4>
                              <button
                                onClick={() => copy(currentResult.tailored_resume!.professional_summary, 'ps')}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                {copiedId === 'ps' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            <p className="text-sm leading-relaxed text-[var(--text-secondary)] bg-[var(--surface-hover)] p-4 rounded-xl border border-[var(--border-subtle)]">
                              {currentResult.tailored_resume.professional_summary}
                            </p>
                          </div>
                        )}

                        {/* Skills */}
                        {currentResult.tailored_resume.skills?.length ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-[10px] font-bold text-[var(--cyan)] uppercase tracking-wider">Tailored Skills</h4>
                              <button
                                onClick={() => copy(currentResult.tailored_resume!.skills.join(', '), 'skills')}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                {copiedId === 'skills' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {currentResult.tailored_resume.skills.map((s, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-medium text-cyan-600 dark:text-cyan-300">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* Experience Bullets */}
                        {currentResult.tailored_resume.experience_bullets?.length ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Rewritten Experience Bullets</h4>
                              <button
                                onClick={() => copy(currentResult.tailored_resume!.experience_bullets.map(b => `• ${b}`).join('\n'), 'exp')}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                {copiedId === 'exp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            <div className="space-y-2">
                              {currentResult.tailored_resume.experience_bullets.map((b, i) => (
                                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)]">
                                  <span className="w-4 h-4 rounded bg-amber-500/15 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{b}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* Projects */}
                        {currentResult.tailored_resume.projects?.length ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Rewritten Projects</h4>
                              <button
                                onClick={() => copy(currentResult.tailored_resume!.projects.map(p => `• ${p}`).join('\n'), 'proj')}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                {copiedId === 'proj' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            <div className="space-y-2">
                              {currentResult.tailored_resume.projects.map((p, i) => (
                                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)]">
                                  <span className="text-emerald-500 flex-shrink-0 mt-0.5 text-xs">◆</span>
                                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{p}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* ── Next Steps ── */}
                {currentResult.next_steps?.length ? (
                  <GlassCard className="p-5">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] mb-3 uppercase tracking-wider flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-amber-400" />
                      Recommended Next Steps
                    </h3>
                    <ul className="space-y-2.5">
                      {currentResult.next_steps.map((step, i) => (
                        <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2.5 leading-relaxed">
                          <span className="h-4 w-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                ) : null}

              </motion.div>
            ) : (
              /* ── Empty State ── */
              <EmptyState
                icon={activeTab === 'analyze' ? <FileCheck className="w-10 h-10 text-[var(--violet)]" /> : <Sparkles className="w-10 h-10 text-[var(--cyan)]" />}
                title={activeTab === 'analyze' ? 'Ready to Analyze' : 'Ready to Tailor'}
                description={activeTab === 'analyze'
                  ? 'Paste or upload your resume, enter your target role, and click "Analyze ATS Score" to get a real dynamic compatibility report.'
                  : 'Add your resume, target role, company, and job description. Click "Generate Tailored Resume" to get AI-optimized content.'}
              />
            )}

          </AnimatePresence>
        </div>

      </div>
    </AppPageLayout>
  );
}