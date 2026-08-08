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

  if (!request || request.status !== "pending") return null;

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-black/40 p-4 text-white">
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

      <div className="max-h-52 overflow-y-auto py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
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

      <p className="pb-3 text-[11px] text-zinc-500">
        {texts}/{ORBIT_REQUEST_TEXT_MAX} texts · {photos}/{ORBIT_REQUEST_PHOTO_MAX} photos before
        accepting
      </p>

      <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-4">
        <button
          onClick={onDecline}
          className="flex-1 py-3 bg-zinc-800 text-red-500 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
        >
          <X size={18} /> Decline
        </button>
        <button
          onClick={onAccept}
          className="flex-1 py-3 bg-white text-black rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Check size={18} /> Accept
        </button>
      </div>
    </div>
  );
};
