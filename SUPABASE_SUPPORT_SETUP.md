# DownGo support tickets: Supabase setup

The support form and admin ticket desk are ready to use once connected to a Supabase project. They cannot store tickets until a project URL and public anon key are configured.

## 1. Create the database tables and security rules

Open the Supabase project SQL Editor, paste the contents of `supabase-support-setup.sql`, and run it. Row Level Security limits public users to creating tickets. Only user accounts listed in `support_admins` can read or update ticket records.

## 2. Configure the website

In Supabase Project Settings → API (or the project Connect dialog), copy the Project URL and **publishable key** into `assets/js/supabase-config.js`. Do not use or publish a secret or `service_role` key. The website is static, so the publishable key is public by design; database safety comes from the SQL policies.

## 3. Create your support admin account

In Supabase Authentication, create an account for the support administrator. Copy its user UUID from the user list, then run this in the SQL Editor, replacing the example UUID:

```sql
insert into public.support_admins (user_id)
values ('00000000-0000-0000-0000-000000000000')
on conflict (user_id) do nothing;
```

Only accounts added to `support_admins` can pass the dashboard check and the database read/update policies. Open `admin.html` to sign in.

## 4. Ticket replies

The dashboard can read tickets, save an admin reply, and set Open, In Progress, or Closed status. Replies are saved in Supabase; this static site does not send email notifications, so contact the requester using the ticket email after saving a reply.

## Customer data

Tickets contain the customer's name, email, topic, subject, and message. Publish an accurate privacy policy describing the retention and handling of this information before collecting real submissions.
