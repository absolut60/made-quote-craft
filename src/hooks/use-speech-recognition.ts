import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Options = {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  /** Chiamato a ogni segmento finale di testo trascritto. */
  onFinal?: (text: string) => void;
};

/**
 * Hook condiviso per il riconoscimento vocale (Web Speech API).
 * Usato sia dall'ordine vocale che dall'assistente prodotti.
 */
export function useSpeechRecognition(opts: Options = {}) {
  const { lang = "it-IT", continuous = true, interimResults = true, onFinal } = opts;

  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");

  const recogRef = useRef<any>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    const SR: any =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SR) {
      setSupported(false);
      return;
    }
    const r = new SR();
    r.lang = lang;
    r.continuous = continuous;
    r.interimResults = interimResults;
    r.onresult = (event: any) => {
      let final = "";
      let inter = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) final += res[0].transcript;
        else inter += res[0].transcript;
      }
      if (final && onFinalRef.current) onFinalRef.current(final.trim());
      setInterim(inter);
    };
    r.onerror = (e: any) => {
      console.error("Speech error", e);
      if (e.error === "not-allowed") toast.error("Permesso microfono negato");
      else if (e.error === "no-speech") {
        /* ignore */
      } else toast.error("Errore riconoscimento: " + e.error);
      setListening(false);
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    recogRef.current = r;
    return () => {
      try {
        r.stop();
      } catch {
        /* */
      }
    };
  }, [lang, continuous, interimResults]);

  const start = useCallback(() => {
    if (!recogRef.current) return;
    setInterim("");
    try {
      recogRef.current.start();
      setListening(true);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const stop = useCallback(() => {
    if (!recogRef.current) return;
    try {
      recogRef.current.stop();
    } catch {
      /* */
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, interim, start, stop, toggle };
}
