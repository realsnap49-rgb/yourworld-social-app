import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatGateProps {
  conversationId: string;
  isAccepted: boolean;
  textCount: number;
  photoCount: number;
  secretPin?: string;
}

export const OrbitChatGate: React.FC<ChatGateProps> = ({
  conversationId,
  isAccepted,
  textCount,
  photoCount,
  secretPin,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(!secretPin);
  const [message, setMessage] = useState('');

  const canSendText = isAccepted || textCount < 3;
  const canSendPhoto = isAccepted || photoCount < 2;

  const handleUnlock = () => {
    if (pinInput === secretPin) {
      setIsUnlocked(true);
    } else {
      alert('Galat PIN!');
    }
  };

  const sendMessage = async (isPhoto: boolean = false) => {
    if (isPhoto && !canSendPhoto) {
      alert('Unaccepted chat me maximum 2 photos allow hain.');
      return;
    }
    if (!isPhoto && !canSendText) {
      alert('Unaccepted chat me maximum 3 text messages allow hain.');
      return;
    }

    await supabase.from('chat_conversations').update({
      text_count: isPhoto ? textCount : textCount + 1,
      photo_count: isPhoto ? photoCount + 1 : photoCount,
    }).eq('id', conversationId);

    setMessage('');
  };

  if (!isUnlocked) {
    return (
      <div className="p-4 bg-gray-900 text-white rounded">
        <h3>Secret Lock Active</h3>
        <input
          type="password"
          placeholder="Enter Secret PIN"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          className="p-2 text-black rounded"
        />
        <button onClick={handleUnlock} className="ml-2 p-2 bg-blue-600 rounded">
          Unlock
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={canSendText ? "Type a message..." : "Message limit reached (Request Pending)"}
        disabled={!canSendText}
        className="w-full p-2 border rounded mb-2"
      />
      <div className="flex gap-2">
        <button
          onClick={() => sendMessage(false)}
          disabled={!canSendText}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          Send Text ({3 - textCount} left)
        </button>
        <button
          onClick={() => sendMessage(true)}
          disabled={!canSendPhoto}
          className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
        >
          Send Photo ({2 - photoCount} left)
        </button>
      </div>
    </div>
  );
};
