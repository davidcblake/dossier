import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { googleAccount: true },
  });
  if (!user) redirect("/");

  const connected = Boolean(user.googleAccount?.refreshToken);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="font-(family-name:--font-display) text-4xl font-semibold">
          Today
        </h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-(--color-ink-soft) underline underline-offset-4"
          >
            Sign out
          </button>
        </form>
      </header>

      <p className="mt-1 text-(--color-ink-soft)">
        Good morning{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
      </p>

      <section className="mt-8 rounded-2xl border border-(--color-gold-soft) bg-white/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-(--color-ink-soft)">
          Account
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            {connected ? "✅" : "⚠️"} Google{" "}
            {connected
              ? "connected — refresh token stored (encrypted at rest)"
              : "not fully connected — please sign in again and grant access"}
          </li>
          <li>📧 {user.email}</li>
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-dashed border-(--color-gold-soft) p-5 text-sm text-(--color-ink-soft)">
        Your daily digest will appear here once scanning is enabled (Phase 2).
      </section>
    </main>
  );
}
