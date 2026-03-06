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

  // Find header row indices
  const headers = rows[0].map((h) => String(h).toLowerCase().trim());
  const nameIdx = headers.findIndex((h) => h.includes("name"));
  const seedIdx = headers.findIndex((h) => h.includes("seed"));

  if (nameIdx === -1) {
    return NextResponse.json(
      { error: "No 'Name' column found" },
      { status: 400 }
    );
  }

  const contestants: { name: string; seed?: number }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[nameIdx] ?? "").trim();
    if (!name) continue;

    const seed =
      seedIdx !== -1 && row[seedIdx] !== ""
        ? parseInt(String(row[seedIdx]), 10)
        : undefined;

    contestants.push({ name, seed: isNaN(seed as number) ? undefined : seed });
  }

  if (contestants.length === 0) {
    return NextResponse.json({ error: "No contestants found" }, { status: 400 });
  }

  return NextResponse.json({ contestants });
}
