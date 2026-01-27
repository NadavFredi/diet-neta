-- Create function to check expiring subscriptions and notify admins
CREATE OR REPLACE FUNCTION check_expiring_subscriptions() RETURNS void AS $$
DECLARE
  lead_record RECORD;
  admin_user RECORD;
  days_until_expiration INT;
  notification_type TEXT := 'subscription_expiring';
  existing_count INT;
  message_text TEXT;
BEGIN
  -- Loop through active leads with expiration date
  -- Check for expiration date in subscription_data JSONB
  FOR lead_record IN
    SELECT 
      l.id, 
      l.customer_id,
      c.full_name as customer_name,
      (l.subscription_data->>'expirationDate')::DATE as expiration_date
    FROM leads l
    LEFT JOIN customers c ON l.customer_id = c.id
    WHERE 
      l.subscription_data->>'expirationDate' IS NOT NULL 
      AND (l.subscription_data->>'status')::TEXT = 'פעיל'
  LOOP
    -- Calculate days until expiration
    days_until_expiration := lead_record.expiration_date - CURRENT_DATE;
    
    -- Check if subscription is expiring in 7, 3, or 0 days
    -- Also checking negative values if we missed the exact day (e.g. -1 for yesterday)
    -- But let's stick to exact days for now to avoid spam, or checking range.
    -- Better: check if expiration is exactly 7, 3, or 0 days from now.
    IF days_until_expiration IN (7, 3, 0) THEN
      
      -- Prepare message
      IF days_until_expiration = 0 THEN
        message_text := 'המנוי של ' || COALESCE(lead_record.customer_name, 'לקוח') || ' מסתיים היום (' || TO_CHAR(lead_record.expiration_date, 'DD/MM/YYYY') || ')';
      ELSE
        message_text := 'המנוי של ' || COALESCE(lead_record.customer_name, 'לקוח') || ' יסתיים בעוד ' || days_until_expiration || ' ימים (' || TO_CHAR(lead_record.expiration_date, 'DD/MM/YYYY') || ')';
      END IF;

      -- For each admin user
      FOR admin_user IN SELECT id FROM profiles WHERE role = 'admin' LOOP
        
        -- Check for existing notification today to avoid duplicates
        -- Checking last 20 hours to handle potential timezone shifts or slightly early runs
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
            user_id,
            customer_id,
            lead_id,
            type,
            title,
            message,
            action_url
          ) VALUES (
            admin_user.id,
            lead_record.customer_id,
            lead_record.id,
            notification_type,
            'תזכורת סיום מנוי',
            message_text,
            '/dashboard/leads/' || lead_record.id
          );
        END IF;
        
      END LOOP;
      
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (so they can trigger it on login)
GRANT EXECUTE ON FUNCTION check_expiring_subscriptions() TO authenticated;
