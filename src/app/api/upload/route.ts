import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  }) as string[][];

  if (rows.length < 2) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  const headers = rows[0].map((h) => String(h).toLowerCase().trim());
  const typeIdx = headers.findIndex((h) => h === "type");
  const nameIdx = headers.findIndex((h) => h.includes("name"));
  const seedIdx = headers.findIndex((h) => h.includes("seed"));
  const linksIdx = headers.findIndex((h) => h.includes("link"));

  if (nameIdx === -1) {
    return NextResponse.json({ error: "No 'Name' column found" }, { status: 400 });
  }

  function parseSeed(row: string[]): number | undefined {
    if (seedIdx === -1) return undefined;
    const raw = row[seedIdx];
    if (!raw) return undefined;
    const n = parseInt(String(raw), 10);
    return isNaN(n) ? undefined : n;
  }

  function parseLinks(row: string[]): string[] {
    if (linksIdx === -1) return [];
    return String(row[linksIdx] ?? "").split(";").map((u) => u.trim()).filter(Boolean);
  }

  // Full bracket CSV: Type column present
  if (typeIdx !== -1) {
    const contestants: { name: string; seed?: number; links: string[] }[] = [];
    const participants: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const type = String(row[typeIdx] ?? "").toLowerCase().trim();
      const name = String(row[nameIdx] ?? "").trim();
      if (!name) continue;

      if (type === "contestant") {
        contestants.push({ name, seed: parseSeed(row), links: parseLinks(row) });
      } else if (type === "participant") {
        participants.push(name);
      }
    }

    if (contestants.length === 0 && participants.length === 0) {
      return NextResponse.json({ error: "No data found in file" }, { status: 400 });
    }

    return NextResponse.json({ contestants, participants });
  }

  // Legacy: contestants-only (no Type column)
  const contestants: { name: string; seed?: number; links: string[] }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[nameIdx] ?? "").trim();
    if (!name) continue;
    contestants.push({ name, seed: parseSeed(row), links: parseLinks(row) });
  }

  if (contestants.length === 0) {
    return NextResponse.json({ error: "No contestants found" }, { status: 400 });
  }

  return NextResponse.json({ contestants, participants: [] });
}
