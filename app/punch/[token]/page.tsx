"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PunchPage() {
  const { token } = useParams();
  const [card, setCard] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "info" | "done"; text: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadCard() {
      const { data } = await supabase
        .from("cards")
        .select(`
          *,
          businesses:name,businesses:slug,businesses:color
        `)
        .eq("qr_token", token)
        .single();

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCard(data);

      // Get business details
      const { data: biz } = await supabase
        .from("businesses")
        .select("name, slug, color")
        .eq("id", data.business_id)
        .single();

      setBusiness(biz);
      setLoading(false);
    }
    if (token) loadCard();
  }, [token]);

  async function handlePunch() {
    if (!card || punching) return;
    setPunching(true);

    const { data, error } = await supabase.rpc("punch_card", { p_card_id: card.id });
    const result = data as any;

    if (error || !result.success) {
      setMessage({ type: "info", text: result?.error || "Something went wrong. Try again." });
    } else if (result.is_complete) {
      setMessage({ type: "done", text: `🎉 Card complete! Go redeem your ${card.reward}!` });
      setCard({ ...card, punches_remaining: 0, status: "completed" });
    } else {
      setMessage({ type: "success", text: `+1 punch! ${result.punches_remaining} more visit${result.punches_remaining !== 1 ? 's' : ''} until your ${card.reward}.` });
      setCard({ ...card, punches_remaining: result.punches_remaining });
      setTimeout(() => setMessage(null), 4000);
    }

    setPunching(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fffbeb' }}>
        <p style={{ color: '#78716c' }}>Loading card...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fffbeb', padding: '1.5rem', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.5rem' }}>Card not found</h1>
          <p style={{ color: '#78716c' }}>This card doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const punches = card.punch_count - card.punches_remaining;
  const isComplete = card.punches_remaining === 0;
  const isRedeemed = card.status === 'redeemed';
  const accentColor = business?.color || '#f59e0b';

  return (
    <div style={{ minHeight: '100vh', background: '#fffbeb', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{ width: '4rem', height: '4rem', background: accentColor, borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: '2rem', height: '2rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.25rem' }}>{business?.name || 'Loyalty Card'}</h1>
          <p style={{ fontSize: '0.9375rem', color: '#78716c' }}>{card.name}</p>
          {card.customer_name && (
            <p style={{ fontSize: '0.875rem', color: '#a8a29e', marginTop: '0.25rem' }}>Belongs to {card.customer_name}</p>
          )}
        </div>

        {/* Card */}
        <div style={{ background: '#ffffff', borderRadius: '1.5rem', padding: '2rem', border: `2px solid ${accentColor}22`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
          {/* Reward banner */}
          <div style={{ background: `${accentColor}15`, borderRadius: '0.75rem', padding: '0.875rem 1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#b45309', fontWeight: 600, marginBottom: '0.25rem' }}>Reward</p>
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1c1917' }}>{card.reward}</p>
          </div>

          {/* Description */}
          {card.description && (
            <p style={{ fontSize: '0.9375rem', color: '#57534e', textAlign: 'center', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {card.description}
            </p>
          )}

          {/* Punch dots */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {[...Array(card.punch_count)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: '2.5rem', height: '2.5rem',
                  borderRadius: '50%',
                  border: `2px solid ${i < punches ? accentColor : '#fde68a'}`,
                  background: i < punches ? accentColor : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i < punches ? 'white' : '#d97706',
                  fontSize: '0.875rem', fontWeight: 700,
                  transition: 'all 0.2s',
                }}
              >
                {i < punches ? (
                  <svg style={{ width: '1rem', height: '1rem' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (i + 1)}
              </div>
            ))}
          </div>

          {/* Status */}
          <div style={{ textAlign: 'center' }}>
            {isRedeemed ? (
              <div style={{ background: '#dcfce7', borderRadius: '0.75rem', padding: '0.875rem', color: '#15803d', fontWeight: 700, fontSize: '0.9375rem' }}>
                ✅ Redeemed! Enjoy your {card.reward}!
              </div>
            ) : isComplete ? (
              <div style={{ background: accentColor, borderRadius: '0.75rem', padding: '1.25rem', color: 'white', fontWeight: 700, fontSize: '1.0625rem' }}>
                🎉 Card complete!<br /><span style={{ fontWeight: 400, opacity: 0.9, fontSize: '0.9375rem' }}>Show this to claim your {card.reward}</span>
              </div>
            ) : (
              <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1c1917' }}>
                <span style={{ color: accentColor, fontSize: '1.5rem', fontWeight: 800 }}>{card.punches_remaining}</span><br />
                more visit{card.punches_remaining !== 1 ? 's' : ''} until reward
              </p>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            background: message.type === 'done' ? '#dcfce7' : message.type === 'success' ? '#fef3c7' : '#fee2e2',
            borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem',
            textAlign: 'center', fontSize: '1rem', fontWeight: 600, color: '#1c1917'
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
              width: '100%', padding: '1.125rem', borderRadius: '1rem',
              background: punching ? '#d97706' : accentColor,
              color: 'white', fontSize: '1.125rem', fontWeight: 700,
              border: 'none', cursor: punching ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s', boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
              opacity: punching ? 0.8 : 1,
            }}
          >
            {punching ? "Punching..." : "Punch this card"}
          </button>
        )}

        {/* Redeemed */}
        {isRedeemed && (
          <div style={{ textAlign: 'center', color: '#78716c', fontSize: '0.9375rem' }}>
            This card has been redeemed.
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8125rem', color: '#a8a29e' }}>
          Powered by <span style={{ fontWeight: 600, color: '#d97706' }}>Loyaly</span>
        </p>
      </div>
    </div>
  );
}
