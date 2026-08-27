import { supabase } from '../config/supabase.js';

export const incidentsService = {
  async reportIncident(incidentData) {
    const { data, error } = await supabase
      .from('order_incidents')
      .insert([incidentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getIncidentsByOrder(orderId) {
    const { data, error } = await supabase
      .from('order_incidents')
      .select('*')
      .eq('purchase_order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};