import { supabase } from '../utils/supabase';

export async function checkVoucher(code: string) {
  try {
    const { data, error } = await supabase
      .from('voucher')
      .select('*')
      .eq('code', code)
      .is('used_at', null)
      .maybeSingle();

    if (error) {
      return { success: false, error: 'Database error while checking voucher.' };
    }

    if (!data) {
      return { success: false, error: 'Invalid or expired voucher code.' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error checking voucher:', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
