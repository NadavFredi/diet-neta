# How to Create Test Users

## ✅ Quick Method (Recommended)

Run this command to automatically create both users:

```bash
npm run create-users
```

Or directly:

```bash
node scripts/create_test_users.js
```

This will create:
- **Manager user** (`manager@dietneta.com`)
- **Client user** (`client@dietneta.com`)

---

## 📧 User Credentials

### Manager User (Admin/Coach)
- **Email:** `manager@dietneta.com`
- **Password:** `Manager123!`
- **Role:** `admin`
- **Access:** Full dashboard - sees all leads, customers, templates

### Client User (Trainee)
- **Email:** `client@dietneta.com`
- **Password:** `Client123!`
- **Role:** `trainee`
- **Access:** Client portal only - sees only their own data

---

## 🔄 After Creating Users

1. **Verify in Supabase Studio:**
   - Go to http://localhost:54323
   - Navigate to Authentication → Users
   - You should see both users listed

2. **Test Login:**
   - Manager: Login at `/login` → Redirects to `/dashboard`
   - Client: Login at `/login` → Redirects to `/client/dashboard`

---

## 📝 Manual Creation (Alternative)

If the script doesn't work, you can create users manually:

1. Go to Supabase Studio: http://localhost:54323
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"**
4. Fill in:
   - Email: `manager@dietneta.com`
   - Password: `Manager123!`
   - Auto Confirm: ✅ (checked)
5. After creation, go to **SQL Editor** and run:
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE email = 'manager@dietneta.com';
   ```
6. Repeat for client user with `client@dietneta.com` and role `'trainee'`

---

## ⚠️ Important Notes

- The script uses Supabase Admin API (service role key)
- Users are created with email confirmation already done
- Profiles are automatically created/updated with correct roles
- Customer and lead records are created for the client user

