import { redirect } from "next/navigation";

// Middleware routes signed-in users to their home; this is the fallback.
export default function Home() {
  redirect("/login");
}
