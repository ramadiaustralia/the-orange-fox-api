'use client';
import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Package, AlertCircle, DollarSign, RefreshCw, ArrowUpRight, X } from 'lucide-react';
import { usePermission } from "@/hooks/usePermission";
import AccessDenied from "@/components/AccessDenied";


interface Order {
  id: string;
  order_number: string;
  buyer_name: string;
  buyer_email: string;
  product_name: string;
  product_price: number;
  currency: string;
  paypal_order_id: string;
  paypal_status: string;
  status: string;
  notes: string | null;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  processing: 'bg-blue-50 text-blue-600 border border-blue-200',
  completed: 'bg-purple-50 text-purple-600 border border-purple-200',
  cancelled: 'bg-red-50 text-red-600 border border-red-200',
};

export default function OrdersPage() {
  const { hasAccess, isOwner } = usePermission("orders");
  if (hasAccess === false) return <AccessDenied section="Orders" />;

  const supabase = getSupabase();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function updateStatus(orderId: string, newStatus: string) {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  }

  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.product_price, 0);
  const paidCount = orders.filter((o) => o.status === 'paid').length;

  const statCards = [
    {
      label: 'Total Orders',
      value: orders.length,
      icon: Package,
      desc: 'All time',
    },
    {
      label: 'Awaiting Action',
      value: paidCount,
      icon: AlertCircle,
      desc: 'Paid, need processing',
    },
    {
      label: 'Revenue',
      value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      desc: 'Excluding cancelled',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#1a1a1a]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Orders
          </h1>
          <p className="text-sm text-[#999999] mt-1">Track and manage customer orders</p>
        </div>
        <button
          onClick={() => fetchOrders()}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#D4692A]/10 border border-[#D4692A]/20 text-[#D4692A] hover:bg-[#D4692A]/20 transition-all duration-200"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-gradient-to-br from-[#141414] via-[#1c1c1c] to-[#222222] border border-white/[0.06] rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(212,105,42,0.12)] group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-[#D4692A]/15 text-[#D4692A] rounded-xl p-2.5 flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-white/30 group-hover:text-[#D4692A] transition-colors"
                />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {loading ? (
                  <span className="inline-block w-10 h-7 bg-white/10 rounded animate-pulse" />
                ) : (
                  card.value
                )}
              </div>
              <div
                className="text-xs text-white/50 uppercase tracking-wider font-medium"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {card.label}
              </div>
              <div className="text-xs text-white/30 mt-1">{card.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#f0ece8] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-5 w-20 bg-[#f0ece8] rounded animate-pulse" />
                <div className="h-5 w-32 bg-[#f0ece8] rounded animate-pulse" />
                <div className="h-5 w-28 bg-[#f0ece8] rounded animate-pulse" />
                <div className="h-5 w-16 bg-[#f0ece8] rounded animate-pulse" />
                <div className="h-5 w-20 bg-[#f0ece8] rounded animate-pulse" />
                <div className="h-5 w-24 bg-[#f0ece8] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#D4692A]/10 flex items-center justify-center">
              <Package size={28} className="text-[#D4692A]" />
            </div>
            <p className="text-lg font-semibold text-[#1a1a1a] mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              No orders yet
            </p>
            <p className="text-sm text-[#999999]">
              Orders will appear here when customers complete a purchase.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f0ece8] bg-[#fafafa]">
                  <th className="text-left px-5 py-3.5 text-xs text-[#999999] uppercase tracking-wider font-semibold">Order</th>
                  <th className="text-left px-5 py-3.5 text-xs text-[#999999] uppercase tracking-wider font-semibold">Customer</th>
                  <th className="text-left px-5 py-3.5 text-xs text-[#999999] uppercase tracking-wider font-semibold">Product</th>
                  <th className="text-left px-5 py-3.5 text-xs text-[#999999] uppercase tracking-wider font-semibold">Amount</th>
                  <th className="text-left px-5 py-3.5 text-xs text-[#999999] uppercase tracking-wider font-semibold">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs text-[#999999] uppercase tracking-wider font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[#f0ece8] hover:bg-[#fafafa] cursor-pointer transition-colors"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-[#1a1a1a]">{order.order_number}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-[#1a1a1a]">{order.buyer_name}</p>
                      <p className="text-xs text-[#999999]">{order.buyer_email}</p>
                    </td>
                    <td className="px-5 py-4 text-[#555555]">{order.product_name}</td>
                    <td className="px-5 py-4 font-semibold text-[#1a1a1a]">
                      ${order.product_price} <span className="text-xs text-[#999999]">{order.currency}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[order.status] || 'bg-[#fafafa] text-[#555555] border border-[#e8e4e0]'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#999999] text-xs">
                      {new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3
                className="text-lg font-bold text-[#1a1a1a]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {selectedOrder.order_number}
              </h3>
              <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-lg hover:bg-[#f5f2ef] text-[#999999] hover:text-[#555555] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-[#999999]">Customer</span>
                <span className="font-medium text-[#1a1a1a]">{selectedOrder.buyer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#999999]">Email</span>
                <a href={`mailto:${selectedOrder.buyer_email}`} className="text-[#D4692A] hover:text-[#b85520] transition-colors">{selectedOrder.buyer_email}</a>
              </div>
              <div className="flex justify-between">
                <span className="text-[#999999]">Product</span>
                <span className="text-[#1a1a1a]">{selectedOrder.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#999999]">Amount</span>
                <span className="font-bold text-[#1a1a1a]">${selectedOrder.product_price} {selectedOrder.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#999999]">PayPal Ref</span>
                <span className="text-xs font-mono text-[#555555]">{selectedOrder.paypal_order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#999999]">Date</span>
                <span className="text-[#555555]">{new Date(selectedOrder.created_at).toLocaleString('en-AU')}</span>
              </div>
            </div>

            <div className="border-t border-[#f0ece8] pt-4">
              <p className="text-xs text-[#999999] uppercase tracking-wider mb-3 font-semibold">Update Status</p>
              <div className="flex gap-2 flex-wrap">
                {(['paid', 'processing', 'completed', 'cancelled'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selectedOrder.id, s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                      selectedOrder.status === s
                        ? statusStyles[s]
                        : 'border border-[#e8e4e0] text-[#555555] hover:border-[#D4692A]/30 hover:text-[#D4692A]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
