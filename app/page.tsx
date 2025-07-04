import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")

  if (token) {
    redirect("/chat")
  } else {
    redirect("/auth/login")
  }
}
