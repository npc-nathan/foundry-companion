// Debug AC data for Losiir
async function main() {
  const resp = await fetch('http://localhost:8080/get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid: 'Actor.iVYJmEJwbHGQOeWv' })
  });
  const data = await resp.json();
  const actor = data.data || data;
  const sys = actor.system || {};

  // AC data  
  const ac = sys.attributes?.ac || {};
  console.log("=== AC RAW ===");
  console.log(JSON.stringify(ac, null, 2));

  // Abilities
  const abilities = sys.abilities || {};
  console.log("\n=== ABILITIES ===");
  for (const k of ['str','dex','con','int','wis','cha']) {
    const v = abilities[k]?.value ?? 10;
    console.log(`  ${k}: ${v} (mod ${Math.floor((v-10)/2)})`);
  }

  // Items - armor/shield
  console.log("\n=== EQUIPPED ARMOR/SHIELD ITEMS ===");
  for (const item of (actor.items || [])) {
    const sys_i = item.system || {};
    const armor = sys_i.armor || {};
    const equipped = sys_i.equipped !== false;
    if (armor && Object.keys(armor).length > 0) {
      console.log(`  ${item.name} [${item.type}]: equipped=${equipped}, armor=${JSON.stringify(armor)}`);
    }
    // Also check if 'type' field says shield
    if (item.type === 'equipment' && armor?.type === 'shield') {
      console.log(`  ** DETECTED SHIELD: ${item.name}`);
    }
  }

  // Check for items with type 'shield' differently
  console.log("\n=== ITEMS WITH 'shield' in ANY FIELD ===");
  for (const item of (actor.items || [])) {
    const sys_i = item.system || {};
    const itemName = item.name?.toLowerCase() || '';
    const itemType = item.type || '';
    const sysType = sys_i.type || '';
    const armorType = sys_i.armor?.type || '';
    if (itemName.includes('shield') || armorType === 'shield' || sysType === 'shield') {
      console.log(`  ${item.name}: type=${itemType}, system.type=${sysType}, armor.type=${armorType}, equipped=${sys_i.equipped}`);
      console.log(`    full system: ${JSON.stringify(sys_i)}`);
    }
  }
  
  // Half Plate specifics
  console.log("\n=== HALF PLATE FULL DATA ===");
  for (const item of (actor.items || [])) {
    if (item.name?.includes('Half Plate')) {
      console.log(JSON.stringify(item, null, 2));
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
