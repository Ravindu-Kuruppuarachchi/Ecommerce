"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";
import { formatMoney } from "@repo/core";
import LaunchChecklist from "@/components/LaunchChecklist";
import { storefrontUrl } from "@/lib/urls";

// ============ STAT CARD ============

function StatCard({
  label,
  value,
  icon,
  color,
  delay,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  delay: string;
}) {
  return (
    <div className={`stat-card animate-slide-up ${delay}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={`text-3xl font-bold mt-1.5 ${color}`}>{value}</p>
        </div>
        <span className="text-3xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}

// ============ MAIN DASHBOARD ============

interface Order {
  id: string;
  orderNumber: number;
  totalCents: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  customer: { email: string };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, store, token } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    revenueCents: 0,
    platformFeesCents: 0,
    lowStock: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadData();
  }, [token, router]);

  const loadData = async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/dashboard/stats`, { headers }),
        fetch(`${API_URL}/orders`, { headers }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !store) {
    return null;
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "badge-green";
      case "unpaid":
        return "badge-yellow";
      case "failed":
        return "badge-red";
      case "processing":
        return "badge-blue";
      case "shipped":
        return "badge-green";
      case "delivered":
        return "badge-green";
      case "cancelled":
        return "badge-red";
      default:
        return "badge-gray";
    }
  };

  return (
    <div>
      <main>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="px-4 sm:px-8 py-4 flex justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-sm text-gray-500">
                Welcome back, {user.firstName || user.email}
              </p>
            </div>
            <a href={storefrontUrl(store.slug)} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
              View store
            </a>
          </div>
        </header>

        <div className="px-4 sm:px-8 py-8">
          <LaunchChecklist />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
            <StatCard
              label="Total Products"
              value={stats.totalProducts}
              icon="📦"
              color="text-gray-900"
              delay=""
            />
            <StatCard
              label="Total Orders"
              value={stats.totalOrders}
              icon="🛒"
              color="text-gray-900"
              delay="delay-75"
            />
            <StatCard
              label="Revenue"
              value={formatMoney(stats.revenueCents)}
              icon="💰"
              color="text-emerald-600"
              delay="delay-150"
            />
            <StatCard
              label="Low Stock"
              value={stats.lowStock}
              icon="⚠️"
              color={stats.lowStock > 0 ? "text-amber-600" : "text-gray-900"}
              delay="delay-225"
            />
          </div>

          {/* Quick Actions */}
          <div className="glass-card rounded-xl p-6 mb-10">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/products/new" className="btn-primary">
                Add product
              </Link>
              <Link href="/store/pages/home" className="btn-secondary">
                Edit home page
              </Link>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                Recent Orders
              </h3>
            </div>

            {isLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-block w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 mt-3">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-gray-500 text-sm">No orders yet</p>
                <p className="text-gray-400 text-xs mt-1">
                  Orders will appear here once customers start buying.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.slice(0, 10).map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-3.5 px-6 text-sm font-mono text-gray-700">
                          #{order.orderNumber}
                        </td>
                        <td className="py-3.5 px-6 text-sm text-gray-600">
                          {order.customer.email}
                        </td>
                        <td className="py-3.5 px-6 text-sm font-semibold text-gray-900">
                          {formatMoney(order.totalCents)}
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`badge ${statusColor(
                              order.paymentStatus
                            )}`}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`badge ${statusColor(order.status)}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
