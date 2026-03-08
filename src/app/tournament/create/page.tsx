"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// ─── Bracket round name computation ───────────────────────────────────────────

function getRoundNames(count: number): string[] {
  if (count < 2) return [];
  let size = 1;
  while (size < count) size *= 2;
  const totalRounds = Math.log2(size);
  const names: string[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    const fromEnd = totalRounds - r + 1;
    if (fromEnd === 1) names.push("Final");
    else if (fromEnd === 2) names.push("Semifinals");
    else if (fromEnd === 3) names.push("Quarterfinals");
    else names.push(`Round of ${Math.pow(2, fromEnd)}`);
  }
  return names;
}

// ─── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: "Details" },
    { n: 2 as const, label: "Setup" },
    { n: 3 as const, label: "Preview" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                s.n < current
                  ? "bg-indigo-600 text-white"
                  : s.n === current
                  ? "bg-indigo-500 text-white ring-2 ring-indigo-400/40 ring-offset-2 ring-offset-gray-950"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              {s.n < current ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                s.n
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                s.n === current ? "text-indigo-400" : "text-gray-600"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mb-4 h-px w-14 mx-2 transition-colors ${
                s.n < current ? "bg-indigo-600" : "bg-gray-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function CreateTournamentPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantInput, setParticipantInput] = useState("");
  const [contestants, setContestants] = useState<
    { name: string; seed?: number }[]
  >([]);
  const [contestantInput, setContestantInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bracketCSVInputRef = useRef<HTMLInputElement>(null);
  const participantCSVInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1 helpers ──────────────────────────────────────────────────────────

  function addParticipantFromInput() {
    const trimmed = participantInput.trim();
    if (!trimmed) return;
    // Support comma-separated batch input
    const names = trimmed
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    const unique = names.filter(
      (n) => !participants.includes(n)
    );
    if (unique.length) setParticipants((prev) => [...prev, ...unique]);
    setParticipantInput("");
  }

  function removeParticipant(name: string) {
    setParticipants((prev) => prev.filter((p) => p !== name));
  }

  function handleParticipantKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addParticipantFromInput();
    }
  }

  function validateStep1(): boolean {
    if (!title.trim()) {
      toast.error("Please enter a tournament title.");
      return false;
    }
    return true;
  }

  // ── Step 2 helpers ──────────────────────────────────────────────────────────

  function addContestantFromInput() {
    const trimmed = contestantInput.trim();
    if (!trimmed) return;
    if (contestants.some((c) => c.name === trimmed)) {
      toast.error(`"${trimmed}" is already in the list.`);
      return;
    }
    setContestants((prev) => [
      ...prev,
      { name: trimmed, seed: prev.length + 1 },
    ]);
    setContestantInput("");
  }

  function handleContestantKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addContestantFromInput();
    }
  }

  function removeContestant(name: string) {
    setContestants((prev) =>
      prev
        .filter((c) => c.name !== name)
        .map((c, i) => ({ ...c, seed: i + 1 }))
    );
  }

  // Step 2: contestants-only upload (Excel or CSV)
  async function uploadFile(file: File) {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload failed."); return; }
      const incoming: { name: string; seed?: number }[] = data.contestants;
      setContestants((prev) => {
        const existingNames = new Set(prev.map((c) => c.name));
        const fresh = incoming.filter((c) => !existingNames.has(c.name));
        return [...prev, ...fresh].map((c, i) => ({ ...c, seed: c.seed ?? i + 1 }));
      });
      toast.success(`Imported ${incoming.length} contestant(s).`);
    } catch {
      toast.error("Failed to upload file.");
    } finally {
      setLoading(false);
    }
  }

  // "Create bracket from CSV" — fills both contestants + participants, skips to Step 3
  async function importBracketCSV(file: File) {
    if (!title.trim()) { toast.error("Please enter a title first."); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload failed."); return; }
      const importedContestants: { name: string; seed?: number }[] = data.contestants;
      const importedParticipants: string[] = data.participants ?? [];
      if (importedContestants.length < 2) { toast.error("CSV must have at least 2 contestants."); return; }
      setContestants(importedContestants.map((c, i) => ({ ...c, seed: c.seed ?? i + 1 })));
      setParticipants(importedParticipants);
      const parts = [`${importedContestants.length} contestants`];
      if (importedParticipants.length > 0) parts.push(`${importedParticipants.length} participants`);
      toast.success(`Imported ${parts.join(" and ")}.`);
      setStep(3);
    } catch {
      toast.error("Failed to read CSV.");
    } finally {
      setLoading(false);
    }
  }

  // Step 1: participants-only CSV import (client-side, no API)
  function parseParticipantCSV(text: string): string[] {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const firstLower = lines[0].toLowerCase();
    const hasHeader = firstLower === "name" || firstLower.startsWith("name,");
    return (hasHeader ? lines.slice(1) : lines)
      .map((line) => line.split(",")[0].replace(/^"|"$/g, "").trim())
      .filter(Boolean);
  }

  async function handleParticipantCSVChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const text = await file.text();
    const names = parseParticipantCSV(text);
    if (names.length === 0) { toast.error("No names found in CSV."); return; }
    setParticipants((prev) => {
      const existing = new Set(prev);
      const fresh = names.filter((n) => !existing.has(n));
      return [...prev, ...fresh];
    });
    toast.success(`Added ${names.length} participant(s) from CSV.`);
  }

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      // Reset so same file can be re-selected
      e.target.value = "";
    },
    []
  );

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, []);

  function validateStep2(): boolean {
    if (participants.length < 2) {
      toast.error("Add at least 2 participants.");
      return false;
    }
    if (contestants.length < 2) {
      toast.error("Add at least 2 contestants.");
      return false;
    }
    return true;
  }

  // ── Step 3 submit ───────────────────────────────────────────────────────────

  async function handleLaunch() {
    setLoading(true);
    try {
      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          contestants,
          participants,
          isPrivate,
          startDate: startDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create tournament.");
        return;
      }
      toast.success("Tournament launched!");
      router.push(`/tournament/${data.id}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  function goNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  }

  function goBack() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  // ── Round preview data ──────────────────────────────────────────────────────

  const roundNames = getRoundNames(contestants.length);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      {/* Page header */}
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white mb-1">
            Create Tournament
          </h1>
          <p className="text-sm text-gray-500">
            Set up a new bracket in three quick steps
          </p>
        </div>

        <StepIndicator current={step} />

        {/* ── Step 1: Details ───────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-6 rounded-2xl border border-gray-800 bg-gray-900/70 p-6 shadow-xl">
            <div className="flex flex-col gap-4">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="title"
                  className="text-xs font-semibold uppercase tracking-widest text-gray-400"
                >
                  Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && goNext()}
                  placeholder="e.g. Best Movie of 2024"
                  className="bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="description"
                  className="text-xs font-semibold uppercase tracking-widest text-gray-400"
                >
                  Description
                </Label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional — describe the tournament"
                  className="w-full rounded-xl border border-gray-700 bg-gray-800/60 px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none transition resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Start date */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startDate" className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Start Date <span className="normal-case font-normal text-gray-600">(optional)</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-800/60 border-gray-700 text-white focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                />
              </div>

              {/* Private toggle */}
              <label className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/40 px-4 py-3 cursor-pointer">
                <div>
                  <span className="text-sm font-semibold text-white">Private tournament</span>
                  <p className="text-xs text-gray-500 mt-0.5">Only people you invite can view this tournament</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPrivate}
                  onClick={() => setIsPrivate((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${isPrivate ? "bg-indigo-600" : "bg-gray-700"}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${isPrivate ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </label>
            </div>

            {/* Navigation */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={goNext}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6"
              >
                Next: Setup
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Setup (CSV import or manual) ─────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-6 rounded-2xl border border-gray-800 bg-gray-900/70 p-6 shadow-xl">

            {/* Create bracket from CSV */}
            <div>
              <input
                ref={bracketCSVInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importBracketCSV(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => bracketCSVInputRef.current?.click()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-700/60 bg-indigo-950/20 px-4 py-3 text-sm font-semibold text-indigo-400 hover:bg-indigo-900/30 hover:border-indigo-600 hover:text-indigo-300 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {loading ? "Importing…" : "Create bracket from CSV"}
              </button>
              <p className="text-xs text-gray-600 text-center mt-1.5">
                CSV with Type, Name, Seed columns — fills everything and skips to preview
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600">or fill in manually</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Participants */}
            <div>
              <h2 className="text-base font-bold text-white mb-1">Participants</h2>
              <p className="text-xs text-gray-500 mb-3">The voters. Comma-separated, one at a time, or CSV.</p>
              <input ref={participantCSVInputRef} type="file" accept=".csv" className="hidden" onChange={handleParticipantCSVChange} />
              <div className="flex gap-2 mb-3">
                <Input
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  onKeyDown={handleParticipantKeyDown}
                  placeholder="Alice, Bob, Charlie…"
                  className="flex-1 bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                />
                <Button type="button" onClick={addParticipantFromInput} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white shrink-0">Add</Button>
                <Button type="button" onClick={() => participantCSVInputRef.current?.click()} variant="outline" className="border-gray-700 text-gray-500 hover:bg-gray-800 hover:text-white shrink-0" title="Import participants from CSV">CSV</Button>
              </div>
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {participants.map((name) => (
                    <Badge key={name} variant="secondary" className="bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 flex items-center gap-1.5 pr-1.5">
                      {name}
                      <button type="button" onClick={() => removeParticipant(name)} className="ml-0.5 rounded-sm text-indigo-400 hover:text-white transition-colors leading-none" aria-label={`Remove ${name}`}>&times;</button>
                    </Badge>
                  ))}
                </div>
              )}
              {participants.length === 0 && <p className="text-xs text-gray-600 italic">No participants added yet.</p>}
            </div>

            <div className="h-px bg-gray-800" />

            {/* Contestants */}
            <div>
              <h2 className="text-base font-bold text-white mb-1">Contestants</h2>
              <p className="text-xs text-gray-500 mb-3">These compete in the bracket. Add manually or upload a file.</p>

              <div className="flex gap-2 mb-4">
                <Input
                  value={contestantInput}
                  onChange={(e) => setContestantInput(e.target.value)}
                  onKeyDown={handleContestantKeyDown}
                  placeholder="Contestant name…"
                  className="flex-1 bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                />
                <Button type="button" onClick={addContestantFromInput} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white shrink-0">Add</Button>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors ${dragOver ? "border-indigo-500 bg-indigo-900/20" : "border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50"}`}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                <svg className={`w-7 h-7 ${dragOver ? "text-indigo-400" : "text-gray-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {loading ? (
                  <p className="text-sm text-indigo-400 font-medium">Uploading…</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-400"><span className="font-semibold text-gray-300">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-600">Excel (.xlsx, .xls) or CSV with a <span className="font-semibold">Name</span> column</p>
                  </>
                )}
              </div>
            </div>

            {contestants.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-300">{contestants.length} contestant{contestants.length !== 1 ? "s" : ""}</p>
                  <button type="button" onClick={() => setContestants([])} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Clear all</button>
                </div>
                <ul className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {contestants.map((c, i) => (
                    <li key={c.name} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-5 text-right font-mono">{i + 1}</span>
                        <span className="text-sm text-white">{c.name}</span>
                      </div>
                      <button type="button" onClick={() => removeContestant(c.name)} className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none" aria-label={`Remove ${c.name}`}>&times;</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button type="button" onClick={goBack} variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-800">Back</Button>
              <Button onClick={goNext} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6">Next: Preview</Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview + Launch ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-6 rounded-2xl border border-gray-800 bg-gray-900/70 p-6 shadow-xl">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">
                Preview & Launch
              </h2>
              <p className="text-xs text-gray-500 mb-5">
                Review your tournament before creating it.
              </p>

              {/* Summary card */}
              <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-4 mb-5">
                <h3 className="text-lg font-bold text-white">
                  {title}
                </h3>
                {description && (
                  <p className="text-sm text-gray-400 mt-1">{description}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <span className="text-gray-400">
                    <span className="font-semibold text-indigo-400">
                      {contestants.length}
                    </span>{" "}
                    contestants
                  </span>
                  <span className="text-gray-400">
                    <span className="font-semibold text-pink-400">
                      {participants.length}
                    </span>{" "}
                    participants
                  </span>
                  <span className="text-gray-400">
                    <span className="font-semibold text-purple-400">
                      {roundNames.length}
                    </span>{" "}
                    rounds
                  </span>
                </div>
              </div>

              {/* Bracket round names */}
              {roundNames.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
                    Bracket Structure
                  </p>
                  <ol className="flex flex-col gap-2">
                    {roundNames.map((name, i) => {
                      const isLast = i === roundNames.length - 1;
                      return (
                        <li key={name} className="flex items-center gap-3">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              isLast
                                ? "bg-amber-500 text-gray-950"
                                : "bg-indigo-900/60 text-indigo-300 border border-indigo-700/50"
                            }`}
                          >
                            {i + 1}
                          </div>
                          <span
                            className={`text-sm font-semibold ${
                              isLast ? "text-amber-400" : "text-gray-300"
                            }`}
                          >
                            {name}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Add contestants to see the bracket structure.
                </p>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                onClick={goBack}
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-gray-800"
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={handleLaunch}
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 shadow-lg shadow-indigo-900/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Launching…" : "Launch Tournament"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
