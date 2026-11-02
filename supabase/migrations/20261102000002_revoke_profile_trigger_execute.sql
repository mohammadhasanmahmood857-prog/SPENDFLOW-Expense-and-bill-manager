-- create_profile_for_new_user() only runs as the create_profile_after_signup trigger.
-- Functions are executable by PUBLIC by default, which exposed it at
-- /rest/v1/rpc/create_profile_for_new_user (Supabase advisor 0028/0029). Triggers do not
-- check EXECUTE when they fire, so revoking it keeps sign-up profile creation working.

revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;
