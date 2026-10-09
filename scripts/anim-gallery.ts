// Renders every exercise animation into a folder with an index page, for
// reviewing the drawings side by side. Usage: npx tsx scripts/anim-gallery.ts <out-dir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SPECS as ALL } from "../src/lib/exercise-anim/exercises";
import { renderSvg } from "../src/lib/exercise-anim/render";

const out = process.argv[2];
if (!out) throw new Error("usage: anim-gallery <out-dir>");
mkdirSync(out, { recursive: true });
const only = process.argv[3] ? new RegExp(process.argv[3], "i") : null;
const SPECS = only ? ALL.filter((s) => only.test(s.name)) : ALL;

const cards = SPECS.map((spec) => {
  const file = spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".svg";
  const svg = renderSvg(spec);
  writeFileSync(join(out, file), svg);
  return `<figure><img src="${file}" alt=""><figcaption>${spec.name}<small>${(svg.length / 1024).toFixed(1)} KB · ${spec.primary.join(", ")}</small></figcaption></figure>`;
});

writeFileSync(
  join(out, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Exercise animations</title>
<style>body{font:14px system-ui;background:#fff;margin:16px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
figure{margin:0;border:1px solid #e3e6e5;border-radius:12px;overflow:hidden}img{display:block;width:100%;aspect-ratio:1}
figcaption{padding:8px 10px;font-weight:600}small{display:block;font-weight:400;color:#777}</style><main>${cards.join("")}</main>`,
);
// One self-contained page (images inlined) that can be sent on its own.
writeFileSync(
  join(out, "preview.html"),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Exercise animations — preview</title>
<style>body{font:14px system-ui;background:#fff;margin:12px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
figure{margin:0;border:1px solid #e3e6e5;border-radius:12px;overflow:hidden}img{display:block;width:100%;aspect-ratio:1}
figcaption{padding:8px 10px;font-weight:600}small{display:block;font-weight:400;color:#777;text-transform:capitalize}</style><main>${SPECS.map(
    (spec) =>
      `<figure><img alt="" src="data:image/svg+xml;base64,${Buffer.from(renderSvg(spec)).toString("base64")}"><figcaption>${spec.name}<small>${[...spec.primary, ...(spec.secondary ?? [])].map((m) => m.replace(/_/g, " ")).join(" · ")}</small></figcaption></figure>`,
  ).join("")}</main>`,
);

// A contact sheet: each movement frozen at a few phases, for checking poses
// without waiting on the animation.
const rows = SPECS.map((spec) => {
  const phases = spec.mode === "alternate" ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75];
  const slug = spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const cells = phases.map((p) => {
    const file = `${slug}@${p}.svg`;
    writeFileSync(join(out, file), renderSvg(spec, { freezeAt: p }));
    return `<img src="${file}" alt="">`;
  });
  return `<section><h2>${spec.name}</h2><div>${cells.join("")}</div></section>`;
});
writeFileSync(
  join(out, "sheet.html"),
  `<!doctype html><meta charset="utf-8"><title>Contact sheet</title>
<style>body{font:13px system-ui;margin:8px}h2{font-size:13px;margin:10px 0 4px}div{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}img{width:100%;aspect-ratio:1;border:1px solid #ddd}</style>${rows.join("")}`,
);

console.log(`${SPECS.length} animations → ${out}`);
