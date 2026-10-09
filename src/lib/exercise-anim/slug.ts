// The URL-safe key an exercise name is filed under, shared by the server that
// draws the animations and the browser that asks for them. Case, spacing and
// punctuation all fold away, so "Push-Up", "push up" and "PUSH UP" agree.
export function animationSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
