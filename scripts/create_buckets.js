// script: create_buckets.js
// Usage: node scripts/create_buckets.js
// Requires env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require('@supabase/supabase-js');

async function main(){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key){
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env before running');
    process.exit(1);
  }
  const supabase = createClient(url, key);
  const buckets = ['dishes','banners','branding'];
  for(const b of buckets){
    console.log('Creating bucket', b);
    try{
      const { data, error } = await supabase.storage.createBucket(b, { public: true });
      if(error){
        if(error.status===409) console.log('Bucket already exists', b);
        else console.error('Error creating bucket', b, error.message || error);
      } else {
        console.log('Bucket created:', b);
      }
    } catch (err){
      console.error('Exception creating bucket', b, err.message || err);
    }
  }
}

main().catch((e)=>{ console.error(e); process.exit(1); });
