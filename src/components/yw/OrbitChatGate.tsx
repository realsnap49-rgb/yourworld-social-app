import { Check, Image as ImageIcon, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  ORBIT_REQUEST_PHOTO_MAX,
  ORBIT_REQUEST_TEXT_MAX,
  countRequestMessages,
  type OrbitChatRequest,
} from "@/lib/orbit-store";

type Props = {
  profileId: string;
  name: string;
  request?: OrbitChatRequest;
  onAccept: () => void;
  onDecline: () => void;
};

/**
 * Pre-acceptance gate: shows Accept/Decline + View Profile to the recipient,
 * and the remaining text/photo allowance to the sender.
 */
export function OrbitChatGate({ profileId, name, request, onAccept, onDecline }: Props) {
  if (!request || request.status === "accepted") return null;

  const { texts, photos } = countRequestMessages(request);
  const incoming = request.direction === "incoming" && request.status === "pending";
  const declined = request.status === "declined";

  if (declined) {
    return (
      <p className="mb-2 rounded-2xl border border-border px-4 py-3 text-center text-[11px] text-muted-foreground">
        This request was declined.
      </p>
    );
  }

  if (incoming) {
    return (
      <div className="mb-3 rounded-2xl border border-border p-4 text-center">
        <p className="text-sm font-semibold">{name} wants to chat</p>
        <p className="pt-1 text-xs text-muted-foreground">
          Until you accept, they can only send {ORBIT_REQUEST_TEXT_MAX} texts and {ORBIT_REQUEST_PHOTO_MAX} photos.
        </p>
        <div className="flex items-center justify-center gap-2 pt-3">
          <button
            type="button"
            onClick={onAccept}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform active:scale-95"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
            Accept
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold transition-transform active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2} />
            Decline
          </button>
        </div>
        <Link
          to="/orbit/$profileId"
          params={{ profileId }}
          className="mt-3 inline-block rounded-full border border-border px-4 py-2 text-[11px] font-semibold"
        >
          View Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-2 flex items-center justify-center gap-3 rounded-2xl border border-border px-4 py-3 text-[11px] text-muted-foreground">
      <span>
        Request pending · {ORBIT_REQUEST_TEXT_MAX - texts} of {ORBIT_REQUEST_TEXT_MAX} texts left
      </span>
      <span className="flex items-center gap-1">
        <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
        {ORBIT_REQUEST_PHOTO_MAX - photos} left
      </span>
    </div>
  );
}