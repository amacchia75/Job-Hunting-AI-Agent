import React, { useState, useRef } from 'react';
import { Search, MapPin, Briefcase, User, Sparkles, LogOut, CheckCircle, XCircle, Loader2, ChevronRight, Building, Clock, FileType, Upload, FileText, Clipboard, ClipboardCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CV, Job, JobMatchResult } from './types';
import { parseCV, matchJobsWithCV, generateCoverLetter } from './services/aiService';
import { searchJobs } from './services/jobService';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [cvText, setCvText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ data: string, mimeType: string, name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedCV, setParsedCV] = useState<CV | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<JobMatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("Per ora carichiamo solo file PDF.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setSelectedFile({
        data: base64,
        mimeType: file.type,
        name: file.name
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleParseCV = async () => {
    if (!cvText.trim() && !selectedFile) return;
    setIsParsing(true);
    setError(null);
    try {
      const cv = await parseCV({ 
        text: cvText || undefined, 
        file: selectedFile ? { data: selectedFile.data, mimeType: selectedFile.mimeType } : undefined 
      });
      setParsedCV(cv);
      setSearchQuery(cv.role);
      setLocation(cv.location);
    } catch (err: any) {
      setError("Errore nella lettura del CV. Riprova.");
    } finally {
      setIsParsing(false);
    }
  };

  const [generatingLetterFor, setGeneratingLetterFor] = useState<string | null>(null);
  const [coverLetters, setCoverLetters] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerateLetter = async (match: JobMatchResult) => {
    if (!parsedCV) return;
    const jobId = match.job.job_id;
    setGeneratingLetterFor(jobId);
    try {
      const letter = await generateCoverLetter(parsedCV, match.job);
      setCoverLetters(prev => ({ ...prev, [jobId]: letter }));
    } catch (err) {
      setError("Errore nella generazione della lettera.");
    } finally {
      setGeneratingLetterFor(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getJobLink = (job: Job) => {
    return (
      job.apply_options?.find(o => o.is_direct)?.link ||
      job.apply_options?.[0]?.link ||
      job.related_links?.[0]?.link ||
      `https://www.google.com/search?q=${encodeURIComponent(job.title + " " + job.company_name)}`
    );
  };

  const handleHunt = async (customQuery?: string) => {
    if (!parsedCV) return;
    setIsSearching(true);
    setError(null);
    try {
      // Clean location (remove "Italia" or extra country info for SerpApi precision)
      const cleanLocation = location.split(',')[0].replace(/italia/i, '').trim();
      const query = customQuery || searchQuery;
      
      const jobs = await searchJobs(query, cleanLocation);
      if (jobs.length === 0) {
        setError(`Nessun annuncio trovato per "${query}" a ${cleanLocation}.`);
        return;
      }
      const matchResults = await matchJobsWithCV(parsedCV, jobs);
      setMatches(matchResults);
    } catch (err: any) {
      setError(err.message || "Errore nella ricerca degli annunci.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-bento-bg text-bento-text font-sans p-6 lg:p-10">
      
      {/* Header Area (Part of Bento) */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-bento-accent to-purple-400 bg-clip-text text-transparent">Job Hunter AI</h1>
            <p className="text-bento-dim text-sm font-medium">Autonomous Career Navigator Agent v2.5</p>
          </div>
          <div className="flex items-center gap-6 px-6 py-3 bg-bento-card border border-bento-border rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-bento-positive animate-pulse" />
              <span className="text-xs font-mono uppercase font-bold tracking-wider">System Active</span>
            </div>
            <div className="h-4 w-px bg-bento-border" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-bento-dim uppercase">Provider:</span>
              <span className="text-xs font-mono font-bold">Gemini 3.1 Pro</span>
            </div>
          </div>
        </header>

        {/* Bento Grid */}
        <main className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Card: HERO / STATUS */}
          <div className="md:col-span-2 md:row-span-1 bg-gradient-to-br from-[#1e1b4b] to-bento-card border border-[#312e81] rounded-[24px] p-8 flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-500">
               <Sparkles size={120} />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-mono uppercase bg-bento-accent/20 text-bento-accent px-2 py-1 rounded mb-4 inline-block">Hunt Session Active</span>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                {parsedCV ? `Bentornato, ${parsedCV.fullName.split(' ')[0]}` : "Ready to Start Your Hunt?"}
              </h2>
              <p className="text-bento-dim text-sm max-w-sm">
                Analizzatore vettoriale di carriere attivo. Carica il tuo CV per identificare match ad alta compatibilità nella tua zona geografica.
              </p>
            </div>
            {parsedCV && (
              <div className="flex flex-wrap gap-2 mt-6 relative z-10">
                {parsedCV.skills.slice(0, 4).map((s, i) => (
                  <span key={i} className="text-[10px] bg-bento-bg/50 border border-white/10 px-3 py-1 rounded-full">{s}</span>
                ))}
                {parsedCV.skills.length > 4 && <span className="text-[10px] opacity-50 px-3 py-1">+{parsedCV.skills.length - 4} more</span>}
              </div>
            )}
          </div>

          {/* Card: Stats 1 */}
          <div className="bg-bento-card border border-bento-border rounded-[24px] p-8 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-mono uppercase text-bento-dim mb-2">Compatibilità Media</span>
            <div className="text-5xl font-bold text-bento-positive shadow-bento">
              {matches.length > 0 
                ? `${Math.round(matches.reduce((acc, m) => acc + m.score, 0) / matches.length)}%` 
                : "0%"}
            </div>
            <p className="text-[10px] uppercase text-bento-dim mt-2 tracking-widest leading-none">Global Accuracy</p>
          </div>

          {/* Card: Mini Status */}
          <div className="bg-bento-card border border-bento-border rounded-[24px] p-8 flex flex-col justify-between">
            <div className="flex justify-between items-start">
               <div className="w-10 h-10 bg-bento-accent/10 text-bento-accent rounded-xl flex items-center justify-center">
                 <Search size={20} />
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-mono text-bento-dim uppercase">Match Trovati</p>
                 <p className="text-2xl font-bold">{matches.length}</p>
               </div>
            </div>
            <div className="mt-4 pt-4 border-t border-bento-border space-y-2">
               <div className="flex justify-between text-[10px]">
                 <span className="text-bento-dim">SerpApi Status</span>
                 <span className="text-bento-positive">Online</span>
               </div>
               <div className="flex justify-between text-[10px]">
                 <span className="text-bento-dim">Vector Sync</span>
                 <span className="text-bento-accent">Complete</span>
               </div>
            </div>
          </div>

          {/* Card: CV Input/Display (Left Column in Bento) */}
          <div className="md:col-span-1 md:row-span-3 bg-bento-card border border-bento-border rounded-[24px] p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <User size={18} className="text-bento-accent" />
                <h3 className="font-bold text-sm uppercase tracking-wider">01. CV Identity</h3>
              </div>
              {parsedCV && (
                <button 
                  onClick={() => { setParsedCV(null); setCvText(''); setSelectedFile(null); setMatches([]); }}
                  className="text-[10px] text-bento-dim hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {!parsedCV ? (
              <div className="flex-1 flex flex-col">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="application/pdf" 
                  className="hidden" 
                />
                
                {!selectedFile ? (
                  <>
                    <textarea
                      value={cvText}
                      onChange={(e) => setCvText(e.target.value)}
                      placeholder="Incolla il contenuto del tuo CV..."
                      className="w-full h-32 bg-bento-bg/50 border border-bento-border focus:border-bento-accent rounded-xl p-4 text-xs font-mono resize-none focus:outline-none placeholder:opacity-20 mb-3"
                    />
                    <div className="text-center mb-4">
                      <p className="text-[9px] font-mono text-bento-dim uppercase mb-2">— oppure —</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border border-dashed border-bento-border hover:border-bento-accent/50 hover:bg-bento-accent/5 py-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all group"
                      >
                         <Upload size={16} className="text-bento-dim group-hover:text-bento-accent transition-colors" />
                         <span className="text-[10px] font-mono uppercase text-bento-dim group-hover:text-bento-accent">Importa PDF</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 border border-bento-accent/30 bg-bento-accent/5 rounded-xl p-6 flex flex-col items-center justify-center text-center mb-4 relative group">
                     <button 
                      onClick={() => setSelectedFile(null)}
                      className="absolute top-2 right-2 p-1 text-bento-dim hover:text-white"
                     >
                       <XCircle size={14} />
                     </button>
                     <div className="w-12 h-12 bg-bento-accent/20 text-bento-accent rounded-full flex items-center justify-center mb-3">
                        <FileType size={24} />
                     </div>
                     <p className="text-xs font-bold truncate max-w-full px-4">{selectedFile.name}</p>
                     <p className="text-[10px] font-mono text-bento-dim uppercase mt-1">File Pronto per l'analisi</p>
                  </div>
                )}

                <button
                  onClick={handleParseCV}
                  disabled={isParsing || (!cvText.trim() && !selectedFile)}
                  className="w-full bg-bento-accent text-white py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isParsing ? <Loader2 className="animate-spin inline mr-2" /> : <Sparkles className="inline mr-2" />}
                  Analizza Profilo
                </button>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                   <p className="text-[10px] font-mono text-bento-dim uppercase mb-1">Candidato</p>
                   <p className="font-bold">{parsedCV.fullName}</p>
                </div>
                <div>
                   <p className="text-[10px] font-mono text-bento-dim uppercase mb-1">Target</p>
                   <p className="font-medium text-sm">{parsedCV.role}</p>
                </div>
                <div>
                   <p className="text-[10px] font-mono text-bento-dim uppercase mb-1">Località</p>
                   <p className="font-medium text-sm">{parsedCV.location}</p>
                </div>
                <div className="pt-4 border-t border-bento-border">
                  <p className="text-[10px] font-mono text-bento-dim uppercase mb-2">Core Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedCV.skills.map((s, i) => (
                      <span key={i} className="text-[9px] bg-bento-bg px-2 py-1 rounded border border-bento-border uppercase">{s}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Card: Strategy / Controls */}
          <div className="md:col-span-1 md:row-span-3 bg-bento-card border border-bento-border rounded-[24px] p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles size={18} className="text-bento-accent" />
              <h3 className="font-bold text-sm uppercase tracking-wider">02. Hunt Strategy</h3>
            </div>
            
            <div className="space-y-4 flex-1">
              <div>
                <label className="text-[10px] font-mono text-bento-dim uppercase block mb-1.5">Ruolo da Cercare</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={!parsedCV}
                  className="w-full bg-bento-bg/50 border border-bento-border focus:border-bento-accent rounded-xl p-3 text-sm focus:outline-none disabled:opacity-30"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-bento-dim uppercase block mb-1.5">Località Target</label>
                <div className="relative">
                   <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-bento-dim" size={14} />
                   <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={!parsedCV}
                    className="w-full bg-bento-bg/50 border border-bento-border focus:border-bento-accent pl-10 rounded-xl p-3 text-sm focus:outline-none disabled:opacity-30"
                  />
                </div>
              </div>

              <div className="mt-auto pt-6">
                <button
                  onClick={() => handleHunt()}
                  disabled={isSearching || !parsedCV}
                  className="w-full bg-white text-bento-bg py-5 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:brightness-90 active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {isSearching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  Avvia Caccia Automatica
                </button>
                {error && (
                  <div className="mt-4 space-y-3">
                    <p className="text-red-400 text-[10px] font-mono leading-tight">{error}</p>
                    {parsedCV && parsedCV.suggestedKeywords && (
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                        <p className="text-[9px] font-mono text-bento-dim uppercase mb-2 italic">Proposta AI: Termini più generici</p>
                        <div className="flex flex-wrap gap-1.5">
                          {parsedCV.suggestedKeywords.map((kw, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSearchQuery(kw);
                                handleHunt(kw);
                              }}
                              className="text-[9px] bg-bento-accent/10 border border-bento-accent/30 text-bento-accent px-2 py-1 rounded hover:bg-bento-accent hover:text-white transition-all uppercase font-bold"
                            >
                              {kw}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Results / Feed */}
          <div className="md:col-span-2 md:row-span-3 bg-bento-card border border-bento-border rounded-[24px] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-bento-border flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Briefcase size={18} className="text-bento-accent" />
                <h3 className="font-bold text-sm uppercase tracking-wider">03. Target Matches</h3>
              </div>
              <div className="flex items-center gap-1">
                 <span className="text-[10px] font-mono text-bento-dim uppercase">Sorting:</span>
                 <span className="text-[10px] font-mono font-bold">Best Score</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {isSearching && (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-bento-bg rounded-2xl border border-bento-border/50" />
                  ))}
                </div>
              )}

              {!isSearching && matches.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-20">
                   <Briefcase size={48} className="mb-4" />
                   <p className="text-sm italic">In attesa di coordinate di caccia...</p>
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {matches.map((match, idx) => (
                  <motion.div
                    key={match.job.job_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-bento-bg border border-bento-border hover:border-bento-accent/50 hover:bg-bento-accent/5 rounded-2xl p-5 transition-all relative"
                  >
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-bento-card border border-bento-border shrink-0">
                         <span className="text-[10px] font-mono uppercase text-bento-dim leading-none mb-1">Match</span>
                         <span className="text-lg font-bold text-bento-positive">{match.score}%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <a 
                            href={getJobLink(match.job)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-bold text-sm uppercase truncate group-hover:text-bento-accent transition-colors flex-1"
                          >
                            {match.job.title}
                          </a>
                          <a 
                            href={getJobLink(match.job)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 group-hover:bg-bento-accent group-hover:text-white rounded-md transition-colors"
                          >
                            <ChevronRight size={16} />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-bento-dim mt-1">
                          <span className="flex items-center gap-1"><Building size={12}/> {match.job.company_name}</span>
                          <span className="hidden sm:inline opacity-30">•</span>
                          <span className="flex items-center gap-1"><MapPin size={12}/> {match.job.location}</span>
                        </div>
                        <p className="text-[11px] mt-3 line-clamp-2 text-bento-dim italic font-serif leading-relaxed">
                          "{match.reasoning}"
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                           {match.matchingSkills.slice(0, 3).map((s, i) => (
                             <span key={i} className="text-[9px] bg-bento-positive/10 text-bento-positive px-2 py-0.5 rounded border border-bento-positive/20 uppercase font-medium">{s}</span>
                           ))}
                        </div>

                        {/* Cover Letter Section */}
                        <div className="mt-4 pt-4 border-t border-bento-border/50">
                          {!coverLetters[match.job.job_id] ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateLetter(match);
                              }}
                              disabled={generatingLetterFor === match.job.job_id}
                              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-bento-dim hover:text-bento-accent transition-colors disabled:opacity-50"
                            >
                              {generatingLetterFor === match.job.job_id ? (
                                <Loader2 className="animate-spin" size={12} />
                              ) : (
                                <FileText size={12} />
                              )}
                              Genera Lettera di Presentazione
                            </button>
                          ) : (
                            <div 
                              className="space-y-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono text-bento-positive uppercase font-bold flex items-center gap-1">
                                  <CheckCircle size={10} /> Lettera Pronta
                                </span>
                                <button
                                  onClick={() => copyToClipboard(coverLetters[match.job.job_id], match.job.job_id)}
                                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-bento-accent hover:brightness-125 transition-all"
                                >
                                  {copiedId === match.job.job_id ? (
                                    <ClipboardCheck size={12} />
                                  ) : (
                                    <Clipboard size={12} />
                                  )}
                                  {copiedId === match.job.job_id ? 'Copiata' : 'Copia Testo'}
                                </button>
                              </div>
                              <div className="bg-bento-card/50 border border-bento-border p-3 rounded-lg text-[10px] text-bento-dim font-serif max-h-32 overflow-y-auto custom-scrollbar leading-relaxed whitespace-pre-wrap">
                                {coverLetters[match.job.job_id]}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            <div className="p-4 bg-bento-bg/50 border-t border-bento-border text-center">
               <p className="text-[9px] font-mono text-bento-dim uppercase tracking-[0.2em]">Aggiornato in tempo reale via SerpApi</p>
            </div>
          </div>

        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}
