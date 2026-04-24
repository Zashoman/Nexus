import Link from "next/link";
import ChannelEditor from "@/components/ChannelEditor";

export default function NewChannelPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/channels"
          className="text-xs text-[var(--muted)] hover:underline"
        >
          ← Channels
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">
          New channel
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Configure filters for a Telegram destination. You can tweak these any time.
        </p>
      </div>
      <ChannelEditor mode="create" />
    </div>
  );
}
