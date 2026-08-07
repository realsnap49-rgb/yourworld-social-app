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
  requests: OrbitChatRequest[];
  onAccept: () => void;
  onDecline: () => void;
};

export const OrbitChatGate: React.FC<Props> = ({
  profileId,
  name,
  requests,
  onAccept,
  onDecline,
}) => {
  const { textCount, photoCount } = countRequestMessages(requests);

  return (
    <div className="flex flex-col h-full bg-black text-white p-4">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-bold">{name}</h2>
          <p className="text-xs text-zinc-400">Orbit Chat Request</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="p-3 bg-zinc-900 rounded-xl text-sm border border-zinc-800"
          >
            {req.type === "text" ? req.text : "[Photo Message]"}
          </div>
        ))}
      </div>

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
