export const DEMO_TRANSCRIPT = `Alright so today I did the bathroom reno at 42 Queen St. Stripped out the old shower and vanity, took the wall back to the studs. Found the wall insulation was pretty old so I upgraded to R2.6 batts while I had it open. Framing was solid, no water damage. Put up new waterproof plasterboard, installed the new shower base and glass enclosure, tiled the walls with that grey mosaic she picked and the floor with porcelain. Fitted the new maple vanity and brushed nickel tapware. Silicone sealed all the wet areas, reminded Sarah not to use the shower for 24 hours. Took about nine and a quarter hours on site start to finish.`;

export const DEMO_JOBS = [
  {
    id: '1',
    address: '42 Queen St, Ponsonby',
    client: 'Sarah Harper',
    description: 'Bathroom renovation',
    date: new Date().toISOString(),
    status: 'sent',
    transcript: DEMO_TRANSCRIPT,
    photos: [
      { id: 'p1', label: 'before' },
      { id: 'p2', label: 'in-progress' },
      { id: 'p3', label: 'in-progress' },
      { id: 'p4', label: 'completed' },
    ],
    report: {
      workPerformed:
        'Full bathroom renovation including demolition of existing shower and vanity, wall stripping to studs, insulation upgrade to R2.6 batts, installation of waterproof plasterboard, new shower base with glass enclosure, wall and floor tiling, and fitting of new maple vanity with brushed nickel tapware.',
      materialsUsed: [
        'R2.6 insulation batts',
        'Waterproof plasterboard',
        'Shower base and glass enclosure',
        'Grey mosaic wall tiles',
        'Porcelain floor tiles',
        'Maple vanity unit',
        'Brushed nickel tapware',
        'Silicone sealant',
      ],
      notes: [
        'Existing wall insulation was degraded — upgraded to R2.6 batts',
        'Framing in good condition, no water damage found',
        'Client advised not to use shower for 24 hours to allow silicone to cure',
      ],
      timeOnSite: '9.25 hours',
      summary: 'Complete bathroom renovation with insulation upgrade at 42 Queen St.',
    },
  },
  {
    id: '2',
    address: '18 Huia Rd, Titirangi',
    client: 'Mark Thompson',
    description: 'Deck repair & staining',
    date: new Date(Date.now() - 86400000).toISOString(),
    status: 'sent',
    transcript: '',
    photos: [],
    report: {
      workPerformed:
        'Replaced 6 damaged kwila deck boards and re-stained the full 40sqm deck area with Cabots deck stain in Merbau.',
      materialsUsed: [
        '6x kwila deck boards (140x25mm)',
        'Cabots deck stain — Merbau (10L)',
        'Stainless steel deck screws',
      ],
      notes: ['Two bearers showing early signs of rot — recommended monitoring'],
      timeOnSite: '5 hours',
      summary: 'Deck board replacement and full re-stain at Titirangi property.',
    },
  },
  {
    id: '3',
    address: '7 Rata St, Grey Lynn',
    client: 'Jenny Liu',
    description: 'Kitchen splashback tiling',
    date: new Date(Date.now() - 172800000).toISOString(),
    status: 'draft',
    transcript: '',
    photos: [],
    report: null,
  },
];

export const USER_NAME = 'Jordan';
