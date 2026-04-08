"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { QRCodeSVG } from "qrcode.react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Card {
  id: string;
  name: string;
  description: string;
  punch_count: number;
  punches_remaining: number;
  reward: string;
  qr_token: string;
  customer_name: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formReward, setFormReward] = useState("");
  const [formPunches, setFormPunches] = useState("10");
  const [formCustomer, setFormCustomer] = useState("");
  const [punchMsg, setPunchMsg] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!biz) return;
      setBusinessId(biz.id);

      const { data: cardsData } = await supabase
        .from("cards")
        .select("*")
        .eq("business_id", biz.id)
        .order("created_at", { ascending: false });

      setCards(cardsData || []);
      setLoading(false);
    }
    load();
  }, []);

  async function createCard(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    const token = Array.from({ length: 16 }, () => Math.random().toString(36)[2]).join("");

    const { data, error } = await supabase.from("cards").insert({
      business_id: businessId,
      name: formName,
      description: formDesc,
      reward: formReward,
      punch_count: parseInt(formPunches),
      punches_remaining: parseInt(formPunches),
      qr_token: token,
      customer_name: formCustomer || null,
      status: "active",
    }).select().single();

    if (!error && data) {
      setCards([data, ...cards]);
      setShowCreate(false);
      setFormName(""); setFormDesc(""); setFormReward(""); setFormPunches("10"); setFormCustomer("");
    }
    setCreating(false);
  }

  async function punchCard(card: Card) {
    const { data, error } = await supabase.rpc("punch_card", { p_card_id: card.id });
    if (error) {
      setPunchMsg("Error punching card. Try again.");
      return;
    }
    const result = data as any;
    if (result.success) {
      setPunchMsg(
        result.is_complete
          ? `🎉 Card complete! Reward: ${result.reward}`
          : `Punched! ${result.punches_remaining} visits left.`
      );
      // Refresh cards
      const { data: updated } = await supabase.from("cards").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
      setCards(updated || []);
      setTimeout(() => setPunchMsg(""), 4000);
    } else {
      setPunchMsg(result.error);
      setTimeout(() => setPunchMsg(""), 3000);
    }
  }

  async function redeemCard(card: Card) {
    await supabase.from("cards").update({ status: "redeemed", redeemed_at: new Date().toISOString() }).eq("id", card.id);
    const { data: updated } = await supabase.from("cards").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    setCards(updated || []);
    setPunchMsg(`✅ Redeemed! Give them their ${card.reward}`);
    setTimeout(() => setPunchMsg(""), 4000);
  }

  function getStatusBadge(status: string) {
    if (status === "completed") return "badge badge-amber";
    if (status === "redeemed") return "badge badge-green";
    return "badge badge-amber";
  }

  const publicUrl = typeof window !== "undefined" ? window.location.origin : "https://punchcard.app";

  return (
    <div style={{ padding: '2rem 2.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1c1917' }}>Your Loyalty Cards</h1>
          <p style={{ color: '#78716c', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
            {cards.length} card{cards.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <svg style={{ width: '1.125rem', height: '1.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New card
        </button>
      </div>

      {/* Punch feedback */}
      {punchMsg && (
        <div style={{ background: punchMsg.includes("Redeemed") || punchMsg.includes("🎉") ? '#dcfce7' : '#fef3c7', border: `1px solid ${punchMsg.includes("Redeemed") || punchMsg.includes("🎉") ? '#86efac' : '#fde68a'}`, borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.9375rem', fontWeight: 600, color: '#1c1917' }}>
          {punchMsg}
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#78716c' }}>Loading...</div>
      ) : cards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', background: '#ffffff', borderRadius: '1rem', border: '2px dashed #fde68a' }}>
          <div style={{ width: '4rem', height: '4rem', background: '#fef3c7', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <svg style={{ width: '2rem', height: '2rem', color: '#f59e0b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1c1917', marginBottom: '0.5rem' }}>No cards yet</h2>
          <p style={{ color: '#78716c', marginBottom: '1.5rem' }}>Create your first loyalty card in under a minute.</p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>Create your first card</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {cards.map((card) => {
            const punches = card.punch_count - card.punches_remaining;
            const isComplete = card.punches_remaining === 0 && card.status !== 'redeemed';
            const isRedeemed = card.status === 'redeemed';

            return (
              <div key={card.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#1c1917' }}>{card.name}</h3>
                      <span className={getStatusBadge(card.status)}>{card.status}</span>
                    </div>
                    {card.customer_name && (
                      <p style={{ fontSize: '0.8125rem', color: '#78716c' }}>{card.customer_name}</p>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: '#78716c' }}>
                    {card.punch_count} punches
                  </span>
                </div>

                {card.description && (
                  <p style={{ fontSize: '0.875rem', color: '#57534e', marginBottom: '1rem' }}>{card.description}</p>
                )}

                {/* Progress dots */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
                  {[...Array(card.punch_count)].map((_, i) => (
                    <div key={i} className={`punch-dot ${i < punches ? 'filled' : ''}`}>
                      {i < punches ? '✓' : ''}
                    </div>
                  ))}
                </div>

                {/* Punches remaining */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#78716c' }}>
                    {card.punches_remaining === 0
                      ? <span style={{ color: '#d97706', fontWeight: 600 }}>Ready to redeem!</span>
                      : `${card.punches_remaining} punch${card.punches_remaining !== 1 ? 'es' : ''} left`}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: '#a8a29e' }}>Reward: <strong style={{ color: '#b45309' }}>{card.reward}</strong></span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {card.status === 'active' && card.punches_remaining > 0 && (
                    <button
                      className="btn-primary"
                      style={{ flex: 1, justifyContent: 'center', padding: '0.625rem', fontSize: '0.9375rem' }}
                      onClick={() => punchCard(card)}
                    >
                      Punch
                    </button>
                  )}
                  {isComplete && (
                    <button
                      className="btn-primary"
                      style={{ flex: 1, justifyContent: 'center', padding: '0.625rem', fontSize: '0.9375rem', background: '#16a34a' }}
                      onClick={() => redeemCard(card)}
                    >
                      Redeem
                    </button>
                  )}
                  {card.status === 'active' && (
                    <button
                      className="btn-secondary"
                      style={{ padding: '0.625rem', flex: 1, justifyContent: 'center', fontSize: '0.9375rem' }}
                      onClick={() => setSelectedCard(card)}
                    >
                      QR
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Card Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }} onClick={() => setShowCreate(false)}>
          <div style={{ background: '#ffffff', borderRadius: '1.25rem', padding: '2rem', width: '100%', maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.25rem' }}>New Loyalty Card</h2>
            <p style={{ fontSize: '0.9375rem', color: '#78716c', marginBottom: '1.5rem' }}>Fill in the details below.</p>

            <form onSubmit={createCard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Card name *</label>
                <input className="input" placeholder="e.g. Coffee Loyalty" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" placeholder="e.g. Buy 10, get 1 free" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Punch count *</label>
                  <input className="input" type="number" min="3" max="20" value={formPunches} onChange={(e) => setFormPunches(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Customer name</label>
                  <input className="input" placeholder="Optional" value={formCustomer} onChange={(e) => setFormCustomer(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Reward *</label>
                <input className="input" placeholder="e.g. Free coffee, 20% off" value={formReward} onChange={(e) => setFormReward(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={creating}>
                  {creating ? "Creating..." : "Create card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {selectedCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }} onClick={() => setSelectedCard(null)}>
          <div style={{ background: '#ffffff', borderRadius: '1.25rem', padding: '2rem', width: '100%', maxWidth: '360px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1c1917', marginBottom: '0.25rem' }}>{selectedCard.name}</h2>
            <p style={{ fontSize: '0.875rem', color: '#78716c', marginBottom: '1.5rem' }}>
              {selectedCard.customer_name ? `${selectedCard.customer_name} · ` : ''}{selectedCard.reward}
            </p>
            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '1rem', display: 'inline-block', border: '1px solid #fde68a', marginBottom: '1rem' }}>
              <QRCodeSVG
                value={`${publicUrl}/punch/${selectedCard.qr_token}`}
                size={200}
                level="H"
                fgColor="#1c1917"
              />
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#a8a29e', marginBottom: '0.25rem' }}>Customer scans this to open their card</p>
            <p style={{ fontSize: '0.75rem', color: '#d4d4d4', wordBreak: 'break-all' }}>
              {publicUrl}/punch/{selectedCard.qr_token}
            </p>
            <button className="btn-secondary" style={{ marginTop: '1.25rem', width: '100%', justifyContent: 'center' }} onClick={() => setSelectedCard(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
