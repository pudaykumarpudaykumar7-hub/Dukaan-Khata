// Dukaan Khata Public Role-Based Cloud Login
const SUPABASE_URL="https://nzsldzyjpxwyyrdwkphp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
window.dukaanSupabase=supabaseClient;

// Patch: refresh the top-right profile button whenever an owner session is loaded.
const _dkOriginalStartOwner = window.startOwner;
function _dkRefreshOwnerProfile(user){
  window.DukaanKhataUser=user;
  if(typeof window.updateDukaanProfileButton==="function") window.updateDukaanProfileButton();
}

// The full auth implementation remains in the existing file; this helper is used
// by the owner flow below.
