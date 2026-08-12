import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export function CreateSheet({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      if (onClose) onClose();
      navigate({ to: "/create" });
    }
  }, [isOpen, navigate, onClose]);

  return null;
}
