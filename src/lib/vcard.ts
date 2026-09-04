// Minimal vCard 3.0 builder -- this is what the kiosk QR code encodes, so
// scanning it with a phone camera offers "Add Contact" directly, no app
// or server round-trip needed. Fields left blank by the agent are simply
// omitted rather than sent as empty vCard lines.
export function buildAgentVCard(agent: { name: string; brokerage: string | null; phone: string | null; email: string | null }): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:;${agent.name};;;`, `FN:${agent.name}`];
  if (agent.brokerage) lines.push(`ORG:${agent.brokerage}`);
  if (agent.phone) lines.push(`TEL;TYPE=CELL:${agent.phone}`);
  if (agent.email) lines.push(`EMAIL:${agent.email}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}
