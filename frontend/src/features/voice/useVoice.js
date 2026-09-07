import { useRef } from "react";

export function useVoice() {

  const recognitionRef = useRef(null);

  const startListening = (onResult) => {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn(
        "Speech Recognition não disponível neste navegador."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {

      const transcript =
        event.results[0][0].transcript;

      onResult(transcript);
    };

    recognition.start();

    recognitionRef.current = recognition;
  };

  const stopListening = () => {

    recognitionRef.current?.stop();
  };

  return {
    startListening,
    stopListening
  };
}
