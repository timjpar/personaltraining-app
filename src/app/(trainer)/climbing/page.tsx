import { redirect } from "next/navigation";

// The climbing page grew into /exercises, which lists the whole catalog with
// the seven climbing groups still broken out. Kept as a redirect rather than
// deleted: this route shipped in the tab bar, so it is in people's history.
// It sits in (trainer) so a client following an old link lands where the proxy
// sends them rather than being redirected to a page they can't open.
export default function ClimbingPage() {
  redirect("/exercises");
}
