-- Update function to check expiring subscriptions (both current and future) and notify admins
CREATE OR REPLACE FUNCTION check_expiring_subscriptions() RETURNS void AS $$
DECLARE
  lead_record RECORD;
  admin_user RECORD;
  days_until_expiration INT;
  notification_type TEXT := 'subscription_ending';
  existing_count INT;
  message_text TEXT;
  
  -- Variables for future subscription
  future_expiration_date DATE;
  future_days_until_expiration INT;
BEGIN
  -- Loop through active leads with expiration date (current OR future)
  FOR lead_record IN
    SELECT 
      l.id, 
      l.customer_id,
      c.full_name as customer_name,
      (l.subscription_data->>'expirationDate')::DATE as current_expiration_date,
      (l.subscription_data->'future_subscription'->>'expirationDate')::DATE as future_expiration_date,
      (l.subscription_data->>'status')::TEXT as current_status,
      (l.subscription_data->'future_subscription'->>'status')::TEXT as future_status
    FROM leads l
    LEFT JOIN customers c ON l.customer_id = c.id
    WHERE 
      (l.subscription_data->>'expirationDate' IS NOT NULL AND (l.subscription_data->>'status')::TEXT = 'פעיל')
      OR 
      (l.subscription_data->'future_subscription'->>'expirationDate' IS NOT NULL AND (l.subscription_data->'future_subscription'->>'status')::TEXT IN ('פעיל', 'ממתין'))
  LOOP
    
    -- 1. Check Current Subscription
    IF lead_record.current_expiration_date IS NOT NULL AND lead_record.current_status = 'פעיל' THEN
        days_until_expiration := lead_record.current_expiration_date - CURRENT_DATE;
        
        IF days_until_expiration IN (7, 3, 0) THEN
          IF days_until_expiration = 0 THEN
            message_text := 'המנוי של ' || COALESCE(lead_record.customer_name, 'לקוח') || ' מסתיים היום (' || TO_CHAR(lead_record.current_expiration_date, 'DD/MM/YYYY') || ')';
          ELSE
            message_text := 'המנוי של ' || COALESCE(lead_record.customer_name, 'לקוח') || ' יסתיים בעוד ' || days_until_expiration || ' ימים (' || TO_CHAR(lead_record.current_expiration_date, 'DD/MM/YYYY') || ')';
          END IF;

          -- Send notification
          FOR admin_user IN SELECT id FROM profiles WHERE role = 'admin' LOOP
            SELECT COUNT(*) INTO existing_count
            FROM notifications
            WHERE 
              user_id = admin_user.id
              AND lead_id = lead_record.id 
              AND type = notification_type 
              AND created_at > NOW() - INTERVAL '20 hours'
              AND message = message_text;
              
            IF existing_count = 0 THEN
              INSERT INTO notifications (
                user_id, customer_id, lead_id, type, title, message, action_url
              ) VALUES (
                admin_user.id, lead_record.customer_id, lead_record.id, notification_type, 'תזכורת סיום מנוי', message_text, '/dashboard/leads/' || lead_record.id
              );
            END IF;
          END LOOP;
        END IF;
    END IF;

    -- 2. Check Future Subscription
    IF lead_record.future_expiration_date IS NOT NULL AND lead_record.future_status IN ('פעיל', 'ממתין') THEN
        future_days_until_expiration := lead_record.future_expiration_date - CURRENT_DATE;
        
        IF future_days_until_expiration IN (7, 3, 0) THEN
          IF future_days_until_expiration = 0 THEN
            message_text := 'המנוי העתידי של ' || COALESCE(lead_record.customer_name, 'לקוח') || ' מסתיים היום (' || TO_CHAR(lead_record.future_expiration_date, 'DD/MM/YYYY') || ')';
          ELSE
            message_text := 'המנוי העתידי של ' || COALESCE(lead_record.customer_name, 'לקוח') || ' יסתיים בעוד ' || future_days_until_expiration || ' ימים (' || TO_CHAR(lead_record.future_expiration_date, 'DD/MM/YYYY') || ')';
          END IF;

          -- Send notification
          FOR admin_user IN SELECT id FROM profiles WHERE role = 'admin' LOOP
            SELECT COUNT(*) INTO existing_count
            FROM notifications
            WHERE 
              user_id = admin_user.id
              AND lead_id = lead_record.id 
              AND type = notification_type 
              AND created_at > NOW() - INTERVAL '20 hours'
              AND message = message_text;
              
            IF existing_count = 0 THEN
              INSERT INTO notifications (
                user_id, customer_id, lead_id, type, title, message, action_url
              ) VALUES (
                admin_user.id, lead_record.customer_id, lead_record.id, notification_type, 'תזכורת סיום מנוי עתידי', message_text, '/dashboard/leads/' || lead_record.id
              );
            END IF;
          END LOOP;
        END IF;
    END IF;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_expiring_subscriptions() TO authenticated;
