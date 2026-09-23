// Product model — single source of truth for Onduline's physical
// building-material catalog.
//
// History (23 Sep 2026): this file used to be a discriminated union of
// SoftwareProduct | PhysicalProduct, mirroring a Postgres supertype/
// subtype split (products + product_software_attrs/product_physical_attrs)
// inherited from an earlier assumption that the business also sold
// software packages (e.g. hospital systems). That software line was
// removed: Onduline is a physical building-materials distributor only,
// and prisma/seed.ts never seeded a single software-typed product. The
// physical-only fields below (previously on PhysicalProduct) are now
// just Product fields, since there is no longer a second variant to
// distinguish them from. See prisma/schema.prisma's Product model
// comment and prisma/migrations/20260923090000_remove_product_software_line
// for the corresponding schema change.
//
// Revision note (kept from the original design, still accurate): the UI
// depends on three fields for every product — these live directly on
// Product:
//   - `stock`      : available warehouse quota ("units still sellable").
//   - `features`   : marketing/spec bullet list shown on the product
//                    card and in the quote builder (ConfigurePriceQuote
//                    reads `product.features` directly).
//   - `sold`       : cumulative units sold to date, used for the "Best
//                    Seller" stat and revenue-to-date display in
//                    ProductCatalog. This is really an aggregate derived
//                    from sales/performance data, not a true product
//                    attribute — kept here for now only because that's
//                    how the current UI already models it; replacing it
//                    with a real aggregation over performance_targets is
//                    out of scope for Tahap A. Flagged as an improvement
//                    candidate for Tahap B.
//
// This file replaces the divergent local `interface Product` definitions
// previously scattered across src/app/data/dummyData.ts and individual
// components — those should import from here instead of redefining their
// own shape.

export type ProductStatus = 'active' | 'discontinued';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  currency: string; // ISO 4217, e.g. 'IDR'
  description: string;
  status: ProductStatus;
  /** Marketing/spec bullet points shown on the product card and in quote builders. */
  features: string[];
  /** Available warehouse stock. */
  stock: number;
  /** Cumulative units sold to date (aggregate display field — see revision note above). */
  sold: number;
  unitOfMeasure: string; // e.g. 'm2', 'pcs', 'roll'
  color?: string;
  specification: string;
  weightKg?: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Fields accepted when creating a product — id/createdAt/updatedAt are assigned by the repository. */
export type NewProduct = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
