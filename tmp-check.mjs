import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(url, key);
const { data, error } = await sb.from('quotes').select('id,event_date,status,created_at').order('created_at',{ascending:false}).limit(8);
console.log(JSON.stringify({error, data}, null, 1));
