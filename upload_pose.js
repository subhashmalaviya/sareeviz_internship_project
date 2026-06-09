const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function upload() {
  const fileContent = fs.readFileSync('/home/subhash/.gemini/antigravity/brain/fb8c3b16-f1d0-4471-906e-624113f1312b/male_pose_1_1781000243867.png');
  const { data, error } = await supabase.storage
    .from('designs')
    .upload('public_assets/male_pose_1.png', fileContent, {
      contentType: 'image/png',
      upsert: true
    });

  if (error) {
    console.error('Upload failed:', error);
    return;
  }

  const { data: { publicUrl } } = supabase.storage.from('designs').getPublicUrl('public_assets/male_pose_1.png');
  console.log('Public URL:', publicUrl);
}

upload();
