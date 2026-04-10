"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { QRCodeSVG } from "qrcode.react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PromoTemplate {
  id: string;
  name: string;
  description: string;
  punch_count: number;
  reward: string;
  qr_token: string;
  color: string;
  active: boolean;
  created_at: string;
  customer_count?: number;
  completed_count?: number;
}

interface CustomerCard {
  id: string;
  promo_id: string;
  phone_hash: string;
  punches_remaining: number;
  total_punches: number;
  status: string;
  last_punched_at: string;
  created_at: string;
  promo_name?: string;
  promo_reward?: string;
}

export default function DashboardPage() {
  const [tab, setTab] = useState<"promos" | "customers">("promos");
  const [promos, setPromos] = useState<PromoTemplate[]>([]);
  const [customers, setCustomers] = useState<CustomerCard[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<PromoTemplate | null>(null);
  const [punchMsg, setPunchMsg] = useState("");
  const [businessPlan, setBusinessPlan] = useState<"free" | "pro">("free");
  const [businessName, setBusinessName] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formReward, setFormReward] = useState("");
  const [formPunches, setFormPunches] = useState("10");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data: biz } = await supabase
        .from("businesses")
        .select("id, name, plan, stripe_customer_id")
        .eq("owner_id", user.id)
        .single();

      if (!biz) {
        const slug = user.email?.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase() || "my-business";
        const { data: newBiz } = await supabase
          .from("businesses")
          .insert({
            owner_id: user.id,
            name: user.user_metadata?.full_name || "My Business",
            email: user.email || "",
            slug: slug + "-" + Math.random().toString(36).slice(2, 6),
            plan: "free",
          })
          .select("id, name, plan, stripe_customer_id")
          .single();
        biz = newBiz;
      }

      if (!biz) return;
      setBusinessId(biz.id);
      setBusinessPlan(biz.plan as "free" | "pro" || "free");
      setBusinessName(biz.name || "");

      // Load promos
      const { data: promosData } = await supabase
        .from("promo_templates")
        .select("*")
        .eq("business_id", biz.id)
        .order("created_at", { ascending: false });

      // Get customer counts per promo
      const promosWithCounts = await Promise.all(
        (promosData || []).map(async (promo) => {
          const { count: total } = await supabase
            .from("customer_cards")
            .select("*", { count: "exact", head: true })
            .eq("promo_id", promo.id);
          const { count: completed } = await supabase
            .from("customer_cards")
            .select("*", { count: "exact", head: true })
            .eq("promo_id", promo.id)
            .eq("status", "completed");
          return { ...promo, customer_count: total || 0, completed_count: completed || 0 };
        })
      );

      setPromos(promosWithCounts);

      // Load all customers
      const { data: customerData } = await supabase
        .from("customer_cards")
        .select("*, promo_templates:promo_id(name, reward)")
        .eq("business_id", biz.id)
        .order("created_at", { ascending: false });

      setCustomers(
        (customerData || []).map((c: any) => ({
          ...c,
          promo_name: c.promo_templates?.name,
          promo_reward: c.promo_templates?.reward,
        }))
      );

      setLoading(false);
    }
    load();
  }, []);

  async function createPromo(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    const token = Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join("");

    const { data, error } = await supabase
      .from("promo_templates")
      .insert({
        business_id: businessId,
        name: formName,
        description: formDesc,
        reward: formReward,
        punch_count: parseInt(formPunches),
        qr_token: token,
        active: true,
      })
      .select()
      .single();

    if (!error && data) {
      setPromos([{ ...data, customer_count: 0, completed_count: 0 }, ...promos]);
      setShowCreate(false);
      setFormName(""); setFormDesc(""); setFormReward(""); setFormPunches("10");
    }
    setCreating(false);
  }

  async function punchCustomerCard(card: CustomerCard) {
    const { data, error } = await supabase.rpc("punch_customer_card", { p_customer_card_id: card.id });
    const result = data as any;

    if (error || !result?.success) {
      setPunchMsg(result?.error || "Error punching card.");
      setTimeout(() => setPunchMsg(""), 3000);
      return;
    }

    if (result.is_complete) {
      setPunchMsg(`Card complete! Reward: ${result.reward}`);
    } else {
      setPunchMsg(`Punched! ${result.punches_remaining} visits left.`);
    }

    // Refresh customers
    const { data: updated } = await supabase
      .from("customer_cards")
      .select("*, promo_templates:promo_id(name, reward)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    setCustomers(
      (updated || []).map((c: any) => ({
        ...c,
        promo_name: c.promo_templates?.name,
        promo_reward: c.promo_templates?.reward,
      }))
    );

    setTimeout(() => setPunchMsg(""), 4000);
  }

  async function redeemCard(card: CustomerCard) {
    await supabase
      .from("customer_cards")
      .update({ status: "redeemed" })
      .eq("id", card.id);

    const { data: updated } = await supabase
      .from("customer_cards")
      .select("*, promo_templates:promo_id(name, reward)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    setCustomers(
      (updated || []).map((c: any) => ({
        ...c,
        promo_name: c.promo_templates?.name,
        promo_reward: c.promo_templates?.reward,
      }))
    );

    setPunchMsg(`Redeemed! Give them their ${card.promo_reward}`);
    setTimeout(() => setPunchMsg(""), 4000);
  }

  async function startSubscription() {
    setSubscribing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, businessId }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setSubscribing(false);
    }
  }

  async function manageSubscription() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, businessId }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  // Mask phone for display
  function maskPhone(hash: string): string {
    // We don't store raw phone, but we can show a masked version
    // Using last 4 chars of hash as a pseudo identifier
    const last4 = hash.slice(-4).toUpperCase();
    return `***-***-${last4}`;
  }

  function getStatusBadge(status: string) {
    if (status === "completed") return <span className="badge badge-amber">Complete</span>;
    if (status === "redeemed") return <span className="badge badge-green">Redeemed</span>;
    return <span className="badge badge-amber">Active</span>;
  }

  const publicUrl = typeof window !== "undefined" ? window.location.origin : "https://www.loyaly.vip";

  return (
    <div style={{ padding: "2rem 2.5rem" }}>
      {/* Subscription Banner */}
      {businessPlan === "free" && (
        <div style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "2px solid #f59e0b", borderRadius: "1rem", padding: "1.25rem 1.5rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontWeight: 700, color: "#1c1917", marginBottom: "0.125rem" }}>Start your free trial</p>
            <p style={{ fontSize: "0.875rem", color: "#78716c" }}>Create loyalty cards, collect customers, and grow repeat visits.</p>
          </div>
          <button onClick={startSubscription} disabled={subscribing} style={{ background: "#f59e0b", color: "#fff", fontWeight: 700, padding: "0.625rem 1.25rem", borderRadius: "0.625rem", fontSize: "0.9375rem", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
            {subscribing ? "Redirecting..." : "Start free trial →"}
          </button>
        </div>
      )}
      {businessPlan === "pro" && (
        <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: "1rem", padding: "1rem 1.5rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🎉</span>
            <p style={{ fontWeight: 700, color: "#166534", fontSize: "0.9375rem" }}>Loyaly Pro — 30-day free trial active</p>
          </div>
          <button onClick={manageSubscription} style={{ background: "#fff", color: "#166534", fontWeight: 600, padding: "0.5rem 1rem", borderRadius: "0.5rem", fontSize: "0.875rem", border: "1px solid #86efac", cursor: "pointer" }}>
            Manage subscription
          </button>
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "2rem", background: "#f5f5f4", borderRadius: "0.75rem", padding: "0.25rem", width: "fit-content" }}>
        <button
          onClick={() => setTab("promos")}
          style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", fontSize: "0.9375rem", fontWeight: 600, border: "none", cursor: "pointer", background: tab === "promos" ? "#ffffff" : "transparent", color: tab === "promos" ? "#1c1917" : "#78716c", boxShadow: tab === "promos" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}
        >
          Loyalty Cards
        </button>
        <button
          onClick={() => setTab("customers")}
          style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", fontSize: "0.9375rem", fontWeight: 600, border: "none", cursor: "pointer", background: tab === "customers" ? "#ffffff" : "transparent", color: tab === "customers" ? "#1c1917" : "#78716c", boxShadow: tab === "customers" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}
        >
          Customers ({customers.length})
        </button>
      </div>

      {/* === PROMOS TAB === */}
      {tab === "promos" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1c1917" }}>{businessName || "Your"} Loyalty Cards</h1>
              <p style={{ color: "#78716c", fontSize: "0.9375rem", marginTop: "0.25rem" }}>
                {promos.length} card{promos.length !== 1 ? "s" : ""} · {customers.length} total customer{customers.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <svg style={{ width: "1.125rem", height: "1.125rem" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New card
            </button>
          </div>

          {punchMsg && (
            <div style={{ background: punchMsg.includes("Redeemed") || punchMsg.includes("complete") ? "#dcfce7" : "#fef3c7", border: "1px solid", borderColor: punchMsg.includes("Redeemed") || punchMsg.includes("complete") ? "#86efac" : "#fde68a", borderRadius: "0.75rem", padding: "0.875rem 1.25rem", marginBottom: "1.5rem", fontSize: "0.9375rem", fontWeight: 600, color: "#1c1917" }}>
              {punchMsg}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "#78716c" }}>Loading...</div>
          ) : promos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#fff", borderRadius: "1rem", border: "2px dashed #fde68a" }}>
              <div style={{ width: "4rem", height: "4rem", background: "#fef3c7", borderRadius: "1rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                <svg style={{ width: "2rem", height: "2rem", color: "#f59e0b" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1c1917", marginBottom: "0.5rem" }}>No loyalty cards yet</h2>
              <p style={{ color: "#78716c", marginBottom: "1.5rem" }}>Create your first card and share the QR code with your customers.</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>Create your first card</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
              {promos.map((promo) => (
                <div key={promo.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.875rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#1c1917" }}>{promo.name}</h3>
                      {promo.description && <p style={{ fontSize: "0.8125rem", color: "#78716c", marginTop: "0.125rem" }}>{promo.description}</p>}
                    </div>
                    <span style={{ fontSize: "0.8125rem", color: "#78716c" }}>{promo.punch_count} punches</span>
                  </div>

                  {/* Stats */}
                  <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", padding: "0.75rem", background: "#fef3c7", borderRadius: "0.5rem" }}>
                    <div>
                      <p style={{ fontSize: "1.25rem", fontWeight: 800, color: "#d97706" }}>{promo.customer_count || 0}</p>
                      <p style={{ fontSize: "0.75rem", color: "#78716c" }}>customers</p>
                    </div>
                    <div>
                      <p style={{ fontSize: "1.25rem", fontWeight: 800, color: "#16a34a" }}>{promo.completed_count || 0}</p>
                      <p style={{ fontSize: "0.75rem", color: "#78716c" }}>completed</p>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                      <p style={{ fontSize: "0.8125rem", color: "#a8a29e" }}>Reward: <strong style={{ color: "#b45309" }}>{promo.reward}</strong></p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn-primary" style={{ flex: 1, justifyContent: "center", padding: "0.625rem", fontSize: "0.9375rem" }} onClick={() => setSelectedPromo(promo)}>
                      Show QR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* === CUSTOMERS TAB === */}
      {tab === "customers" && (
        <>
          <div style={{ marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1c1917" }}>Your Customers</h1>
            <p style={{ color: "#78716c", fontSize: "0.9375rem", marginTop: "0.25rem" }}>
              {customers.length} customer{customers.length !== 1 ? "s" : ""} across all cards
            </p>
          </div>

          {punchMsg && (
            <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "0.75rem", padding: "0.875rem 1.25rem", marginBottom: "1.5rem", fontSize: "0.9375rem", fontWeight: 600, color: "#1c1917" }}>
              {punchMsg}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "#78716c" }}>Loading...</div>
          ) : customers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#fff", borderRadius: "1rem", border: "2px dashed #fde68a" }}>
              <div style={{ width: "4rem", height: "4rem", background: "#fef3c7", borderRadius: "1rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                <svg style={{ width: "2rem", height: "2rem", color: "#f59e0b" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                </svg>
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1c1917", marginBottom: "0.5rem" }}>No customers yet</h2>
              <p style={{ color: "#78716c", marginBottom: "1rem" }}>Share your QR code with customers. They'll text their phone to claim a card.</p>
              <p style={{ color: "#a8a29e", fontSize: "0.875rem" }}>Cards you've created show up here once customers scan and register.</p>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: "1rem", border: "1px solid #fde68a", overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1.5fr", gap: "1rem", padding: "0.75rem 1.25rem", background: "#fef3c7", fontSize: "0.8125rem", fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <span>Customer</span>
                <span>Card</span>
                <span>Punches</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {customers.map((customer) => {
                const punches = customer.total_punches - customer.punches_remaining;
                const isComplete = customer.punches_remaining === 0 && customer.status !== "redeemed";

                return (
                  <div key={customer.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1.5fr", gap: "1rem", padding: "1rem 1.25rem", borderBottom: "1px solid #f5f5f4", alignItems: "center", fontSize: "0.9375rem" }}>
                    <div>
                      <p style={{ fontWeight: 600, color: "#1c1917" }}>{maskPhone(customer.phone_hash)}</p>
                      <p style={{ fontSize: "0.75rem", color: "#a8a29e" }}>
                        {customer.last_punched_at ? `Last visit: ${new Date(customer.last_punched_at).toLocaleDateString()}` : `Added: ${new Date(customer.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: "#1c1917" }}>{customer.promo_name || "—"}</p>
                      <p style={{ fontSize: "0.75rem", color: "#a8a29e" }}>{customer.promo_reward}</p>
                    </div>
                    <div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {[...Array(Math.min(customer.total_punches, 10))].map((_, i) => (
                          <div key={i} style={{ width: "0.6rem", height: "0.6rem", borderRadius: "50%", background: i < punches ? "#f59e0b" : "#fde68a" }} />
                        ))}
                        {customer.total_punches > 10 && <span style={{ fontSize: "0.6875rem", color: "#a8a29e" }}>+{customer.total_punches - 10}</span>}
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "#78716c", marginTop: "0.25rem" }}>{customer.punches_remaining} left</p>
                    </div>
                    <div>{getStatusBadge(customer.status)}</div>
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      {customer.status === "active" && customer.punches_remaining > 0 && (
                        <button className="btn-primary" style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem", flex: 1, justifyContent: "center" }} onClick={() => punchCustomerCard(customer)}>
                          Punch
                        </button>
                      )}
                      {isComplete && (
                        <button className="btn-primary" style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem", background: "#16a34a", flex: 1, justifyContent: "center" }} onClick={() => redeemCard(customer)}>
                          Redeem
                        </button>
                      )}
                      {!isComplete && customer.status === "active" && customer.punches_remaining > 0 && (
                        <span style={{ fontSize: "0.75rem", color: "#a8a29e", alignSelf: "center" }}>—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create Promo Modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }} onClick={() => setShowCreate(false)}>
          <div style={{ background: "#fff", borderRadius: "1.25rem", padding: "2rem", width: "100%", maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 800, color: "#1c1917", marginBottom: "0.25rem" }}>New Loyalty Card</h2>
            <p style={{ fontSize: "0.9375rem", color: "#78716c", marginBottom: "1.5rem" }}>Create a card template. Share the QR — customers register themselves.</p>

            <form onSubmit={createPromo} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="label">Card name *</label>
                <input className="input" placeholder="e.g. Coffee Loyalty" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" placeholder="e.g. Buy 10, get 1 free" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="label">Punch count *</label>
                  <input className="input" type="number" min="3" max="20" value={formPunches} onChange={(e) => setFormPunches(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Reward *</label>
                  <input className="input" placeholder="e.g. Free coffee" value={formReward} onChange={(e) => setFormReward(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: "center" }} disabled={creating}>
                  {creating ? "Creating..." : "Create card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {selectedPromo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }} onClick={() => setSelectedPromo(null)}>
          <div style={{ background: "#fff", borderRadius: "1.25rem", padding: "2rem", width: "100%", maxWidth: "360px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1c1917", marginBottom: "0.25rem" }}>{selectedPromo.name}</h2>
            <p style={{ fontSize: "0.875rem", color: "#78716c", marginBottom: "1.5rem" }}>{selectedPromo.reward} · {selectedPromo.customer_count || 0} customers</p>
            <div style={{ background: "#fff", padding: "1rem", borderRadius: "1rem", display: "inline-block", border: "1px solid #fde68a", marginBottom: "1rem" }}>
              <QRCodeSVG value={`${publicUrl}/punch/${selectedPromo.qr_token}`} size={200} level="H" fgColor="#1c1917" />
            </div>
            <p style={{ fontSize: "0.8125rem", color: "#a8a29e", marginBottom: "0.25rem" }}>Print this and display it at your counter</p>
            <p style={{ fontSize: "0.75rem", color: "#d4d4d4", wordBreak: "break-all" }}>{publicUrl}/punch/{selectedPromo.qr_token}</p>
            <button className="btn-secondary" style={{ marginTop: "1.25rem", width: "100%", justifyContent: "center" }} onClick={() => setSelectedPromo(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
