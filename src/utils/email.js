import { supabase } from '../supabase';

export async function sendLeaveEmail(type, toEmail, details) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        type,
        to: toEmail,
        employeeName: details.employeeName,
        leaveType: details.leaveType,
        startDate: details.startDate,
        endDate: details.endDate,
        days: details.days,
        reason: details.reason || '',
      },
    });
    if (error) console.error('Email error:', error);
    return data;
  } catch (err) {
    console.error('Email send failed:', err);
  }
}