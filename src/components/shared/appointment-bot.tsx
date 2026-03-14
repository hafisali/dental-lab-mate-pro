"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

type BotStep =
  | "GREETING"
  | "BOOK_SELECT_SERVICE"
  | "BOOK_SELECT_DATE"
  | "BOOK_SELECT_TIME"
  | "BOOK_NAME"
  | "BOOK_PHONE"
  | "BOOK_CONFIRM"
  | "BOOK_DONE"
  | "CHECK_STATUS_PHONE"
  | "CHECK_STATUS_RESULT"
  | "CANCEL_REF"
  | "CANCEL_RESULT";

interface QuickButton {
  label: string;
  value: string;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: "bot" | "user";
  buttons?: QuickButton[];
  isDateInput?: boolean;
}

interface BookingData {
  service?: string;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
}

export default function AppointmentBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<BotStep>("GREETING");
  const [bookingData, setBookingData] = useState<BookingData>({});
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      hasInitialized.current = true;
      addBotMessage(
        "Hi! I'm your dental appointment assistant. How can I help you?",
        [
          { label: "Book Appointment", value: "book" },
          { label: "Check Status", value: "check" },
          { label: "Cancel Appointment", value: "cancel" },
        ]
      );
    }
  }, [isOpen]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addBotMessage = (
    text: string,
    buttons?: QuickButton[],
    isDateInput?: boolean
  ) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: generateId(), text, sender: "bot", buttons, isDateInput },
      ]);
    }, 500);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: generateId(), text, sender: "user" },
    ]);
  };

  const resetChat = () => {
    setMessages([]);
    setBookingData({});
    setCurrentStep("GREETING");
    hasInitialized.current = false;
    addBotMessage(
      "Hi! I'm your dental appointment assistant. How can I help you?",
      [
        { label: "Book Appointment", value: "book" },
        { label: "Check Status", value: "check" },
        { label: "Cancel Appointment", value: "cancel" },
      ]
    );
    hasInitialized.current = true;
  };

  const handleButtonClick = (value: string, label: string) => {
    addUserMessage(label);
    processInput(value);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const formatted = new Date(dateValue + "T00:00:00").toLocaleDateString(
        "en-US",
        { weekday: "short", month: "short", day: "numeric", year: "numeric" }
      );
      addUserMessage(formatted);
      processInput(dateValue);
    }
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    addUserMessage(text);
    processInput(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  const processInput = async (value: string) => {
    switch (currentStep) {
      case "GREETING":
        if (value === "book") {
          setCurrentStep("BOOK_SELECT_SERVICE");
          addBotMessage("What service do you need?", [
            { label: "Crown & Bridge", value: "Crown & Bridge" },
            { label: "Dentures", value: "Dentures" },
            { label: "Implants", value: "Implants" },
            { label: "Orthodontics", value: "Orthodontics" },
            { label: "General Checkup", value: "General Checkup" },
            { label: "Other", value: "Other" },
          ]);
        } else if (value === "check") {
          setCurrentStep("CHECK_STATUS_PHONE");
          addBotMessage("Please enter your phone number to check your appointment status:");
        } else if (value === "cancel") {
          setCurrentStep("CANCEL_REF");
          addBotMessage("Please enter your appointment reference number (e.g., APT-XXXXXX):");
        }
        break;

      case "BOOK_SELECT_SERVICE":
        setBookingData((prev) => ({ ...prev, service: value }));
        setCurrentStep("BOOK_SELECT_DATE");
        addBotMessage("Please select a preferred date:", undefined, true);
        break;

      case "BOOK_SELECT_DATE":
        setBookingData((prev) => ({ ...prev, date: value }));
        setCurrentStep("BOOK_SELECT_TIME");
        addBotMessage("Choose a time slot:", [
          { label: "9:00 AM", value: "9:00 AM" },
          { label: "10:00 AM", value: "10:00 AM" },
          { label: "11:00 AM", value: "11:00 AM" },
          { label: "2:00 PM", value: "2:00 PM" },
          { label: "3:00 PM", value: "3:00 PM" },
          { label: "4:00 PM", value: "4:00 PM" },
        ]);
        break;

      case "BOOK_SELECT_TIME":
        setBookingData((prev) => ({ ...prev, time: value }));
        setCurrentStep("BOOK_NAME");
        addBotMessage("What's your full name?");
        break;

      case "BOOK_NAME":
        setBookingData((prev) => ({ ...prev, name: value }));
        setCurrentStep("BOOK_PHONE");
        addBotMessage("What's your phone number?");
        break;

      case "BOOK_PHONE": {
        const updatedData = { ...bookingData, phone: value };
        setBookingData(updatedData);
        setCurrentStep("BOOK_CONFIRM");
        const dateFormatted = updatedData.date
          ? new Date(updatedData.date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : updatedData.date;
        addBotMessage(
          `Please confirm your appointment:\n\nService: ${updatedData.service}\nDate: ${dateFormatted}\nTime: ${updatedData.time}\nName: ${updatedData.name}\nPhone: ${value}`,
          [
            { label: "Confirm", value: "confirm" },
            { label: "Start Over", value: "restart" },
          ]
        );
        break;
      }

      case "BOOK_CONFIRM":
        if (value === "confirm") {
          setCurrentStep("BOOK_DONE");
          setIsTyping(true);
          try {
            const res = await fetch("/api/appointment-bot", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bookingData),
            });
            const data = await res.json();
            setIsTyping(false);
            if (data.success) {
              setMessages((prev) => [
                ...prev,
                {
                  id: generateId(),
                  text: `Your appointment has been booked!\n\nReference: ${data.reference}\n\nYou'll receive a confirmation shortly.`,
                  sender: "bot",
                  buttons: [{ label: "Start Over", value: "restart" }],
                },
              ]);
            } else {
              setMessages((prev) => [
                ...prev,
                {
                  id: generateId(),
                  text: `Sorry, something went wrong: ${data.error || "Please try again."}`,
                  sender: "bot",
                  buttons: [{ label: "Start Over", value: "restart" }],
                },
              ]);
            }
          } catch {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                text: "Sorry, there was a network error. Please try again later.",
                sender: "bot",
                buttons: [{ label: "Start Over", value: "restart" }],
              },
            ]);
          }
        } else {
          resetChat();
        }
        break;

      case "BOOK_DONE":
        if (value === "restart") resetChat();
        break;

      case "CHECK_STATUS_PHONE": {
        setCurrentStep("CHECK_STATUS_RESULT");
        setIsTyping(true);
        try {
          const res = await fetch(
            `/api/appointment-bot?phone=${encodeURIComponent(value)}`
          );
          const data = await res.json();
          setIsTyping(false);
          if (data.success && data.appointments.length > 0) {
            const list = data.appointments
              .map(
                (apt: any) =>
                  `Ref: ${apt.reference}\nService: ${apt.service}\nDate: ${apt.date}\nTime: ${apt.time}\nStatus: ${apt.status}`
              )
              .join("\n\n---\n\n");
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                text: `Found ${data.appointments.length} appointment(s):\n\n${list}`,
                sender: "bot",
                buttons: [{ label: "Start Over", value: "restart" }],
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                text: "No upcoming appointments found for this phone number.",
                sender: "bot",
                buttons: [{ label: "Start Over", value: "restart" }],
              },
            ]);
          }
        } catch {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              text: "Sorry, there was a network error. Please try again later.",
              sender: "bot",
              buttons: [{ label: "Start Over", value: "restart" }],
            },
          ]);
        }
        break;
      }

      case "CHECK_STATUS_RESULT":
        if (value === "restart") resetChat();
        break;

      case "CANCEL_REF": {
        setCurrentStep("CANCEL_RESULT");
        setIsTyping(true);
        try {
          const res = await fetch(
            `/api/appointment-bot?ref=${encodeURIComponent(value)}`,
            { method: "DELETE" }
          );
          const data = await res.json();
          setIsTyping(false);
          if (data.success) {
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                text: "Your appointment has been cancelled successfully.",
                sender: "bot",
                buttons: [{ label: "Start Over", value: "restart" }],
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                text: `Could not cancel: ${data.error || "Appointment not found."}`,
                sender: "bot",
                buttons: [{ label: "Start Over", value: "restart" }],
              },
            ]);
          }
        } catch {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              text: "Sorry, there was a network error. Please try again later.",
              sender: "bot",
              buttons: [{ label: "Start Over", value: "restart" }],
            },
          ]);
        }
        break;
      }

      case "CANCEL_RESULT":
        if (value === "restart") resetChat();
        break;
    }
  };

  const showTextInput =
    currentStep === "BOOK_NAME" ||
    currentStep === "BOOK_PHONE" ||
    currentStep === "CHECK_STATUS_PHONE" ||
    currentStep === "CANCEL_REF";

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 16,
            width: 350,
            height: 500,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
            borderRadius: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}
          className="appointment-bot-panel"
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: "#0e4a7b",
              color: "#ffffff",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MessageCircle size={18} />
              <span style={{ fontWeight: 600, fontSize: 15 }}>
                Appointment Assistant
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              backgroundColor: "#f8f9fa",
            }}
          >
            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      msg.sender === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 14px",
                      borderRadius:
                        msg.sender === "user"
                          ? "12px 12px 2px 12px"
                          : "12px 12px 12px 2px",
                      backgroundColor:
                        msg.sender === "user" ? "#1976d2" : "#e8e8e8",
                      color: msg.sender === "user" ? "#ffffff" : "#1a1a1a",
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: "pre-line",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>

                {/* Quick Reply Buttons */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 8,
                    }}
                  >
                    {msg.buttons.map((btn) => (
                      <button
                        key={btn.value}
                        onClick={() => handleButtonClick(btn.value, btn.label)}
                        style={{
                          padding: "6px 14px",
                          fontSize: 13,
                          border: "1px solid #1976d2",
                          borderRadius: 20,
                          backgroundColor: "#ffffff",
                          color: "#1976d2",
                          cursor: "pointer",
                          fontWeight: 500,
                          transition: "background-color 0.15s, color 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#1976d2";
                          e.currentTarget.style.color = "#ffffff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#ffffff";
                          e.currentTarget.style.color = "#1976d2";
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Date Input */}
                {msg.isDateInput && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      onChange={handleDateChange}
                      style={{
                        padding: "8px 12px",
                        fontSize: 14,
                        border: "1px solid #1976d2",
                        borderRadius: 8,
                        color: "#1a1a1a",
                        backgroundColor: "#ffffff",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "10px 18px",
                    borderRadius: "12px 12px 12px 2px",
                    backgroundColor: "#e8e8e8",
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  <span className="typing-dot" style={{ animationDelay: "0ms" }} />
                  <span className="typing-dot" style={{ animationDelay: "150ms" }} />
                  <span className="typing-dot" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {showTextInput && (
            <div
              style={{
                padding: "10px 12px",
                borderTop: "1px solid #e0e0e0",
                display: "flex",
                gap: 8,
                backgroundColor: "#ffffff",
                flexShrink: 0,
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentStep === "BOOK_NAME"
                    ? "Enter your full name..."
                    : currentStep === "BOOK_PHONE"
                    ? "Enter your phone number..."
                    : currentStep === "CHECK_STATUS_PHONE"
                    ? "Enter your phone number..."
                    : "Enter reference (APT-XXXXXX)..."
                }
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  fontSize: 14,
                  border: "1px solid #d0d0d0",
                  borderRadius: 8,
                  outline: "none",
                  color: "#1a1a1a",
                  backgroundColor: "#ffffff",
                }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                style={{
                  padding: "8px 12px",
                  backgroundColor: inputValue.trim() ? "#1976d2" : "#b0bec5",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  cursor: inputValue.trim() ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: "#1976d2",
          color: "#ffffff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 12px rgba(25,118,210,0.4)",
          zIndex: 9999,
          transition: "transform 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Typing dots animation + responsive styles */}
      <style jsx global>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .typing-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: #888;
          animation: typingBounce 1.2s infinite;
        }
        @media (max-width: 480px) {
          .appointment-bot-panel {
            width: calc(100vw - 32px) !important;
            height: calc(100vh - 120px) !important;
            bottom: 80px !important;
            right: 16px !important;
            left: 16px !important;
          }
        }
      `}</style>
    </>
  );
}
