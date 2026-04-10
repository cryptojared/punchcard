"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CustomerCard = {
  id: string;
  punches_remaining: number;
  total_punches: number;
  status: string;
  phone_hash: string;
};

type Promo = {
  id: string;
  business_id: string;
  name: string;
  description: string;
  punch_count: number;
  reward: string;
  color: string;
  qr_token: string;
  businesses: { name: string; color: string };
};

type Step = "loading" | "new_phone" | "code_entry" | "card";

export default function PunchPage() {
  const { token } = useParams();
  const [step, setStep] = useState<Step>("loading");
  const [promo, setPromo] = useState<Promo | null>(null);
  const [customerCard, setCustomerCard] = useState<CustomerCard | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [punching, setPunching] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "done" | "info"; text: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const codeRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Load promo and check for existing session
  useEffect(() => {
    async function load() {
      if (!token) return;

      const { data: promoData } = await supabase
        .from("promo_templates")
        .select("*, businesses(name, color)")
        .eq("qr_token", token)
        .single();

      if (!promoData) {
        setNotFound(true);
        setStep("loading");
        return;
      }

      setPromo(promoData);

      // Check localStorage for existing card
      const storageKey = `loyaly_card_${promoData.id}`;
      const savedCardId = localStorage.getItem(storageKey);

      if (savedCardId) {
        const { data: card } = await supabase
          .from("customer_cards")
          .select("*")
          .eq("id", savedCardId)
          .single();

        if (card && card.status !== "redeemed") {
          setCustomerCard(card);
          setStep("card");
          return;
        }
      }

      setStep("new_phone");
    }

    load();
  }, [token]);

  // Send verification code
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError("");

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setPhoneError("Enter a valid phone number");
      return;
    }

    const fullPhone = cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;
    setSending(true);

    try {
      const res = await fetch("/api/sms/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, promo_token: token }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPhoneError(data.error || "Failed to send code");
        return;
      }

      setStep("code_entry");
    } catch {
      setPhoneError("Something went wrong. Try again.");
    } finally {
      setSending(false);
    }
  }

  // Handle code input
  function handleCodeChange(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const newCode = [...code];
    newCode[idx] = val;
    setCode(newCode);

    if (val && idx < 3) {
      codeRefs[idx + 1].current?.focus();
    }

    if (newCode.every((d) => d !== "")) {
      verifyCode(newCode.join(""));
    }
  }

  function handleCodeKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      codeRefs[idx - 1].current?.focus();
    }
  }

  // Verify code
  async function verifyCode(fullCode: string) {
    setVerifying(true);
    setCodeError("");

    const cleaned = phone.replace(/\D/g, "");
    const fullPhone = cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;

    try {
      const res = await fetch("/api/sms/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, code: fullCode, promo_token: token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCodeError(data.error || "Invalid code");
        setCode(["", "", "", ""]);
        codeRefs[0].current?.focus();
        return;
      }

      // Save card ID to localStorage
      if (promo) {
        localStorage.setItem(`loyaly_card_${promo.id}`, data.customer_card_id);
      }
      setCustomerCard(data.customer_card);
      setStep("card");
    } catch {
      setCodeError("Verification failed. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  // Punch card
  async function handlePunch() {
    if (!customerCard || punching) return;
    setPunching(true);
    setMessage(null);

    try {
      const res = await fetch("/api/punch-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_card_id: customerCard.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "info", text: data.error || "Something went wrong." });
        return;
      }

      if (data.is_complete) {
        setMessage({ type: "done", text: `Your card is complete! Go claim your ${data.reward}.` });
        setCustomerCard({
          ...customerCard,
          punches_remaining: 0,
          status: "completed",
        });
      } else {
        setMessage({
          type: "success",
          text: `+1 punch! ${data.punches_remaining} more visit${data.punches_remaining !== 1 ? "s" : ""} until your ${data.reward}.`,
        });
        setCustomerCard({ ...customerCard, punches_remaining: data.punches_remaining });
        setTimeout(() => setMessage(null), 4000);
      }
    } catch {
      setMessage({ type: "info", text: "Something went wrong. Try again." });
    } finally {
      setPunching(false);
    }
  }

  // Resend code
  async function handleResend() {
    setCode(["", "", "", ""]);
    setCodeError("");
    setSending(true);
    setStep("new_phone");

    const cleaned = phone.replace(/\D/g, "");
    const fullPhone = cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;

    await fetch("/api/sms/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fullPhone, promo_token: token }),
    });

    setSending(false);
    setStep("code_entry");
  }

  const accentColor = promo?.businesses?.color || promo?.color || "#f59e0b";
  const businessName = promo?.businesses?.name || "this business";

  if (step === "loading" || !promo) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fffbeb" }}>
        <p style={{ color: "#78716c" }}>Loading card...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fffbeb", padding: "1.5rem", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>😕</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1c1917", marginBottom: "0.5rem" }}>Card not found</h1>
          <p style={{ color: "#78716c" }}>This card doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const punches = customerCard ? customerCard.total_punches - customerCard.punches_remaining : 0;
  const isComplete = customerCard?.punches_remaining === 0 && customerCard?.status !== "redeemed";
  const isRedeemed = customerCard?.status === "redeemed";

  return (
    <div style={{ minHeight: "100vh", background: "#fffbeb", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "420px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            <div style={{ width: "4rem", height: "4rem", background: accentColor, borderRadius: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg style={{ width: "2rem", height: "2rem", color: "white" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 800, color: "#1c1917", marginBottom: "0.25rem" }}>{businessName}</h1>
          <p style={{ fontSize: "0.9375rem", color: "#78716c" }}>{promo.name}</p>
        </div>

        {/* === STEP: NEW PHONE === */}
        {step === "new_phone" && (
          <div style={{ background: "#ffffff", borderRadius: "1.5rem", padding: "2rem", border: `2px solid ${accentColor}22`, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>👋</div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1c1917", marginBottom: "0.5rem" }}>Claim your card</h2>
              <p style={{ fontSize: "0.9375rem", color: "#78716c", lineHeight: 1.5 }}>
                Enter your phone number to get your own loyalty card for {promo.name}.
              </p>
            </div>

            {/* Reward preview */}
            <div style={{ background: `${accentColor}15`, borderRadius: "0.75rem", padding: "0.875rem 1rem", marginBottom: "1.5rem", textAlign: "center" }}>
              <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#b45309", fontWeight: 600, marginBottom: "0.25rem" }}>Earn</p>
              <p style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1c1917" }}>{promo.reward}</p>
            </div>

            <form onSubmit={handleSendCode}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#57534e", display: "block", marginBottom: "0.5rem" }}>
                Phone number
              </label>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: "100%", padding: "0.875rem 1rem", borderRadius: "0.75rem",
                  border: `1.5px solid ${phoneError ? "#ef4444" : "#fde68a"}`,
                  fontSize: "1.0625rem", outline: "none", boxSizing: "border-box",
                  marginBottom: "0.5rem",
                }}
              />
              {phoneError && (
                <p style={{ fontSize: "0.8125rem", color: "#ef4444", marginBottom: "0.75rem" }}>{phoneError}</p>
              )}
              <button
                type="submit"
                disabled={sending}
                style={{
                  width: "100%", padding: "1rem", borderRadius: "0.75rem",
                  background: sending ? "#d97706" : accentColor,
                  color: "white", fontSize: "1rem", fontWeight: 700,
                  border: "none", cursor: sending ? "not-allowed" : "pointer",
                  opacity: sending ? 0.8 : 1,
                }}
              >
                {sending ? "Sending code..." : "Text me a code"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.75rem", color: "#a8a29e", lineHeight: 1.4 }}>
              One text. That's it. No spam, no marketing texts.
            </p>
          </div>
        )}

        {/* === STEP: CODE ENTRY === */}
        {step === "code_entry" && (
          <div style={{ background: "#ffffff", borderRadius: "1.5rem", padding: "2rem", border: `2px solid ${accentColor}22`, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📱</div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1c1917", marginBottom: "0.5rem" }}>Check your phone</h2>
              <p style={{ fontSize: "0.9375rem", color: "#78716c", lineHeight: 1.5 }}>
                We sent a 4-digit code to<br />
                <strong style={{ color: "#1c1917" }}>{phone}</strong>
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1rem" }}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={codeRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  disabled={verifying}
                  style={{
                    width: "3.5rem", height: "3.5rem", textAlign: "center",
                    fontSize: "1.5rem", fontWeight: 700,
                    border: `2px solid ${codeError ? "#ef4444" : digit ? accentColor : "#fde68a"}`,
                    borderRadius: "0.75rem", outline: "none",
                    background: digit ? `${accentColor}15` : "#fff",
                    color: "#1c1917",
                  }}
                />
              ))}
            </div>

            {codeError && (
              <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#ef4444", marginBottom: "1rem" }}>{codeError}</p>
            )}

            {verifying && (
              <p style={{ textAlign: "center", fontSize: "0.9375rem", color: "#78716c", marginBottom: "1rem" }}>Verifying...</p>
            )}

            <button
              onClick={handleResend}
              style={{
                width: "100%", padding: "0.875rem", borderRadius: "0.75rem",
                background: "transparent", color: "#78716c",
                fontSize: "0.9375rem", fontWeight: 600,
                border: "1.5px solid #fde68a", cursor: "pointer",
              }}
            >
              Didn't get it? Resend
            </button>
          </div>
        )}

        {/* === STEP: CARD === */}
        {step === "card" && customerCard && (
          <>
            <div style={{ background: "#ffffff", borderRadius: "1.5rem", padding: "2rem", border: `2px solid ${accentColor}22`, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", marginBottom: "1.5rem" }}>
              {/* Reward banner */}
              <div style={{ background: `${accentColor}15`, borderRadius: "0.75rem", padding: "0.875rem 1rem", marginBottom: "1.5rem", textAlign: "center" }}>
                <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#b45309", fontWeight: 600, marginBottom: "0.25rem" }}>Reward</p>
                <p style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1c1917" }}>{promo.reward}</p>
              </div>

              {/* Description */}
              {promo.description && (
                <p style={{ fontSize: "0.9375rem", color: "#57534e", textAlign: "center", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                  {promo.description}
                </p>
              )}

              {/* Punch dots */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", marginBottom: "1.5rem" }}>
                {[...Array(customerCard.total_punches)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: "2.5rem", height: "2.5rem", borderRadius: "50%",
                      border: `2px solid ${i < punches ? accentColor : "#fde68a"}`,
                      background: i < punches ? accentColor : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: i < punches ? "white" : "#d97706",
                      fontSize: "0.875rem", fontWeight: 700,
                      transition: "all 0.2s",
                    }}
                  >
                    {i < punches ? (
                      <svg style={{ width: "1rem", height: "1rem" }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (i + 1)}
                  </div>
                ))}
              </div>

              {/* Status */}
              <div style={{ textAlign: "center" }}>
                {isRedeemed ? (
                  <div style={{ background: "#dcfce7", borderRadius: "0.75rem", padding: "0.875rem", color: "#15803d", fontWeight: 700, fontSize: "0.9375rem" }}>
                    Redeemed! Enjoy your {promo.reward}!
                  </div>
                ) : isComplete ? (
                  <div style={{ background: accentColor, borderRadius: "0.75rem", padding: "1.25rem", color: "white", fontWeight: 700, fontSize: "1.0625rem" }}>
                    Card complete!<br />
                    <span style={{ fontWeight: 400, opacity: 0.9, fontSize: "0.9375rem" }}>Show this to claim your {promo.reward}</span>
                  </div>
                ) : (
                  <p style={{ fontSize: "1rem", fontWeight: 600, color: "#1c1917" }}>
                    <span style={{ color: accentColor, fontSize: "1.5rem", fontWeight: 800 }}>{customerCard.punches_remaining}</span><br />
                    more visit{customerCard.punches_remaining !== 1 ? "s" : ""} until reward
                  </p>
                )}
              </div>
            </div>

            {/* Message */}
            {message && (
              <div style={{
                background: message.type === "done" ? "#dcfce7" : message.type === "success" ? "#fef3c7" : "#fee2e2",
                borderRadius: "0.75rem", padding: "1rem", marginBottom: "1rem",
                textAlign: "center", fontSize: "1rem", fontWeight: 600, color: "#1c1917",
              }}>
                {message.text}
              </div>
            )}

            {/* Punch button */}
            {!isComplete && !isRedeemed && (
              <button
                onClick={handlePunch}
                disabled={punching}
                style={{
                  width: "100%", padding: "1.125rem", borderRadius: "1rem",
                  background: punching ? "#d97706" : accentColor,
                  color: "white", fontSize: "1.125rem", fontWeight: 700,
                  border: "none", cursor: punching ? "not-allowed" : "pointer",
                  boxShadow: `0 4px 12px ${accentColor}50`,
                  opacity: punching ? 0.8 : 1,
                }}
              >
                {punching ? "Punching..." : "Punch this card"}
              </button>
            )}

            {/* Redeemed */}
            {isRedeemed && (
              <div style={{ textAlign: "center", color: "#78716c", fontSize: "0.9375rem" }}>
                This card has been redeemed.
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.8125rem", color: "#a8a29e" }}>
          Powered by <span style={{ fontWeight: 600, color: "#d97706" }}>Loyaly</span>
        </p>
      </div>
    </div>
  );
}
