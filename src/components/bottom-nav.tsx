"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/today", label: "Today", icon: "☀️" },
  { href: "/list", label: "List", icon: "☑️" },
];

/**
 * Fixed bottom navigation — everything reachable with one thumb.
 * Settings is the gear pinned bottom-left, out of the way but always one tap away;
 * Today and List are the primary tabs.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-(--color-gold-soft) bg-(--color-paper)/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
        <Link
          href="/settings"
          aria-label="Settings"
          className={`flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-[10px] font-medium transition ${
            pathname === "/settings"
              ? "text-(--color-ink)"
              : "text-(--color-ink-soft)"
          }`}
        >
          <span className="text-xl leading-none" aria-hidden>
            ⚙️
          </span>
          Settings
        </Link>

        <div className="flex flex-1 items-stretch justify-around">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium transition ${
                  active ? "text-(--color-ink)" : "text-(--color-ink-soft)"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
