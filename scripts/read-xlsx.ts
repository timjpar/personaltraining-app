// Just enough of the .xlsx format to read the first sheet of a table, so the
// nutrient build can take USDA's iodine release as published instead of making
// someone convert it by hand. An .xlsx file is a zip of XML parts; node's zlib
// inflates the parts and two regular expressions read the cells.
//
// Build tooling only — never imported by the app.
import fs from "node:fs";
import zlib from "node:zlib";

function unzip(file: string): Map<string, Buffer> {
  const buf = fs.readFileSync(file);
  // End of central directory: the last record in the file, found by signature.
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error(`${file} is not a zip archive.`);

  const entries = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const parts = new Map<string, Buffer>();
  for (let i = 0; i < entries; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);

    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    parts.set(name, method === 8 ? zlib.inflateRawSync(raw) : raw);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return parts;
}

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

const text = (xml: string) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join("");

const column = (ref: string) =>
  [...ref.replace(/\d+/g, "")].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

// Rows of the workbook's first sheet, each a dense array of cell text.
export function readXlsxRows(file: string): string[][] {
  const parts = unzip(file);
  const shared = parts.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const strings = [...shared.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => text(m[1]));

  const sheet = [...parts.keys()].filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
  if (!sheet) throw new Error(`${file} has no worksheet.`);
  const xml = parts.get(sheet)!.toString("utf8");

  const rows: string[][] = [];
  for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!ref) continue;
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const body = c[2] ?? "";
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      const value =
        type === "s" && v != null ? strings[Number(v)]
        : type === "inlineStr" ? text(body)
        : v != null ? decode(v)
        : "";
      cells[column(ref)] = value;
    }
    rows.push(Array.from(cells, (c) => c ?? ""));
  }
  return rows;
}
