import { supabase } from '../config/supabase.js';

export const ordersService = {
  async fetchOrders() {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, profiles:created_by(full_name), suppliers:supplier_id(company_name, nit)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createOrder(orderData, items = []) {
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .insert([orderData])
      .select()
      .single();

    if (orderError) throw orderError;

    if (items.length > 0) {
      const itemsPayload = items.map(item => ({
        purchase_order_id: order.id,
        item_code: item.item_code || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price || 0
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsPayload);

      if (itemsError) throw itemsError;
    }

    return order;
  },

  async updateStatus(orderId, status) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({ status, updated_at: new Date() })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getOrderDetails(orderId) {
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .select('*, profiles:created_by(full_name), suppliers:supplier_id(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    const { data: items, error: itemsError } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('purchase_order_id', orderId);

    if (itemsError) throw itemsError;

    return { ...order, items };
  },

  async deleteOrder(orderId) {
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
    return true;
  }
};