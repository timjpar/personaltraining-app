import { model3d, model3dSlugs } from "@/lib/exercise-anim/model3d";
import { animationSlugs, animationSvg, assertIndexCurrent } from "@/lib/exercise-anim/server";

// One animated SVG per exercise, drawn from its spec at build time. Static:
// every slug is known up front, so anything else is a 404 rather than a
// request-time render.
//
// The path carries a file extension, which also keeps it out of src/proxy.ts's
// matcher — these are plain drawings, and the sign-in page shows one.

export const dynamicParams = false;

export function generateStaticParams() {
  assertIndexCurrent();
  return [
    ...animationSlugs().map((slug) => ({ file: `${slug}.svg` })),
    // The few movements with a turnable 3D view: their frames as JSON.
    ...model3dSlugs().map((slug) => ({ file: `${slug}.3d.json` })),
  ];
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (file.endsWith(".3d.json")) {
    const model = model3d(file.slice(0, -8));
    if (!model) return new Response("Not found", { status: 404 });
    return new Response(JSON.stringify(model), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // Versioned by MODEL_VERSION, as the drawings are by ANIMATION_VERSION.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }
  const svg = file.endsWith(".svg") ? animationSvg(file.slice(0, -4)) : null;
  if (!svg) return new Response("Not found", { status: 404 });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // The URL is versioned (see ANIMATION_VERSION), so a cached copy never
      // outlives the drawing it shows.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
