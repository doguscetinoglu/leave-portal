import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role === "HR_ADMIN") redirect("/admin");
  redirect("/dashboard");
}
