import Link from "next/link";

const LINKS = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/settings", label: "Credit Settings" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export default function AdminNav({ active }: { active: string }) {
  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            active === link.href
              ? "border-violet-400/40 bg-violet-500/15 text-violet-300"
              : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
