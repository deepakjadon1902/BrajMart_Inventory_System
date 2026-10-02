import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { InventoryTransaction } from '../src/models/InventoryTransaction.js';

describe('BrajMart Inventory Acceptance & API Tests', () => {
  let categoryId: string;

  beforeAll(async () => {
    await connectDB();
    await Product.deleteMany({});
    await Category.deleteMany({});
    await InventoryTransaction.deleteMany({});

    // Create a base category
    const cat = await Category.create({
      name: 'Acceptance Category',
      slug: 'acceptance-category',
    });
    categoryId = cat._id.toString();
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  it('Acceptance Test (Rule #105): product lifecycle', async () => {
    // 1. Create product: Qty 100, Cost ₹80, Sell ₹120
    const createRes = await request(app)
      .post('/api/products')
      .send({
        name: 'Acceptance Item',
        sku: 'ACCEPT-ITEM-001',
        categoryId,
        unitType: 'pcs',
        openingQuantity: 100,
        costPerUnit: 80,
        sellingPricePerUnit: 120,
        reorderLevel: 20,
      });

    expect(createRes.status).toBe(201);
    const p1 = createRes.body.data;
    expect(p1.currentQuantity).toBe(100);
    // Inventory Cost: 100 * 80 = 8000 (800,000 paise)
    expect(p1.inventoryCostPaise).toBe(800000);
    // Selling Value: 100 * 120 = 12000 (1,200,000 paise)
    expect(p1.sellingValuePaise).toBe(1200000);
    // Potential Profit: 12000 - 8000 = 4000 (400,000 paise)
    expect(p1.potentialProfitPaise).toBe(400000);

    const productId = p1._id;

    // Verify OPENING_STOCK transaction was created in DB
    const txList1 = await InventoryTransaction.find({ productId });
    expect(txList1.length).toBe(1);
    expect(txList1[0].type).toBe('OPENING_STOCK');
    expect(txList1[0].quantityDelta).toBe(100);

    // 2. Add 20 units (Stock-In)
    const stockInRes = await request(app)
      .post(`/api/products/${productId}/stock-in`)
      .send({
        quantity: 20,
        reason: 'Restock shipment received',
        reference: 'PO-9901',
      });

    expect(stockInRes.status).toBe(200);
    const p2 = stockInRes.body.data;
    // Expected: Qty 120, Cost ₹9,600, Selling ₹14,400, Profit ₹4,800
    expect(p2.currentQuantity).toBe(120);
    expect(p2.inventoryCostPaise).toBe(960000); // ₹9,600
    expect(p2.sellingValuePaise).toBe(1440000); // ₹14,400
    expect(p2.potentialProfitPaise).toBe(480000); // ₹4,800

    // 3. Remove 15 units (Stock-Out)
    const stockOutRes = await request(app)
      .post(`/api/products/${productId}/stock-out`)
      .send({
        quantity: 15,
        type: 'STOCK_OUT',
        reason: 'Order fulfillment',
      });

    expect(stockOutRes.status).toBe(200);
    const p3 = stockOutRes.body.data;
    // Expected: Qty 105, Cost ₹8,400, Selling ₹12,600, Profit ₹4,200
    expect(p3.currentQuantity).toBe(105);
    expect(p3.inventoryCostPaise).toBe(840000); // ₹8,400
    expect(p3.sellingValuePaise).toBe(1260000); // ₹12,600
    expect(p3.potentialProfitPaise).toBe(420000); // ₹4,200
  });

  it('Multi-item acceptance test & dashboard aggregation (Rule #106)', async () => {
    // Clean products to strictly test two products
    await Product.deleteMany({});
    await InventoryTransaction.deleteMany({});

    // First product: Quantity = 100, Cost = ₹80, Selling = ₹120
    await request(app).post('/api/products').send({
      name: 'Acceptance Item Alpha',
      sku: 'ACCEPT-ALPHA',
      categoryId,
      unitType: 'pcs',
      openingQuantity: 100,
      costPerUnit: 80,
      sellingPricePerUnit: 120,
    });

    // Second product: Quantity = 50, Cost = ₹200, Selling = ₹275
    await request(app).post('/api/products').send({
      name: 'Acceptance Item Beta',
      sku: 'ACCEPT-BETA',
      categoryId,
      unitType: 'pcs',
      openingQuantity: 50,
      costPerUnit: 200,
      sellingPricePerUnit: 275,
    });

    // Fetch Dashboard Summary directly from DB aggregation
    const dashRes = await request(app).get('/api/dashboard/summary');
    expect(dashRes.status).toBe(200);
    const summary = dashRes.body.data;

    // Expected: Total Products = 2, Total Units = 150
    expect(summary.totalProducts).toBe(2);
    expect(summary.totalUnits).toBe(150);

    // Inventory Cost: 100*80 (8000) + 50*200 (10000) = ₹18,000 (1,800,000 paise)
    expect(summary.inventoryCostPaise).toBe(1800000);

    // Selling Value: 100*120 (12000) + 50*275 (13750) = ₹25,750 (2,575,000 paise)
    expect(summary.sellingValuePaise).toBe(2575000);

    // Profit: ₹25,750 - ₹18,000 = ₹7,750 (775,000 paise)
    expect(summary.potentialProfitPaise).toBe(775000);
  });

  it('Enforces Non-Negative Stock & Concurrency Guard (Rule #102)', async () => {
    // Create product with 10 units
    const createRes = await request(app).post('/api/products').send({
      name: 'Guarded Stock Item',
      sku: 'GUARD-001',
      categoryId,
      unitType: 'pcs',
      openingQuantity: 10,
      costPerUnit: 50,
      sellingPricePerUnit: 100,
    });
    const id = createRes.body.data._id;

    // Request A (-7) and Request B (-5) in parallel
    const [resA, resB] = await Promise.all([
      request(app).post(`/api/products/${id}/stock-out`).send({ quantity: 7 }),
      request(app).post(`/api/products/${id}/stock-out`).send({ quantity: 5 }),
    ]);

    // One must succeed (200), and the other must fail with 400 INSUFFICIENT_STOCK
    const successCount = [resA, resB].filter((r) => r.status === 200).length;
    const failureCount = [resA, resB].filter((r) => r.status === 400).length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    // Database stock must NEVER be negative
    const dbProduct = await Product.findById(id);
    expect(dbProduct?.currentQuantity).toBeGreaterThanOrEqual(0);
  });

  it('Rejects Duplicate SKU (Rule #10)', async () => {
    const res = await request(app).post('/api/products').send({
      name: 'Duplicate SKU Item',
      sku: 'GUARD-001', // already used above
      categoryId,
      unitType: 'pcs',
      openingQuantity: 5,
      costPerUnit: 10,
      sellingPricePerUnit: 20,
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_SKU');
  });

  it('Stock Adjustment (Rule #16)', async () => {
    // Create product with 50 units
    const createRes = await request(app).post('/api/products').send({
      name: 'Counted Stock Item',
      sku: 'COUNTED-001',
      categoryId,
      unitType: 'pcs',
      openingQuantity: 50,
      costPerUnit: 10,
      sellingPricePerUnit: 20,
    });
    const id = createRes.body.data._id;

    // Physical count says 47
    const adjustRes = await request(app)
      .post(`/api/products/${id}/adjust`)
      .send({
        actualQuantity: 47,
        reason: 'Physical stock correction count',
      });

    expect(adjustRes.status).toBe(200);
    expect(adjustRes.body.data.currentQuantity).toBe(47);

    // Check transaction was logged as ADJUSTMENT_OUT with delta -3
    const tx = await InventoryTransaction.findOne({
      productId: id,
      type: 'ADJUSTMENT_OUT',
    });
    expect(tx).not.toBeNull();
    expect(tx?.quantityDelta).toBe(-3);
    expect(tx?.previousQuantity).toBe(50);
    expect(tx?.newQuantity).toBe(47);
  });
});
