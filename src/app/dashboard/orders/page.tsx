'use client';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  processing: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  completed: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function OrdersPage() {
  const supabase = createClientComponentClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  }

  async function updateStatus(orderId: string, newStatus: string) {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  }

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.product_price : 0), 0);
  const paidOrders = orders.filter((o) => o.status === 'paid').length;

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage customer orders</p>
        </div>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Awaiting Action</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{paidOrders}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600 mt-1">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-gray-400 text-lg mb-2">No orders yet</p>
            <p className="text-gray-300 text-sm">Orders will appear here when customers complete purchases.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-semibold">Order</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-semibold">Customer</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-semibold">Product</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-semibold">Amount</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-semibold">Status</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const sc = STATUS_COLORS[order.status] || STATUS_COLORS.paid;
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-gray-900">{order.order_number}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{order.buyer_name}</p>
                        <p className="text-xs text-gray-400">{order.buyer_email}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{order.product_name}</td>
                      <td className="px-5 py-4 font-semibold text-gray-900">${order.product_price} <span className="text-xs text-gray-400">{order.currency}</span></td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs">
                        {new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">{selectedOrder.order_number}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Customer</span>
                <span className="text-sm font-medium text-gray-900">{selectedOrder.buyer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Email</span>
                <a href={`mailto:${selectedOrder.buyer_email}`} className="text-sm text-orange-500 hover:underline">{selectedOrder.buyer_email}</a>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Product</span>
                <span className="text-sm text-gray-900">{selectedOrder.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Amount</span>
                <span className="text-sm font-bold text-gray-900">${selectedOrder.product_price} {selectedOrder.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wider">PayPal Ref</span>
                <span className="text-xs font-mono text-gray-600">{selectedOrder.paypal_order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Date</span>
                <span className="text-sm text-gray-700">{new Date(selectedOrder.created_at).toLocaleString('en-AU')}</span>
              </div>
            </div>

            {/* Status update */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Update Status</p>
              <div className="flex gap-2 flex-wrap">
                {['paid', 'processing', 'completed', 'cancelled'].map((s) => {
                  const sc = STATUS_COLORS[s] || STATUS_COLORS.paid;
                  const isActive = selectedOrder.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => updateStatus(selectedOrder.id, s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isActive
                          ? `${sc.bg} ${sc.text} border-current`
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
