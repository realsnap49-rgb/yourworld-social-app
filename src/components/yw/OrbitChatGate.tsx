import React from "react";
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

export const OrbitChatGate: React.FC<Props> = ({
  profileId,
  name,
  request,
  onAccept,
  onDecline,
}) => {
  const { texts, photos } = countRequestMessages(request);
  const messages = request?.messages ?? [];

  // Only the recipient sees the Accept/Decline gate. The sender of an
  // outgoing pending request goes straight into the message box so they can
  // keep sending pre-accept intros or wait for a reply.
  if (!request || request.status !== "pending" || request.direction !== "incoming") return null;

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden rounded-2xl border border-zinc-800 bg-black/40 p-4 text-white">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-bold">{name}</h2>
          <p className="text-xs text-zinc-400">Orbit Chat Request</p>
        </div>
        <Link
          to="/orbit/$profileId"
          params={{ profileId }}
          className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs"
        >
          View Profile
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className="p-3 bg-zinc-900 rounded-xl text-sm border border-zinc-800 flex items-center gap-2"
          >
            {msg.kind === "text" ? (
              msg.text
            ) : (
              <>
                <ImageIcon size={16} /> Photo
              </>
            )}
          </div>
        ))}
      </div>

      <p className="pb-3 text-[11px] text-zinc-500 text-center">
        {texts}/{ORBIT_REQUEST_TEXT_MAX} texts • {photos}/{ORBIT_REQUEST_PHOTO_MAX} photos before accepting
      </p>

      <div className="flex gap-3 pt-2 border-t border-zinc-800">
        <button
          onClick={onDecline}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 rounded-xl text-sm font-medium hover:bg-zinc-700"
        >
          <X size={16} /> Decline
        </button>
        <button
          onClick={onAccept}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-200"
        >
          <Check size={16} /> Accept
        </button>
      </div>
    </div>
  );
};
