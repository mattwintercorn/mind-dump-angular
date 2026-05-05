// Run this in browser console to migrate nested ideas to flat structure
// Paste this entire script and run: migrateNestedIdeas()

async function migrateNestedIdeas() {
  const { ref, get, set, remove } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');
  const db = firebase.database();
  
  const workspaceId = 'ceeadac7-a744-4022-bc33-134d14d1bb87';
  
  console.log('Checking for nested ideas...');
  
  // Get nested ideas from /workspaces/{id}/ideas/
  const nestedPath = `workspaces/${workspaceId}/ideas`;
  const nestedSnapshot = await get(ref(db, nestedPath));
  
  if (!nestedSnapshot.exists()) {
    console.log('No nested ideas found');
    return;
  }
  
  const nestedIdeas = nestedSnapshot.val();
  console.log('Found nested ideas:', Object.keys(nestedIdeas));
  
  // Move each idea to flat structure
  for (const [ideaId, ideaData] of Object.entries(nestedIdeas)) {
    console.log(`Migrating idea ${ideaId}...`);
    
    // Write to flat structure
    const flatPath = `ideas/${workspaceId}/${ideaId}`;
    await set(ref(db, flatPath), ideaData);
    console.log(`✓ Written to ${flatPath}`);
    
    // Remove from nested structure
    await remove(ref(db, `${nestedPath}/${ideaId}`));
    console.log(`✓ Removed from ${nestedPath}/${ideaId}`);
  }
  
  console.log('✅ Migration complete!');
  console.log('Reload the page to see your ideas');
}

console.log('Migration script loaded. Run: migrateNestedIdeas()');
