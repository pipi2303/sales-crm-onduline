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
import { PrismaClient, Role, OpportunityStage, OpportunityStatus } from '@prisma/client';
import { hashPassword } from '../lib/auth.js';
import { distributorSeeds, storeSeeds } from './seedData/distributorsAndStores.js';
import { productCategorySeeds, productFamilySeeds, productInstanceSeeds } from './seedData/productCatalog.js';
import { clientSeeds, opportunitySeeds } from './seedData/clientsAndOpportunities.js';

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

// Territory is NOT seeded anywhere in this script (created manually by
// the user through the app's own UI -- see the comment in
// clientsAndOpportunities.ts) -- so this looks up existing records by
// name and fails loudly if one doesn't exist yet, rather than silently
// creating a new placeholder Territory that would fork from the real one.
// Idempotent via findFirst-by-name(clientId+name) before create, since
// Opportunity has no natural unique business key of its own.
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
  await seedOpportunities();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
