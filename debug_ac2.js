async function main() {
  const resp = await fetch('http://localhost:3010/get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid: 'Actor.iVYJmEJwbHGQOeWv' })
  });
  const data = await resp.json();
  const actor = data?.data || data;
  const sys = actor.system || {};
  const ac = sys.attributes?.ac || {};
  console.log('=== AC ===', JSON.stringify(ac, null, 2));
  
  const dex = sys.abilities?.dex?.value ?? 10;
  console.log('DEX:', dex, 'mod:', Math.floor((dex-10)/2));
  
  console.log('\n=== ALL ITEMS with armor data ===');
  for (const item of (actor.items || [])) {
    const si = item.system || {};
    if (si.armor && Object.keys(si.armor).length > 0) {
      const type = item.type;
      const armorType = si.armor?.type;
      const armorVal = si.armor?.value;
      const equipped = si.equipped !== false;
      console.log(item.name, 'type='+type, 'armor.type='+armorType, 'armor.value='+armorVal, 'equipped='+equipped);
      console.log('  full armor:', JSON.stringify(si.armor));
    }
  }
  
  console.log('\n=== HALF PLATE ITEM ===');
  for (const item of (actor.items || [])) {
    if (item.name?.includes('Half Plate')) {
      console.log(JSON.stringify(item, null, 2));
    }
  }
  
  console.log('\n=== SENTINEL SHIELD ITEM ===');
  for (const item of (actor.items || [])) {
    if (item.name?.includes('Sentinel Shield')) {
      console.log(JSON.stringify(item, null, 2));
    }
  }
}
main().catch(e => { console.error(e.message); });
