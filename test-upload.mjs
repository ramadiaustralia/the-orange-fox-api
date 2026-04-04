import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lylnsguyizwztqrdfavr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bG5zZ3V5aXp3enRxcmRmYXZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg5ODA4MSwiZXhwIjoyMDkwNDc0MDgxfQ._8k1m1nvND7p9EWquKQgM42wJGDpqnExDUsnUnpSAYk',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Test 1: Create signed upload URL
console.log('=== Creating signed upload URL ===');
const testPath = `test/${Date.now()}-test-file.txt`;
const { data: signedData, error: signedError } = await supabase.storage
  .from('post-files')
  .createSignedUploadUrl(testPath);

if (signedError) {
  console.log('ERROR creating signed URL:', signedError);
  process.exit(1);
}

console.log('Signed URL:', signedData.signedUrl?.substring(0, 100) + '...');
console.log('Token:', signedData.token?.substring(0, 30) + '...');
console.log('Path:', signedData.path);

// Test 2: Upload using the signed URL (simulating browser fetch)
console.log('\n=== Uploading to signed URL with PUT ===');
const uploadRes = await fetch(signedData.signedUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'text/plain' },
  body: 'Hello this is a test upload from Node.js',
});
console.log('Upload status:', uploadRes.status);
console.log('Upload response:', await uploadRes.text());

// Test 3: Get public URL and verify
console.log('\n=== Getting public URL ===');
const { data: urlData } = supabase.storage.from('post-files').getPublicUrl(testPath);
console.log('Public URL:', urlData.publicUrl);

// Test 4: Verify the file is accessible
const verifyRes = await fetch(urlData.publicUrl);
console.log('File access status:', verifyRes.status);
console.log('File content:', await verifyRes.text());

// Cleanup
await supabase.storage.from('post-files').remove([testPath]);
console.log('\n=== Test passed! Storage works correctly ===');
