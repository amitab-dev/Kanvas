import { redirect } from "next/navigation"

export default function Home() {
  // The dashboard is the app's entry point; it bounces signed-out visitors to login.
  redirect("/dashboard")
}
