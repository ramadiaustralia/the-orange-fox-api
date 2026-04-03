'use client';
import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';

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

const statusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
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

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage customer orders</p>
        </div>
        <button
          onClick={() => fetchOrders()}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Awaiting Action</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{paidCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Revenue</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400 text-sm">Loading orders...</div>
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
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-gray-900">{order.order_number}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{order.buyer_name}</p>
                      <p className="text-xs text-gray-400">{order.buyer_email}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{order.product_name}</td>
                    <td className="px-5 py-4 font-semibold text-gray-900">
                      ${order.product_price} <span className="text-xs text-gray-400">{order.currency}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">{selectedOrder.order_number}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                &times;
              </button>
            </div>

            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium text-gray-900">{selectedOrder.buyer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <a href={`mailto:${selectedOrder.buyer_email}`} className="text-orange-500">{selectedOrder.buyer_email}</a>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Product</span>
                <span className="text-gray-900">{selectedOrder.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-gray-900">${selectedOrder.product_price} {selectedOrder.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">PayPal Ref</span>
                <span className="text-xs font-mono text-gray-600">{selectedOrder.paypal_order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-700">{new Date(selectedOrder.created_at).toLocaleString('en-AU')}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Update Status</p>
              <div className="flex gap-2 flex-wrap">
                {(['paid', 'processing', 'completed', 'cancelled'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selectedOrder.id, s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selectedOrder.status === s
                        ? statusColors[s] + ' border-current'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
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
