// Bootstraps the User table with real, server-hashed passwords for the
// same accounts src/app/components/Login.tsx currently authenticates
// client-side (demoAccounts). This does NOT change Login.tsx or remove
// the plaintext passwords there — that cleanup is Fase 0's job, tracked
// separately and intentionally not done in this pass. What this script
// gives you is the real-backend equivalent to switch Login.tsx over to
// once Fase 0 is ready, so nobody has to re-derive "who are the accounts
// and what roles do they have" from scratch at that point.
//
// Run with: npx prisma db seed  (needs DATABASE_URL set)
import { PrismaClient, Role, OpportunityStage, OpportunityStatus, ContractStatus, QuotationStatus } from '@prisma/client';
import { hashPassword } from '../lib/auth.js';
import { distributorSeeds, storeSeeds } from './seedData/distributorsAndStores.js';
import { productCategorySeeds, productFamilySeeds, productInstanceSeeds } from './seedData/productCatalog.js';
import { clientSeeds, opportunitySeeds } from './seedData/clientsAndOpportunities.js';
import { visitTaskSeeds } from './seedData/visitTasks.js';
import { clientContactSeeds, clientIntelligenceSeeds, sampleMeetingSeeds } from './seedData/clientContactsAndIntelligence.js';

const prisma = new PrismaClient();

const demoUsers: Array<{ email: string; password: string; name: string; role: Role }> = [
  { email: 'admin@salesmonitor.com', password: 'admin123', name: 'Admin Utama', role: Role.SUPER_ADMIN },
  { email: 'manager@salesmonitor.com', password: 'manager123', name: 'Budi Santoso', role: Role.SALES_MANAGER },
  { email: 'sales@salesmonitor.com', password: 'sales123', name: 'Siti Nurhaliza', role: Role.SALES_REPRESENTATIVE },

  // Fase 0 (22 Sep 2026, explicit product decision): these were personal
  // accounts hardcoded in Login.tsx's demoAccounts/Quick Login (real
  // names/emails, plaintext passwords shipped to the browser bundle --
  // see MEMORY.md's P0 finding). Product owner asked to keep these
  // people able to log in with the SAME password rather than rotating it,
  // so they're seeded here with the password hashed server-side instead
  // of shipped in plaintext. This does not fix the underlying risk if any
  // of these reuse this password elsewhere -- only that this app no
  // longer displays it in DevTools. Login.tsx's demoAccounts/
  // handleQuickLogin are removed in the same change; these people now log
  // in through the normal email/password form like anyone else.
  //
  // bari@gmail.com deliberately excluded (22 Sep 2026, explicit request)
  // -- not seeded here, and removed from the database by
  // prisma/scripts/remove-user.ts if it was already created by an
  // earlier run of this seed.
  { email: 'rivelino.hasugian@gmail.com', password: 'R1vel1n0777!', name: 'Rivelino Hasugian', role: Role.SALES_MANAGER },
  { email: 'nikky@gmail.com', password: 'N1kky', name: 'Nikky', role: Role.SALES_REPRESENTATIVE },
  { email: 'andiko@gmail.com', password: 'Andik0', name: 'Andiko', role: Role.SALES_REPRESENTATIVE },
  { email: 'pipi@gmail.com', password: 'estehmanis', name: 'Pipi', role: Role.SALES_REPRESENTATIVE },
];

// Bab 12: 30 dummy points (11 Distributor + 19 Toko) for the Bab 11 map
// menu demo, seeded pre-approved (APPROVED) since they exist to be
// looked at on a map, not to exercise the Bab 9 approval flow itself —
// that flow is exercised by creating NEW ones through the API instead.
async function seedDistributorsAndStores() {
  const codeToId = new Map<string, string>();

  for (const d of distributorSeeds) {
    const distributor = await prisma.distributor.upsert({
      where: { code: d.code },
      update: { name: d.name, address: d.address, gpsLat: d.gpsLat, gpsLng: d.gpsLng },
      create: {
        code: d.code,
        name: d.name,
        address: d.address,
        gpsLat: d.gpsLat,
        gpsLng: d.gpsLng,
        status: 'APPROVED',
      },
    });
    codeToId.set(d.code, distributor.id);
  }
  console.log(`Seeded ${distributorSeeds.length} distributors (Bab 12 dummy data)`);

  for (const s of storeSeeds) {
    await prisma.store.upsert({
      where: { code: s.code },
      update: { name: s.name, address: s.address, gpsLat: s.gpsLat, gpsLng: s.gpsLng },
      create: {
        code: s.code,
        name: s.name,
        address: s.address,
        gpsLat: s.gpsLat,
        gpsLng: s.gpsLng,
        status: 'APPROVED',
        // Bab 12's table doesn't say which distributor each toko rolls
        // up to, so this stays unset rather than guessing a link the
        // source data never made.
      },
    });
  }
  console.log(`Seeded ${storeSeeds.length} stores (Bab 12 dummy data)`);
}

// Bab 16: ProductCategory "ATAP" + its 5 Product Families. No SKUs are
// seeded here — the families are catalog scaffolding (Bab 16 gives no
// real SKU/price/stock data, and its own SKU examples are explicitly
// "bukan SKU resmi Onduline"), so seeding fabricated SKUs under a real
// family name would be worse than seeding none.
async function seedProductCatalog() {
  // 5 kategori sekaligus sekarang: Atap (Bab 16, dari plan doc) + 4
  // kategori lain yang user minta ditambahkan untuk demo (Waterproofing,
  // Photovoltaic, Green Roof, Aksesoris) — datanya dari riset situs
  // resmi Onduline, belum divalidasi tim produk. Lihat komentar di
  // prisma/seedData/productCatalog.ts untuk detail & disclaimer per
  // kategori.
  const codeToId = new Map<string, string>();
  for (const cat of productCategorySeeds) {
    const category = await prisma.productCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name },
      create: { code: cat.code, name: cat.name },
    });
    codeToId.set(cat.code, category.id);
  }

  for (const fam of productFamilySeeds) {
    const categoryId = codeToId.get(fam.categoryCode);
    if (!categoryId) {
      throw new Error(`seedProductCatalog: unknown categoryCode "${fam.categoryCode}" on family "${fam.code}"`);
    }
    await prisma.productFamily.upsert({
      where: { code: fam.code },
      update: { name: fam.name, type: fam.type, categoryId },
      create: { code: fam.code, name: fam.name, type: fam.type, categoryId },
    });
  }
  console.log(`Seeded ${productCategorySeeds.length} product categories + ${productFamilySeeds.length} product families (Bab 16 Atap + demo research untuk 4 kategori lain)`);
}

async function seedProductInstances() {
  // Satu Product (SKU) contoh per Family, supaya katalog Onduline
  // benar-benar terlihat di halaman Products, bukan cuma ada di tabel
  // ProductCategory/ProductFamily yang belum punya UI sendiri. Lihat
  // komentar di prisma/seedData/productCatalog.ts untuk detail per item
  // dan disclaimer soal sumber datanya.
  let created = 0;
  for (const p of productInstanceSeeds) {
    const family = await prisma.productFamily.findUnique({ where: { code: p.familyCode } });
    if (!family) {
      throw new Error(`seedProductInstances: family code "${p.familyCode}" not found for SKU "${p.sku}" -- run seedProductCatalog() first`);
    }
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        category: p.category,
        price: p.price,
        description: p.description,
        features: p.features,
        familyId: family.id,
        variantLabel: p.variantLabel ?? null,
        skuLifecycle: 'ACTIVE',
        // Fase A follow-up: sekarang di-update juga (dulu hanya diset saat
        // create) -- supaya re-run seed ini MEMPERBAIKI 29 produk yang
        // sudah kadung ter-seed dengan stock:200/sold:5 seragam di
        // produksi, bukan cuma berlaku untuk produk baru.
        stock: p.stock,
        sold: p.sold,
        physicalAttrs: {
          upsert: {
            create: { unitOfMeasure: p.unitOfMeasure, weightKg: p.weightKg ?? null, specification: p.description },
            update: { unitOfMeasure: p.unitOfMeasure, weightKg: p.weightKg ?? null, specification: p.description },
          },
        },
      },
      create: {
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: p.price,
        currency: 'IDR',
        description: p.description,
        status: 'ACTIVE',
        stock: p.stock,
        sold: p.sold,
        features: p.features,
        familyId: family.id,
        variantLabel: p.variantLabel ?? null,
        skuLifecycle: 'ACTIVE',
        physicalAttrs: {
          create: { unitOfMeasure: p.unitOfMeasure, weightKg: p.weightKg ?? null, specification: p.description },
        },
      },
    });
    created += 1;
  }
  console.log(`Seeded ${created} product SKUs across ${productCategorySeeds.length} categories (demo katalog Onduline)`);
}

// Fase A (Bab 13/14 follow-up, 23 Sep 2026): lihat header komentar di
// prisma/seedData/clientsAndOpportunities.ts untuk alasan lengkap kenapa
// ini dibutuhkan -- ringkasnya, produksi sebelumnya punya 0 Client/
// Opportunity sama sekali, sehingga dashboard Bab 13 dan fitur "AI" Bab 14
// (yang sudah ada UI-nya tapi rule-based, bukan LLM) tidak punya apa pun
// untuk dihitung. idCustomer dipakai sebagai kunci upsert (unik di schema)
// supaya aman di-reseed berkali-kali.
async function seedClients() {
  const emailToUserId = new Map<string, string>();
  for (const email of new Set(clientSeeds.map((c) => c.submittedByEmail))) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) {
      throw new Error(`seedClients: user email "${email}" not found -- run the demoUsers loop first`);
    }
    emailToUserId.set(email, u.id);
  }

  const distCodeToId = new Map<string, string>();
  const storeCodeToId = new Map<string, string>();
  for (const c of clientSeeds) {
    if (c.distributorCode && !distCodeToId.has(c.distributorCode)) {
      const d = await prisma.distributor.findUnique({ where: { code: c.distributorCode } });
      if (!d) {
        throw new Error(`seedClients: distributor code "${c.distributorCode}" not found -- run seedDistributorsAndStores() first`);
      }
      distCodeToId.set(c.distributorCode, d.id);
    }
    if (c.storeCode && !storeCodeToId.has(c.storeCode)) {
      const s = await prisma.store.findUnique({ where: { code: c.storeCode } });
      if (!s) {
        throw new Error(`seedClients: store code "${c.storeCode}" not found -- run seedDistributorsAndStores() first`);
      }
      storeCodeToId.set(c.storeCode, s.id);
    }
  }

  let created = 0;
  for (const c of clientSeeds) {
    await prisma.client.upsert({
      where: { idCustomer: c.idCustomer },
      update: {
        namaEntitas: c.namaEntitas,
        kategoriClient: c.kategoriClient,
        owner: c.owner,
        alamatLengkap: c.alamatLengkap,
        namaPic: c.namaPic,
        jabatanPic: c.jabatanPic,
        whatsappPic: c.whatsappPic,
        emailResmi: c.emailResmi,
        salesFlow: c.salesFlow,
        distributorId: c.distributorCode ? distCodeToId.get(c.distributorCode) : null,
        storeId: c.storeCode ? storeCodeToId.get(c.storeCode) : null,
      },
      create: {
        idCustomer: c.idCustomer,
        namaEntitas: c.namaEntitas,
        kategoriClient: c.kategoriClient,
        owner: c.owner,
        alamatLengkap: c.alamatLengkap,
        namaPic: c.namaPic,
        jabatanPic: c.jabatanPic,
        whatsappPic: c.whatsappPic,
        emailResmi: c.emailResmi,
        salesFlow: c.salesFlow,
        distributorId: c.distributorCode ? distCodeToId.get(c.distributorCode) : null,
        storeId: c.storeCode ? storeCodeToId.get(c.storeCode) : null,
        status: 'APPROVED',
        submittedById: emailToUserId.get(c.submittedByEmail),
        submittedAt: new Date(),
      },
    });
    created += 1;
  }
  console.log(`Seeded ${created} clients (Fase A dummy data realistis)`);
}

const STAGE_MAP: Record<string, OpportunityStage> = {
  prospecting: 'PROSPECTING',
  proposal: 'PROPOSAL',
  negotiation: 'NEGOTIATION',
  'closed-won': 'CLOSED_WON',
  'closed-lost': 'CLOSED_LOST',
};
const STATUS_MAP: Record<string, OpportunityStatus> = {
  open: 'OPEN',
  won: 'WON',
  lost: 'LOST',
};
const STAGE_PROBABILITY: Record<string, number> = {
  prospecting: 20,
  proposal: 50,
  negotiation: 75,
  'closed-won': 100,
  'closed-lost': 0,
};

// Bab 32/33 (24 Sep 2026, deep review + smoke test grup Produk & Wilayah):
// Territory used to NOT be seeded anywhere in this script at all -- it was
// created lazily by TerritoryManagement.tsx's own frontend code the first
// time anyone opened that page (an auto-seed-on-empty-load side effect,
// itself replaced by an explicit "Load Dummy Data" button in this same
// round -- see the component's own comments). seedOpportunities() below
// depended on those exact 4 territory names already existing, but that
// dependency was only ever documented as a comment, never enforced: running
// this script against a genuinely fresh database (a new environment, CI, or
// simply before anyone had opened Territory Management in a browser even
// once) made seedOpportunities() throw on its very first record and abort
// main() before any of the seeders after it ever ran. seedTerritories()
// creates the same 4 territories (+ a performance_targets row each) that
// TerritoryManagement.tsx has always shipped as sample data, making this
// script fully self-contained. Territory.name has no @@unique constraint
// (see prisma/schema.prisma's Territory model), so this uses
// findFirst-by-name instead of upsert -- same idempotency, no schema change
// needed.
async function seedTerritories() {
  const SEED_TERRITORIES = [
    { name: 'Jakarta Pusat', region: 'DKI Jakarta', assignedTo: 'Budi Santoso', coverage: 85, target: 300000000, actual: 350000000 },
    { name: 'Jakarta Selatan', region: 'DKI Jakarta', assignedTo: 'Ani Wijaya', coverage: 78, target: 300000000, actual: 280000000 },
    { name: 'Bandung', region: 'Jawa Barat', assignedTo: 'Dewi Kartika', coverage: 92, target: 400000000, actual: 520000000 },
    { name: 'Surabaya', region: 'Jawa Timur', assignedTo: 'Eko Prasetyo', coverage: 65, target: 250000000, actual: 185000000 },
  ];
  const period = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  let created = 0;
  for (const seed of SEED_TERRITORIES) {
    let territory = await prisma.territory.findFirst({ where: { name: seed.name } });
    if (!territory) {
      territory = await prisma.territory.create({
        data: { name: seed.name, region: seed.region, assignedTo: seed.assignedTo, coverage: seed.coverage },
      });
      created += 1;
    }

    const existingTarget = await prisma.performanceTarget.findFirst({
      where: { territoryId: territory.id, period },
    });
    if (!existingTarget) {
      await prisma.performanceTarget.create({
        data: { territoryId: territory.id, period, target: seed.target, actual: seed.actual },
      });
    }
  }
  console.log(`Seeded ${created} territories (${SEED_TERRITORIES.length} total, idempotent).`);
}

// Idempotent via findFirst-by-name(clientId+name) before create, since
// Opportunity has no natural unique business key of its own. Depends on
// seedTerritories() above having already run in this same main().
async function seedOpportunities() {
  const clientByCustId = new Map<string, NonNullable<Awaited<ReturnType<typeof prisma.client.findUnique>>>>();
  for (const c of clientSeeds) {
    const client = await prisma.client.findUnique({ where: { idCustomer: c.idCustomer } });
    if (!client) {
      throw new Error(`seedOpportunities: client "${c.idCustomer}" not found -- run seedClients() first`);
    }
    clientByCustId.set(c.idCustomer, client);
  }

  const userByEmail = new Map<string, { id: string; name: string }>();
  const territoryByName = new Map<string, { id: string }>();
  const productBySku = new Map<string, { id: string; name: string; price: unknown }>();

  let created = 0;
  let skipped = 0;
  for (const o of opportunitySeeds) {
    const client = clientByCustId.get(o.clientIdCustomer);
    if (!client) {
      throw new Error(`seedOpportunities: unknown clientIdCustomer "${o.clientIdCustomer}"`);
    }

    if (!userByEmail.has(o.ownerEmail)) {
      const u = await prisma.user.findUnique({ where: { email: o.ownerEmail } });
      if (!u) {
        throw new Error(`seedOpportunities: owner email "${o.ownerEmail}" not found`);
      }
      userByEmail.set(o.ownerEmail, u);
    }
    const owner = userByEmail.get(o.ownerEmail)!;

    if (!territoryByName.has(o.territoryName)) {
      const t = await prisma.territory.findFirst({ where: { name: o.territoryName } });
      if (!t) {
        throw new Error(
          `seedOpportunities: territory "${o.territoryName}" not found -- Territory dibuat manual lewat UI, bukan di-seed, jadi harus sudah ada dulu`
        );
      }
      territoryByName.set(o.territoryName, t);
    }
    const territory = territoryByName.get(o.territoryName)!;

    const productLines: { productId: string; productName: string; quantity: number; unitPrice: number; totalPrice: number }[] = [];
    for (const line of o.products) {
      if (!productBySku.has(line.sku)) {
        const p = await prisma.product.findUnique({ where: { sku: line.sku } });
        if (!p) {
          throw new Error(`seedOpportunities: product sku "${line.sku}" not found -- run seedProductInstances() first`);
        }
        productBySku.set(line.sku, p);
      }
      const product = productBySku.get(line.sku)!;
      const unitPrice = Number(product.price);
      productLines.push({
        productId: product.id,
        productName: product.name,
        quantity: line.quantity,
        unitPrice,
        totalPrice: unitPrice * line.quantity,
      });
    }
    const totalValue = productLines.reduce((sum, l) => sum + l.totalPrice, 0);

    const existing = await prisma.opportunity.findFirst({ where: { clientId: client.id, name: o.name } });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.opportunity.create({
      data: {
        name: o.name,
        clientId: client.id,
        clientName: client.namaEntitas,
        contactPerson: client.namaPic || client.namaEntitas,
        email: client.emailResmi ?? undefined,
        phone: client.whatsappPic ?? undefined,
        totalValue,
        currency: 'IDR',
        probability: STAGE_PROBABILITY[o.stage],
        createdDate: new Date(o.createdDate),
        closeDate: new Date(o.closeDate),
        actualCloseDate: o.actualCloseDate ? new Date(o.actualCloseDate) : null,
        stage: STAGE_MAP[o.stage],
        status: STATUS_MAP[o.status],
        ownerId: owner.id,
        ownerName: owner.name,
        source: o.source,
        description: o.description,
        salesFlow: client.salesFlow,
        territoryId: territory.id,
        products: {
          create: productLines,
        },
      },
    });
    created += 1;
  }
  console.log(`Seeded ${created} opportunities (${skipped} already existed, dilewati) -- Fase A dummy data realistis`);
}

// Bab 16.5 lanjutan (24 Sep 2026): contoh Organisation Tree/Influence Map
// + Customer Intelligence untuk sebagian client (lihat rationale lengkap
// di seedData/clientContactsAndIntelligence.ts -- cuma 4 dari 12 client,
// sengaja, supaya data demo mencerminkan kenyataan bahwa tidak semua
// client langsung diisi lengkap). Idempotent lewat findFirst-by-
// (clientId+nama) untuk ClientContact (tidak ada unique key bisnis, sama
// seperti pola Opportunity di atas) dan upsert-by-clientId untuk
// ClientIntelligence (memang @unique). Sample meeting di-skip kalau
// activity dengan opportunityId+contactId+description yang sama sudah ada.
async function seedClientContactsAndIntelligence() {
  const clientByCustId = new Map<string, NonNullable<Awaited<ReturnType<typeof prisma.client.findUnique>>>>();
  for (const custId of new Set(clientContactSeeds.map((c) => c.clientIdCustomer))) {
    const client = await prisma.client.findUnique({ where: { idCustomer: custId } });
    if (!client) {
      throw new Error(`seedClientContactsAndIntelligence: client "${custId}" not found -- run seedClients() first`);
    }
    clientByCustId.set(custId, client);
  }

  // Pass 1: create/update tiap kontak TANPA reportsToId dulu (supaya urutan
  // atasan/bawahan di array tidak masalah), simpan id per (clientIdCustomer, nama).
  const contactIdByKey = new Map<string, string>();
  let createdContacts = 0;
  for (const c of clientContactSeeds) {
    const client = clientByCustId.get(c.clientIdCustomer)!;
    const key = `${c.clientIdCustomer}::${c.nama}`;
    const existing = await prisma.clientContact.findFirst({ where: { clientId: client.id, nama: c.nama } });
    if (existing) {
      contactIdByKey.set(key, existing.id);
      continue;
    }
    const created = await prisma.clientContact.create({
      data: {
        clientId: client.id,
        nama: c.nama,
        jabatan: c.jabatan,
        email: c.email ?? null,
        telepon: c.telepon ?? null,
        whatsapp: c.whatsapp ?? null,
        influenceRole: c.influenceRole,
        relationshipStatus: c.relationshipStatus,
        closeness: c.closeness,
        notes: c.notes ?? null,
      },
    });
    contactIdByKey.set(key, created.id);
    createdContacts += 1;
  }

  // Pass 2: isi reportsToId setelah semua kontak per client punya id.
  for (const c of clientContactSeeds) {
    if (!c.reportsToNama) continue;
    const contactId = contactIdByKey.get(`${c.clientIdCustomer}::${c.nama}`);
    const bossId = contactIdByKey.get(`${c.clientIdCustomer}::${c.reportsToNama}`);
    if (!contactId || !bossId) {
      throw new Error(
        `seedClientContactsAndIntelligence: gagal resolve reportsToNama "${c.reportsToNama}" untuk "${c.nama}" (${c.clientIdCustomer})`
      );
    }
    await prisma.clientContact.update({ where: { id: contactId }, data: { reportsToId: bossId } });
  }

  let createdIntel = 0;
  for (const intel of clientIntelligenceSeeds) {
    const client = clientByCustId.get(intel.clientIdCustomer);
    if (!client) {
      throw new Error(`seedClientContactsAndIntelligence: client "${intel.clientIdCustomer}" not found for intelligence seed`);
    }
    const fields = {
      profilBisnis: intel.profilBisnis ?? null,
      proyekBerjalan: intel.proyekBerjalan ?? null,
      kompetitorEksisting: intel.kompetitorEksisting ?? null,
      sumberInformasi: intel.sumberInformasi ?? null,
      catatanTambahan: intel.catatanTambahan ?? null,
    };
    await prisma.clientIntelligence.upsert({
      where: { clientId: client.id },
      update: fields,
      create: { clientId: client.id, ...fields },
    });
    createdIntel += 1;
  }

  let createdMeetings = 0;
  let skippedMeetings = 0;
  for (const m of sampleMeetingSeeds) {
    const client = clientByCustId.get(m.clientIdCustomer);
    if (!client) {
      throw new Error(`seedClientContactsAndIntelligence: client "${m.clientIdCustomer}" not found for sample meeting`);
    }
    const opportunity = await prisma.opportunity.findFirst({ where: { clientId: client.id, name: m.opportunityName } });
    if (!opportunity) {
      throw new Error(`seedClientContactsAndIntelligence: opportunity "${m.opportunityName}" not found -- run seedOpportunities() first`);
    }
    const contactId = contactIdByKey.get(`${m.clientIdCustomer}::${m.contactNama}`);
    if (!contactId) {
      throw new Error(`seedClientContactsAndIntelligence: contact "${m.contactNama}" not found for sample meeting (${m.clientIdCustomer})`);
    }
    const existing = await prisma.opportunityActivity.findFirst({
      where: { opportunityId: opportunity.id, contactId, description: m.description },
    });
    if (existing) {
      skippedMeetings += 1;
      continue;
    }
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - m.daysAgo);
    await prisma.opportunityActivity.create({
      data: { opportunityId: opportunity.id, type: m.type, description: m.description, contactId, createdAt },
    });
    createdMeetings += 1;
  }

  console.log(
    `Seeded ${createdContacts} client contacts, ${createdIntel} client intelligence records, ${createdMeetings} sample meetings (${skippedMeetings} already existed) -- Bab 16.5`
  );
}

// Fase B (Bab 13) follow-up: kepatuhan visit KPI butuh Task nyata
// bertipe VISIT dengan checkInAt terisi/kosong -- lihat seedData/visitTasks.ts
// untuk rationale lengkap (31/38 = ~81.6% kepatuhan, sengaja tidak sempurna).
async function seedVisitTasks() {
  const storeCodeToId = new Map<string, string>();
  for (const t of visitTaskSeeds) {
    if (!storeCodeToId.has(t.storeCode)) {
      const s = await prisma.store.findUnique({ where: { code: t.storeCode } });
      if (!s) {
        throw new Error(`seedVisitTasks: store code "${t.storeCode}" not found -- run seedDistributorsAndStores() first`);
      }
      storeCodeToId.set(t.storeCode, s.id);
    }
  }

  const emailToUser = new Map<string, { id: string; name: string }>();
  for (const email of new Set(visitTaskSeeds.map((t) => t.ownerEmail))) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) {
      throw new Error(`seedVisitTasks: user email "${email}" not found -- run the demoUsers loop first`);
    }
    emailToUser.set(email, { id: u.id, name: u.name });
  }

  let created = 0;
  let skipped = 0;
  for (const t of visitTaskSeeds) {
    const storeId = storeCodeToId.get(t.storeCode)!;
    const owner = emailToUser.get(t.ownerEmail)!;
    const dueDate = new Date(t.dueDate);

    const existing = await prisma.task.findFirst({
      where: { storeId, type: 'VISIT', dueDate },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const checkInAt = t.checkedIn ? new Date(dueDate.getTime() + t.checkInOffsetHours * 60 * 60 * 1000) : null;

    await prisma.task.create({
      data: {
        title: t.title,
        category: t.category,
        type: 'VISIT',
        status: t.checkedIn ? 'COMPLETED' : 'TODO',
        priority: 'MEDIUM',
        dueDate,
        completedDate: checkInAt,
        assignedTo: t.assignedTo,
        createdBy: owner.name,
        storeId,
        ownerId: owner.id,
        checkInAt,
        checkInLat: t.checkedIn ? t.gpsLat : null,
        checkInLng: t.checkedIn ? t.gpsLng : null,
        locationValidated: t.checkedIn ? true : null,
      },
    });
    created += 1;
  }
  console.log(`Seeded ${created} visit tasks (${skipped} already existed, dilewati) -- Fase B kepatuhan visit`);
}


// ---------------------------------------------------------------------
// Bab 30 lanjutan (24 Sep 2026, hasil deep review + smoke test grup menu
// Sales Pipeline) -- data dummy TERHUBUNG untuk Contract, Quotation, dan
// Discount Approval. Sebelum ini: 11 Opportunity Closed-Won sungguhan
// senilai total Rp 904.7M tanpa SATU PUN Contract yang menaut ke sana,
// dan NOL Discount Approval request sungguhan di production DB (lihat
// MEMORY.md bab 30). Ketiga fungsi di bawah SENGAJA query Opportunity/
// Client yang sudah ada di database (bukan bikin Client/Opportunity
// palsu baru) supaya data dummy ini benar-benar "nyambung" dengan data
// nyata yang sudah ada -- sesuai permintaan user.
//
// Semua idempotent lewat unique key (Contract.opportunityId,
// Quotation.quoteNumber, DiscountApprovalRequest.requestNumber) supaya
// aman dijalankan berkali-kali (npm run db:seed).

async function seedContracts() {
  // Opportunity Closed-Won yang belum punya Contract sama sekali --
  // persis gap yang ditemukan smoke test Bab 30 (11 deal, Rp 904.7M, 0
  // contract). Diambil maksimal 8 supaya data demo tidak berlebihan.
  const wonOpportunities = await prisma.opportunity.findMany({
    where: { status: OpportunityStatus.WON, contract: null },
    include: { client: true, products: true },
    orderBy: { actualCloseDate: 'desc' },
    take: 8,
  });

  if (wonOpportunities.length === 0) {
    console.log('seedContracts: tidak ada Opportunity Closed-Won tanpa Contract -- dilewati (jalankan seedOpportunities() dulu, atau semua sudah ter-seed)');
    return;
  }

  let created = 0;
  for (const [index, opp] of wonOpportunities.entries()) {
    const startDate = opp.actualCloseDate ?? opp.closeDate;
    // Variasi status supaya UI Contract.tsx (yang menghitung status
    // efektif dari endDate, lihat getEffectiveContractStatus) benar-benar
    // menampilkan campuran ACTIVE/EXPIRED/TERMINATED, bukan cuma ACTIVE.
    const variant = index % 4;
    const endDate = new Date(startDate);
    if (variant === 1) {
      // Sudah lewat -- akan tampil EXPIRED secara efektif di UI meski
      // status tersimpan tetap ACTIVE (mencerminkan kontrak lama yg belum
      // diperbarui adminnya, kasus nyata yang umum).
      endDate.setMonth(endDate.getMonth() + 3);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    const status: ContractStatus = variant === 3 ? ContractStatus.TERMINATED : ContractStatus.ACTIVE;

    const productLabel = opp.products.length > 0
      ? opp.products.map((p) => p.productName).slice(0, 2).join(' + ') + (opp.products.length > 2 ? ', dll' : '')
      : 'Layanan Onduline';

    await prisma.contract.upsert({
      where: { opportunityId: opp.id },
      update: {},
      create: {
        contractNumber: `CTR-${startDate.getFullYear()}-SEED-${String(index + 1).padStart(3, '0')}`,
        clientId: opp.clientId,
        clientName: opp.clientName,
        company: opp.client?.namaEntitas ?? opp.clientName,
        opportunityId: opp.id,
        product: productLabel,
        value: opp.totalValue,
        startDate,
        endDate,
        status,
        signedBy: opp.client?.namaPic || 'Direktur Utama',
        salesPerson: opp.ownerName,
      },
    });
    created += 1;
  }
  console.log(`Seeded ${created} contracts, ditautkan ke Opportunity Closed-Won sungguhan (Bab 30 data dummy terhubung)`);
}

async function seedQuotations() {
  // Campuran opportunity yang masih berjalan (untuk quotation draft/sent)
  // dan yang sudah Closed-Won (untuk quotation approved, mencerminkan
  // quotation yang berujung deal) -- semua Opportunity sungguhan, bukan
  // client/opportunity palsu baru.
  const [openOpportunities, wonOpportunities, lostOpportunities] = await Promise.all([
    prisma.opportunity.findMany({
      where: { status: OpportunityStatus.OPEN },
      include: { client: true, products: true },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    prisma.opportunity.findMany({
      where: { status: OpportunityStatus.WON },
      include: { client: true, products: true },
      orderBy: { actualCloseDate: 'desc' },
      take: 2,
    }),
    prisma.opportunity.findMany({
      where: { status: OpportunityStatus.LOST },
      include: { client: true, products: true },
      orderBy: { createdAt: 'desc' },
      take: 2,
    }),
  ]);

  const candidates: { opp: (typeof openOpportunities)[number]; status: QuotationStatus; discount: number }[] = [
    ...openOpportunities.map((opp, i) => ({ opp, status: i % 2 === 0 ? QuotationStatus.SENT : QuotationStatus.DRAFT, discount: i % 2 === 0 ? 5 : 0 })),
    ...wonOpportunities.map((opp) => ({ opp, status: QuotationStatus.APPROVED, discount: 10 })),
    ...lostOpportunities.map((opp) => ({ opp, status: QuotationStatus.REJECTED, discount: 0 })),
  ];

  if (candidates.length === 0) {
    console.log('seedQuotations: tidak ada Opportunity yang bisa dipakai -- dilewati (jalankan seedOpportunities() dulu)');
    return;
  }

  // Fallback kalau sebuah opportunity kebetulan tidak punya line item
  // produk sama sekali (lihat seedOpportunities -- seharusnya selalu ada,
  // tapi dijaga supaya seed ini tidak crash pada data yang tidak terduga).
  const fallbackProducts = candidates.every((c) => c.opp.products.length > 0)
    ? []
    : await prisma.product.findMany({ take: 2 });

  let created = 0;
  for (const [index, { opp, status, discount }] of candidates.entries()) {
    const quoteNumber = `QTN-${new Date().getFullYear()}-SEED-${String(index + 1).padStart(3, '0')}`;
    const existing = await prisma.quotation.findUnique({ where: { quoteNumber } });
    if (existing) continue;

    const lineSource = opp.products.length > 0
      ? opp.products.map((p) => ({ productId: p.productId, productName: p.productName, quantity: p.quantity, unitPrice: Number(p.unitPrice) }))
      : fallbackProducts.map((p) => ({ productId: p.id, productName: p.name, quantity: 1, unitPrice: Number(p.price) }));

    // Sama seperti computeQuotationTotals() di api/handler.ts -- dihitung
    // manual di sini karena seed script tidak lewat API, supaya subtotal/
    // totalAmount tetap konsisten dengan rumus yang sama (termasuk
    // additional discount, bug yang justru diperbaiki Bab 30 lanjutan ini).
    const subtotal = lineSource.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const totalAmount = subtotal - (subtotal * discount) / 100;

    await prisma.quotation.create({
      data: {
        quoteNumber,
        clientId: opp.clientId,
        clientName: opp.clientName,
        clientCompany: opp.client?.namaEntitas ?? opp.clientName,
        clientEmail: opp.client?.emailResmi ?? opp.email,
        opportunityId: opp.id,
        subtotal,
        additionalDiscountPercent: discount,
        totalAmount,
        status,
        validUntil: new Date(new Date(opp.createdDate ?? opp.closeDate).getTime() + 30 * 24 * 60 * 60 * 1000),
        notes: status === QuotationStatus.REJECTED ? 'Client memilih vendor lain.' : null,
        items: {
          create: lineSource.map((l) => ({
            productId: l.productId,
            productName: l.productName,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPercent: 0,
            lineTotal: l.quantity * l.unitPrice,
          })),
        },
      },
    });
    created += 1;
  }
  console.log(`Seeded ${created} quotations, ditautkan ke Opportunity/Client sungguhan (Bab 30 data dummy terhubung)`);
}

async function seedDiscountApprovals() {
  // Bab 30: production DB punya NOL discount approval request sungguhan
  // meski fiturnya (setelah fix enum casing) sudah berfungsi penuh --
  // data dummy ini menaut ke Client sungguhan dan sengaja memvariasikan
  // discountPercent supaya keempat level approval (lihat
  // discountLevelForPercent di api/handler.ts: <=10% level 1 self-approve,
  // <=20% level 2, <=30% level 3, >30% level 4) semua terwakili, plus satu
  // kasus REJECTED -- exercising seluruh state yang UI-nya sudah dibangun
  // untuk ditampilkan tapi belum pernah ada datanya.
  const clients = await prisma.client.findMany({ take: 5, orderBy: { createdAt: 'asc' } });
  if (clients.length === 0) {
    console.log('seedDiscountApprovals: tidak ada Client -- dilewati (jalankan seedClients() dulu)');
    return;
  }
  const sales = await prisma.user.findUnique({ where: { email: 'sales@salesmonitor.com' } });
  const manager = await prisma.user.findUnique({ where: { email: 'manager@salesmonitor.com' } });
  const admin = await prisma.user.findUnique({ where: { email: 'admin@salesmonitor.com' } });
  if (!sales || !manager || !admin) {
    console.log('seedDiscountApprovals: demo users belum ter-seed -- dilewati');
    return;
  }

  type Scenario = {
    discountPercent: number;
    finalStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
    label: string;
  };
  // Satu skenario per level (1-4) + satu REJECTED tambahan di level 2,
  // dipasangkan berurutan dengan clients[0..4] yang sudah ada.
  const scenarios: Scenario[] = [
    { discountPercent: 8, finalStatus: 'APPROVED', label: 'Level 1 (self-approve, <=10%)' },
    { discountPercent: 15, finalStatus: 'PENDING', label: 'Level 2 (menunggu Sales Manager)' },
    { discountPercent: 25, finalStatus: 'PENDING', label: 'Level 3 (menunggu Super Admin)' },
    { discountPercent: 35, finalStatus: 'APPROVED', label: 'Level 4 (disetujui penuh berjenjang)' },
    { discountPercent: 18, finalStatus: 'REJECTED', label: 'Level 2 (ditolak Sales Manager)' },
  ];

  let created = 0;
  for (const [index, scenario] of scenarios.entries()) {
    const client = clients[index % clients.length];
    const requestNumber = `DR-SEED-${String(index + 1).padStart(3, '0')}`;
    const existing = await prisma.discountApprovalRequest.findUnique({ where: { requestNumber } });
    if (existing) continue;

    const originalPrice = 50_000_000 + index * 25_000_000;
    const discountAmount = originalPrice * (scenario.discountPercent / 100);
    const finalPrice = originalPrice - discountAmount;
    const originalMargin = 30;
    const proposedMargin = originalMargin - scenario.discountPercent * 0.6;

    const level = scenario.discountPercent <= 10 ? 1 : scenario.discountPercent <= 20 ? 2 : scenario.discountPercent <= 30 ? 3 : 4;
    const levelLabels = ['Sales Executive', 'Sales Manager', 'Sales Director', 'C-Level'];

    const steps: { level: number; approverName: string; approverRole: string; action: 'APPROVED' | 'REJECTED' | 'PENDING'; decidedAt?: Date; comment?: string }[] = [
      { level: 1, approverName: sales.name, approverRole: levelLabels[0], action: 'APPROVED', decidedAt: new Date(), comment: 'Self-approval sesuai kewenangan (diskon <= 10%)' },
    ];
    for (let lvl = 2; lvl <= level; lvl += 1) {
      const approver = lvl === 2 ? manager : admin;
      const isLastStep = lvl === level;
      if (!isLastStep) {
        steps.push({ level: lvl, approverName: approver.name, approverRole: levelLabels[lvl - 1], action: 'APPROVED', decidedAt: new Date(), comment: 'Disetujui, lanjut ke level berikutnya' });
      } else if (scenario.finalStatus === 'PENDING') {
        steps.push({ level: lvl, approverName: '', approverRole: levelLabels[lvl - 1], action: 'PENDING' });
      } else if (scenario.finalStatus === 'REJECTED') {
        steps.push({ level: lvl, approverName: approver.name, approverRole: levelLabels[lvl - 1], action: 'REJECTED', decidedAt: new Date(), comment: 'Margin terlalu tipis untuk disetujui saat ini' });
      } else {
        steps.push({ level: lvl, approverName: approver.name, approverRole: levelLabels[lvl - 1], action: 'APPROVED', decidedAt: new Date(), comment: 'Disetujui' });
      }
    }

    await prisma.discountApprovalRequest.create({
      data: {
        requestNumber,
        clientName: client.namaEntitas,
        productName: 'Atap Onduline Bitumen Corrugated Sheet',
        originalPrice,
        discountPercent: scenario.discountPercent,
        discountAmount,
        finalPrice,
        requestedById: sales.id,
        requestedByName: sales.name,
        reason: `Permintaan diskon ${scenario.discountPercent}% untuk memenangkan deal -- ${scenario.label}`,
        status: scenario.finalStatus,
        currentApprover: scenario.finalStatus === 'PENDING' ? levelLabels[level - 1] : '-',
        approvalLevel: level,
        urgency: index % 2 === 0 ? 'high' : 'medium',
        originalMargin,
        proposedMargin,
        region: 'Jabodetabek',
        steps: { create: steps },
      },
    });
    created += 1;
  }
  console.log(`Seeded ${created} discount approval requests, ditautkan ke Client sungguhan, mencakup semua level (Bab 30 data dummy terhubung)`);
}

async function main() {
  for (const u of demoUsers) {
    const passwordHash = await hashPassword(u.password);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { email: u.email, name: u.name, role: u.role, passwordHash },
    });
    console.log(`Seeded ${u.email} (${u.role})`);
  }

  await seedDistributorsAndStores();
  await seedProductCatalog();
  await seedProductInstances();
  await seedClients();
  await seedTerritories();
  await seedOpportunities();
  await seedClientContactsAndIntelligence();
  await seedVisitTasks();
  await seedContracts();
  await seedQuotations();
  await seedDiscountApprovals();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
