"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { orderApi } from "@/lib/api-client";
import Link from "next/link";
import { formatMoney } from "@repo/core";

interface OrderItem {
  id: string;
  quantity: number;
  unitPriceCents: number;
  productName: string;
  variantTitle: string | null;
}

interface Order {
  id: string;
  orderNumber: number;
  currency: string;
  totalCents: number;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  discountCents: number;
  discountTitle: string | null;
  discountCode: string | null;
  shippingZoneName: string | null;
  courier: string | null;
  trackingNumber: string | null;
  platformFeeCents: number;
  merchantNetCents: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentStatus: string;
  createdAt: string;
  customer: { email: string; firstName?: string; lastName?: string };
  items: OrderItem[];
  shippingAddress?: {
    name: string; phone: string; line1: string; line2?: string;
    city: string; district?: string; postalCode?: string;
  };
}

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"];
// Order status moves forward only; the API rejects anything else.
const NEXT_STATUS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};
const FULFILLMENT_OPTIONS = ["unfulfilled", "packed", "shipped", "delivered", "returned"];

const PAYMENT_METHOD_LABEL: Record<string, string> = { cod: "Cash on delivery", card: "Card", bank_transfer: "Bank transfer" };

function TrackingEditor({ order, onSave }: { order: Order; onSave: (change: { courier: string | null; trackingNumber: string | null }) => void }) {
  const [courier, setCourier] = useState(order.courier ?? "");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const dirty = courier !== (order.courier ?? "") || tracking !== (order.trackingNumber ?? "");
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Delivery tracking</h4>
      <div className="space-y-2">
        <input aria-label="Courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Courier, e.g. Domex" className="input-field text-sm" />
        <input aria-label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className="input-field text-sm" />
        {dirty && (
          <button type="button" onClick={() => onSave({ courier: courier.trim() || null, trackingNumber: tracking.trim() || null })} className="btn-secondary w-full text-xs">
            Save tracking
          </button>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadOrders();
  }, [token, router]);

  const loadOrders = async () => {
    try {
      const res = await orderApi.list();
      setOrders(res.data);
    } catch (err) { console.error("Failed to load orders:", err); }
    finally { setIsLoading(false); }
  };

  const applyChange = async (orderId: string, request: () => Promise<{ data: Order }>, successText: string) => {
    try {
      const res = await request();
      setOrders((prev) => prev.map((o) => o.id === orderId ? res.data : o));
      setMessage({ type: "success", text: successText });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to update order" });
    }
  };

  const updateStatus = (orderId: string, status: string) =>
    applyChange(orderId, () => orderApi.updateStatus(orderId, { status }), `Order marked ${status}`);
  const updateFulfillment = (orderId: string, fulfillmentStatus: string) =>
    applyChange(orderId, () => orderApi.updateStatus(orderId, { fulfillmentStatus }), `Fulfillment set to ${fulfillmentStatus}`);
  const markPaid = (orderId: string) =>
    applyChange(orderId, () => orderApi.markPaid(orderId), "Payment recorded");

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      paid: "badge-green", unpaid: "badge-yellow", failed: "badge-red",
      refunded: "badge-gray", pending: "badge-yellow", confirmed: "badge-blue",
      completed: "badge-green", cancelled: "badge-red", unfulfilled: "badge-gray",
      packed: "badge-blue", shipped: "badge-blue", delivered: "badge-green", returned: "badge-red",
    };
    return map[s] || "badge-gray";
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and fulfill customer orders</p>
        </div>

        {message && (
          <div className={`px-4 py-3 rounded-lg mb-6 text-sm animate-slide-up ${message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {message.type === "success" ? "✅" : "❌"} {message.text}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["all", ...STATUS_OPTIONS].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filter === s ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== "all" && <span className="ml-1 opacity-60">({orders.filter((o) => o.status === s).length})</span>}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="px-6 py-16 text-center">
              <div className="inline-block w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 mt-3">Loading orders...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-500 text-sm">{filter === "all" ? "No orders yet" : `No ${filter} orders`}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((order) => (
                <div key={order.id}>
                  {/* Order Row */}
                  <div className="px-6 py-4 flex items-center gap-6 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono font-semibold text-gray-700">#{order.orderNumber}</span>
                        <span className={`badge ${statusColor(order.status)}`}>{order.status}</span>
                        <span className={`badge ${statusColor(order.paymentStatus)}`}>{order.paymentStatus}</span>
                        <span className={`badge ${statusColor(order.fulfillmentStatus)}`}>{order.fulfillmentStatus}</span>
                      </div>
                      <p className="text-xs text-gray-500">{order.customer.email} • {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatMoney(order.totalCents, order.currency)}</p>
                      <p className="text-xs text-gray-400">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                    </div>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === order.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Expanded Detail */}
                  {expandedId === order.id && (
                    <div className="px-6 pb-6 bg-gray-50/30 border-t border-gray-100 animate-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        {/* Items */}
                        <div className="md:col-span-2">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Items</h4>
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm bg-white rounded-lg px-3 py-2 border border-gray-100">
                                <span className="text-gray-700">
                                  {item.productName}
                                  {item.variantTitle && <span className="text-gray-500"> ({item.variantTitle})</span>} × {item.quantity}
                                </span>
                                <span className="font-semibold text-gray-900">{formatMoney(item.unitPriceCents * item.quantity, order.currency)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs text-gray-500 px-3 pt-2">
                              <span>Subtotal</span><span>{formatMoney(order.subtotalCents, order.currency)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 px-3">
                              <span>Tax</span><span>{formatMoney(order.taxCents, order.currency)}</span>
                            </div>
                            {order.discountCents > 0 && (
                              <div className="flex justify-between text-xs text-gray-500 px-3">
                                <span>Discount: {order.discountCode ?? order.discountTitle}</span><span>−{formatMoney(order.discountCents, order.currency)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs text-gray-500 px-3">
                              <span>Delivery{order.shippingZoneName && ` (${order.shippingZoneName})`}{order.shippingCents === 0 && order.discountTitle && order.discountCents === 0 && `, ${order.discountTitle}`}</span><span>{formatMoney(order.shippingCents, order.currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-gray-900 px-3 pt-1 border-t border-gray-100">
                              <span>Total</span><span>{formatMoney(order.totalCents, order.currency)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 px-3 pt-2">
                              <span>Platform fee</span><span>−{formatMoney(order.platformFeeCents, order.currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-semibold text-gray-900 px-3">
                              <span>You receive</span><span>{formatMoney(order.merchantNetCents, order.currency)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4">
                          {order.shippingAddress && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Shipping</h4>
                              <div className="text-sm text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                                <p className="font-medium">{order.shippingAddress.name}</p>
                                <p>{order.shippingAddress.phone}</p>
                                <p>{order.shippingAddress.line1}</p>
                                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                                <p>{[order.shippingAddress.city, order.shippingAddress.district, order.shippingAddress.postalCode].filter(Boolean).join(", ")}</p>
                              </div>
                            </div>
                          )}

                          {/* Payment */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment</h4>
                            <p className="text-sm text-gray-600 mb-2">{PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
                            {order.paymentMethod === "cod" && order.paymentStatus === "unpaid" && order.status !== "cancelled" && (
                              <button onClick={() => markPaid(order.id)} className="btn-secondary text-xs w-full">Mark cash received</button>
                            )}
                          </div>

                          {/* Status Update */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Order status</h4>
                            <select value={order.status} disabled={NEXT_STATUS[order.status]?.length === 0} onChange={(e) => updateStatus(order.id, e.target.value)} className="input-field text-sm">
                              {[order.status, ...(NEXT_STATUS[order.status] ?? [])].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                          </div>

                          <TrackingEditor order={order} onSave={(change) => applyChange(order.id, () => orderApi.updateStatus(order.id, change), "Tracking saved")} />

                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Fulfillment</h4>
                            <select value={order.fulfillmentStatus} disabled={order.status === "cancelled"} onChange={(e) => updateFulfillment(order.id, e.target.value)} className="input-field text-sm">
                              {FULFILLMENT_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-gray-400 mt-4">Showing {filtered.length} of {orders.length} orders</p>
        )}
      </div>
    </div>
  );
}
