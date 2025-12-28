# Test Users Credentials

## ✅ Users Created Successfully

Two test users have been created in the database via migration `20240102000025_create_test_users.sql`.

---

## 📧 MANAGER USER (Admin/Coach)

**Email:** `manager@dietneta.com`  
**Password:** `Manager123!`  
**Role:** `admin`  
**Access:** Full dashboard - can see all leads, customers, templates, and manage the entire system

**What this user can do:**
- View all leads and customers
- Create, edit, and delete leads
- Manage workout and nutrition templates
- Access all features of the CRM
- See all data across all clients

---

## 📧 CLIENT USER (Trainee)

**Email:** `client@dietneta.com`  
**Password:** `Client123!`  
**Role:** `trainee`  
**Access:** Client portal only - can see only their own data

**What this user can do:**
- View their own profile and stats
- See their workout plan (read-only)
- See their nutrition plan (read-only)
- Submit daily check-ins
- Update their personal metrics (weight, height)
- **Cannot** see other clients' data
- **Cannot** access the manager dashboard

---

## 🔐 Security Notes

- Both users are automatically created when you run `npx supabase db reset`
- The migration runs **last** (timestamp: `20240102000025`) to ensure all tables exist
- Passwords are securely hashed using bcrypt
- The client user is automatically linked to a customer record and lead record

---

## 🚀 How to Use

1. **For Manager Access:**
   - Go to `/login`
   - Enter: `manager@dietneta.com` / `Manager123!`
   - You'll be redirected to `/dashboard` (full manager dashboard)

2. **For Client Access:**
   - Go to `/login`
   - Enter: `client@dietneta.com` / `Client123!`
   - You'll be redirected to `/client/dashboard` (client portal)

---

## 📝 Migration Details

- **File:** `supabase/migrations/20240102000025_create_test_users.sql`
- **Runs:** Last in migration order (ensures all tables exist)
- **Idempotent:** Safe to run multiple times (won't create duplicates)

---

## ⚠️ Important

- These are **test users** for development only
- Do **NOT** use these credentials in production
- Change passwords before deploying to production
- The client user has a customer record and lead record automatically created

