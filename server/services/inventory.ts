import { db } from "../db";
import { 
  inventoryCategories, 
  inventoryItems, 
  inventorySuppliers,
  inventoryPurchaseOrders,
  inventoryPurchaseOrderItems,
  inventoryBatches,
  inventorySales,
  inventorySaleItems,
  inventoryStockMovements,
  inventoryStockAlerts,
  type InsertInventoryCategory,
  type InsertInventoryItem,
  type InsertInventorySupplier,
  type InsertInventoryPurchaseOrder,
  type InsertInventoryPurchaseOrderItem,
  type InsertInventoryBatch,
  type InsertInventorySale,
  type InsertInventorySaleItem,
  type InsertInventoryStockMovement,
  type InsertInventoryStockAlert
} from "@shared/schema";
import { eq, and, desc, sql, sum, gte, lte } from "drizzle-orm";
import { emailService } from "../services/email";

/**
 * Comprehensive Inventory Management Service
 * Handles all inventory operations including stock management, purchase orders, sales, and alerts
 */
export class InventoryService {
  
  // ====== CATEGORY MANAGEMENT ======
  
  async getCategories(organizationId: number) {
    return await db
      .select()
      .from(inventoryCategories)
      .where(and(
        eq(inventoryCategories.organizationId, organizationId),
        eq(inventoryCategories.isActive, true)
      ))
      .orderBy(inventoryCategories.name);
  }

  async createCategory(categoryData: InsertInventoryCategory) {
    const [category] = await db
      .insert(inventoryCategories)
      .values(categoryData)
      .returning();
    
    console.log(`[INVENTORY] Created category: ${category.name} for organization ${categoryData.organizationId}`);
    return category;
  }

  async updateCategory(id: number, organizationId: number, updates: Partial<InsertInventoryCategory>) {
    const [category] = await db
      .update(inventoryCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(inventoryCategories.id, id),
        eq(inventoryCategories.organizationId, organizationId)
      ))
      .returning();
    
    return category;
  }

  // ====== ITEM MANAGEMENT ======
  
  async getItems(organizationId: number, filters?: {
    categoryId?: number;
    lowStock?: boolean;
    search?: string;
    limit?: number;
  }) {
    const conditions = [
      eq(inventoryItems.organizationId, organizationId),
      eq(inventoryItems.isActive, true)
    ];

    if (filters?.categoryId) {
      conditions.push(eq(inventoryItems.categoryId, filters.categoryId));
    }

    if (filters?.lowStock) {
      conditions.push(sql`${inventoryItems.currentStock} <= ${inventoryItems.minimumStock}`);
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(sql`
        LOWER(${inventoryItems.name}) LIKE LOWER(${searchTerm}) OR 
        LOWER(${inventoryItems.brandName}) LIKE LOWER(${searchTerm}) OR 
        LOWER(${inventoryItems.sku}) LIKE LOWER(${searchTerm}) OR
        LOWER(${inventoryItems.barcode}) LIKE LOWER(${searchTerm})
      `);
    }

    let query = db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        description: inventoryItems.description,
        sku: inventoryItems.sku,
        barcode: inventoryItems.barcode,
        brandName: inventoryItems.brandName,
        manufacturer: inventoryItems.manufacturer,
        unitOfMeasurement: inventoryItems.unitOfMeasurement,
        purchasePrice: inventoryItems.purchasePrice,
        salePrice: inventoryItems.salePrice,
        mrp: inventoryItems.mrp,
        currentStock: inventoryItems.currentStock,
        minimumStock: inventoryItems.minimumStock,
        reorderPoint: inventoryItems.reorderPoint,
        prescriptionRequired: inventoryItems.prescriptionRequired,
        isActive: inventoryItems.isActive,
        categoryName: inventoryCategories.name,
        stockValue: sql<number>`${inventoryItems.currentStock} * ${inventoryItems.purchasePrice}`,
        isLowStock: sql<boolean>`${inventoryItems.currentStock} <= ${inventoryItems.minimumStock}`,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt
      })
      .from(inventoryItems)
      .leftJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id))
      .where(and(...conditions))
      .orderBy(inventoryItems.name);

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    return await query;
  }

  async getItem(id: number, organizationId: number) {
    const [item] = await db
      .select({
        id: inventoryItems.id,
        organizationId: inventoryItems.organizationId,
        categoryId: inventoryItems.categoryId,
        name: inventoryItems.name,
        description: inventoryItems.description,
        sku: inventoryItems.sku,
        barcode: inventoryItems.barcode,
        genericName: inventoryItems.genericName,
        brandName: inventoryItems.brandName,
        manufacturer: inventoryItems.manufacturer,
        unitOfMeasurement: inventoryItems.unitOfMeasurement,
        packSize: inventoryItems.packSize,
        purchasePrice: inventoryItems.purchasePrice,
        salePrice: inventoryItems.salePrice,
        mrp: inventoryItems.mrp,
        taxRate: inventoryItems.taxRate,
        currentStock: inventoryItems.currentStock,
        minimumStock: inventoryItems.minimumStock,
        maximumStock: inventoryItems.maximumStock,
        reorderPoint: inventoryItems.reorderPoint,
        expiryTracking: inventoryItems.expiryTracking,
        batchTracking: inventoryItems.batchTracking,
        prescriptionRequired: inventoryItems.prescriptionRequired,
        storageConditions: inventoryItems.storageConditions,
        sideEffects: inventoryItems.sideEffects,
        contraindications: inventoryItems.contraindications,
        dosageInstructions: inventoryItems.dosageInstructions,
        isActive: inventoryItems.isActive,
        isDiscontinued: inventoryItems.isDiscontinued,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
        categoryName: inventoryCategories.name,
        stockValue: sql<number>`${inventoryItems.currentStock} * ${inventoryItems.purchasePrice}`,
        isLowStock: sql<boolean>`${inventoryItems.currentStock} <= ${inventoryItems.minimumStock}`
      })
      .from(inventoryItems)
      .leftJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id))
      .where(and(
        eq(inventoryItems.id, id),
        eq(inventoryItems.organizationId, organizationId)
      ));

    return item;
  }

  async createItem(itemData: InsertInventoryItem) {
    const [item] = await db
      .insert(inventoryItems)
      .values(itemData)
      .returning();
    
    console.log(`[INVENTORY] Created item: ${item.name} (SKU: ${item.sku}) for organization ${itemData.organizationId}`);
    
    // Check if stock is low and create alert
    if (item.currentStock <= item.minimumStock) {
      await this.createStockAlert({
        organizationId: item.organizationId,
        itemId: item.id,
        alertType: 'low_stock',
        thresholdValue: item.minimumStock,
        currentValue: item.currentStock,
        status: 'active',
        message: `Stock level for ${item.name} is below minimum threshold (${item.currentStock}/${item.minimumStock})`
      });
    }
    
    return item;
  }

  async updateItem(id: number, organizationId: number, updates: Partial<InsertInventoryItem>) {
    const [item] = await db
      .update(inventoryItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(inventoryItems.id, id),
        eq(inventoryItems.organizationId, organizationId)
      ))
      .returning();
    
    // Check for low stock after update
    if (item && updates.currentStock !== undefined && item.currentStock <= item.minimumStock) {
      await this.createStockAlert({
        organizationId: item.organizationId,
        itemId: item.id,
        alertType: 'low_stock',
        thresholdValue: item.minimumStock,
        currentValue: item.currentStock,
        status: 'active',
        message: `Stock level for ${item.name} is below minimum threshold (${item.currentStock}/${item.minimumStock})`
      });
    }
    
    return item;
  }

  async deleteItem(id: number, organizationId: number) {
    console.log(`[INVENTORY] Attempting to delete item ${id} for organization ${organizationId}`);
    
    // First check if item exists
    const existingItem = await this.getItem(id, organizationId);
    if (!existingItem) {
      console.log(`[INVENTORY] Item ${id} not found`);
      return false;
    }

    // Delete the item
    const result = await db
      .delete(inventoryItems)
      .where(and(
        eq(inventoryItems.id, id),
        eq(inventoryItems.organizationId, organizationId)
      ))
      .returning({ id: inventoryItems.id });

    if (result.length > 0) {
      console.log(`[INVENTORY] Successfully deleted item ${id} (${existingItem.name})`);
      return true;
    } else {
      console.log(`[INVENTORY] Failed to delete item ${id}`);
      return false;
    }
  }

  // ====== SUPPLIER MANAGEMENT ======
  
  async getSuppliers(organizationId: number) {
    return await db
      .select()
      .from(inventorySuppliers)
      .where(and(
        eq(inventorySuppliers.organizationId, organizationId),
        eq(inventorySuppliers.isActive, true)
      ))
      .orderBy(inventorySuppliers.name);
  }

  async createSupplier(supplierData: InsertInventorySupplier) {
    const [supplier] = await db
      .insert(inventorySuppliers)
      .values(supplierData)
      .returning();
    
    console.log(`[INVENTORY] Created supplier: ${supplier.name} for organization ${supplierData.organizationId}`);
    return supplier;
  }

  async updateSupplier(id: number, organizationId: number, updates: Partial<InsertInventorySupplier>) {
    const [supplier] = await db
      .update(inventorySuppliers)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(inventorySuppliers.id, id),
        eq(inventorySuppliers.organizationId, organizationId)
      ))
      .returning();
    
    return supplier;
  }

  // ====== PURCHASE ORDER MANAGEMENT ======
  
  async createPurchaseOrder(orderData: InsertInventoryPurchaseOrder, items: InsertInventoryPurchaseOrderItem[]) {
    return await db.transaction(async (tx) => {
      // Create purchase order
      const [purchaseOrder] = await tx
        .insert(inventoryPurchaseOrders)
        .values(orderData)
        .returning();

      // Add items to purchase order
      const orderItems = await tx
        .insert(inventoryPurchaseOrderItems)
        .values(items.map(item => ({
          ...item,
          purchaseOrderId: purchaseOrder.id,
          organizationId: orderData.organizationId
        })))
        .returning();

      console.log(`[INVENTORY] Created purchase order ${purchaseOrder.poNumber} with ${orderItems.length} items`);
      
      return { purchaseOrder, items: orderItems };
    });
  }

  async getPurchaseOrders(organizationId: number, status?: string) {
    const conditions = [eq(inventoryPurchaseOrders.organizationId, organizationId)];
    
    if (status) {
      conditions.push(eq(inventoryPurchaseOrders.status, status));
    }

    return await db
      .select({
        id: inventoryPurchaseOrders.id,
        poNumber: inventoryPurchaseOrders.poNumber,
        orderDate: inventoryPurchaseOrders.orderDate,
        expectedDeliveryDate: inventoryPurchaseOrders.expectedDeliveryDate,
        status: inventoryPurchaseOrders.status,
        totalAmount: inventoryPurchaseOrders.totalAmount,
        taxAmount: inventoryPurchaseOrders.taxAmount,
        emailSent: inventoryPurchaseOrders.emailSent,
        emailSentAt: inventoryPurchaseOrders.emailSentAt,
        supplierName: inventorySuppliers.name,
        supplierEmail: inventorySuppliers.email,
        createdAt: inventoryPurchaseOrders.createdAt
      })
      .from(inventoryPurchaseOrders)
      .leftJoin(inventorySuppliers, eq(inventoryPurchaseOrders.supplierId, inventorySuppliers.id))
      .where(and(...conditions))
      .orderBy(desc(inventoryPurchaseOrders.createdAt));
  }

  async sendPurchaseOrderEmail(purchaseOrderId: number, organizationId: number) {
    const [po] = await db
      .select({
        id: inventoryPurchaseOrders.id,
        poNumber: inventoryPurchaseOrders.poNumber,
        totalAmount: inventoryPurchaseOrders.totalAmount,
        supplierEmail: inventorySuppliers.email,
        supplierName: inventorySuppliers.name
      })
      .from(inventoryPurchaseOrders)
      .leftJoin(inventorySuppliers, eq(inventoryPurchaseOrders.supplierId, inventorySuppliers.id))
      .where(and(
        eq(inventoryPurchaseOrders.id, purchaseOrderId),
        eq(inventoryPurchaseOrders.organizationId, organizationId)
      ));

    if (!po || !po.supplierEmail) {
      throw new Error('Purchase order not found or supplier email missing');
    }

    // Get purchase order items
    const items = await db
      .select({
        itemName: inventoryItems.name,
        quantity: inventoryPurchaseOrderItems.quantity,
        unitPrice: inventoryPurchaseOrderItems.unitPrice,
        totalPrice: inventoryPurchaseOrderItems.totalPrice
      })
      .from(inventoryPurchaseOrderItems)
      .leftJoin(inventoryItems, eq(inventoryPurchaseOrderItems.itemId, inventoryItems.id))
      .where(eq(inventoryPurchaseOrderItems.purchaseOrderId, purchaseOrderId));

    // Send email to Halo Pharmacy
    const subject = `Purchase Order ${po.poNumber} - Healthcare Supplies Request`;
    const message = `
Dear ${po.supplierName || 'Halo Pharmacy Team'},

Please find our purchase order details below:

Purchase Order Number: ${po.poNumber}
Total Amount: £${po.totalAmount}

Items Requested:
${items.map(item => 
  `- ${item.itemName}: ${item.quantity} units @ £${item.unitPrice} each = £${item.totalPrice}`
).join('\n')}

Please confirm receipt and provide expected delivery timeframe.

Best regards,
Cura Healthcare Team
    `.trim();

    try {
      await emailService.sendEmail({
        to: po.supplierEmail,
        subject,
        text: message,
        html: message.replace(/\n/g, '<br>')
      });
      
      // Update purchase order as email sent
      await db
        .update(inventoryPurchaseOrders)
        .set({ 
          emailSent: true, 
          emailSentAt: new Date(),
          status: 'sent' 
        })
        .where(eq(inventoryPurchaseOrders.id, purchaseOrderId));
      
      console.log(`[INVENTORY] Purchase order ${po.poNumber} emailed to ${po.supplierEmail}`);
      return true;
    } catch (error) {
      console.error(`[INVENTORY] Failed to send purchase order email:`, error);
      throw new Error('Failed to send purchase order email');
    }
  }

  async deletePurchaseOrder(purchaseOrderId: number, organizationId: number) {
    return await db.transaction(async (tx) => {
      // Delete purchase order items first
      await tx
        .delete(inventoryPurchaseOrderItems)
        .where(eq(inventoryPurchaseOrderItems.purchaseOrderId, purchaseOrderId));

      // Delete the purchase order
      const [deletedPO] = await tx
        .delete(inventoryPurchaseOrders)
        .where(and(
          eq(inventoryPurchaseOrders.id, purchaseOrderId),
          eq(inventoryPurchaseOrders.organizationId, organizationId)
        ))
        .returning();

      if (!deletedPO) {
        throw new Error('Purchase order not found');
      }

      console.log(`[INVENTORY] Deleted purchase order ${deletedPO.poNumber}`);
      return true;
    });
  }

  // ====== STOCK MANAGEMENT ======
  
  async updateStock(itemId: number, organizationId: number, quantity: number, movementType: string, notes?: string, userId?: number) {
    return await db.transaction(async (tx) => {
      // Get current item
      const [item] = await tx
        .select()
        .from(inventoryItems)
        .where(and(
          eq(inventoryItems.id, itemId),
          eq(inventoryItems.organizationId, organizationId)
        ));

      if (!item) {
        throw new Error('Item not found');
      }

      const previousStock = item.currentStock;
      const newStock = previousStock + quantity;

      // Update item stock
      await tx
        .update(inventoryItems)
        .set({ 
          currentStock: newStock,
          updatedAt: new Date()
        })
        .where(eq(inventoryItems.id, itemId));

      // Record stock movement
      await tx
        .insert(inventoryStockMovements)
        .values({
          organizationId,
          itemId,
          movementType,
          quantity,
          previousStock,
          newStock,
          unitCost: item.purchasePrice,
          notes,
          createdBy: userId || 1
        });

      // Check for low stock alert
      if (newStock <= item.minimumStock) {
        await this.createStockAlert({
          organizationId,
          itemId,
          alertType: 'low_stock',
          thresholdValue: item.minimumStock,
          currentValue: newStock,
          status: 'active',
          message: `Stock level for ${item.name} is below minimum threshold (${newStock}/${item.minimumStock})`
        });
      }

      console.log(`[INVENTORY] Stock updated for ${item.name}: ${previousStock} → ${newStock} (${quantity > 0 ? '+' : ''}${quantity})`);
      return { previousStock, newStock, item };
    });
  }

  // ====== STOCK ALERTS ======
  
  async createStockAlert(alertData: InsertInventoryStockAlert) {
    // Check if similar alert already exists
    const existingAlert = await db
      .select()
      .from(inventoryStockAlerts)
      .where(and(
        eq(inventoryStockAlerts.organizationId, alertData.organizationId),
        eq(inventoryStockAlerts.itemId, alertData.itemId),
        eq(inventoryStockAlerts.alertType, alertData.alertType),
        eq(inventoryStockAlerts.isResolved, false)
      ));

    if (existingAlert.length > 0) {
      return existingAlert[0]; // Don't create duplicate alerts
    }

    const [alert] = await db
      .insert(inventoryStockAlerts)
      .values(alertData)
      .returning();
    
    console.log(`[INVENTORY] Created stock alert: ${alertData.alertType} for item ${alertData.itemId}`);
    return alert;
  }

  async getStockAlerts(organizationId: number, unreadOnly: boolean = false) {
    const conditions = [eq(inventoryStockAlerts.organizationId, organizationId)];
    
    if (unreadOnly) {
      conditions.push(eq(inventoryStockAlerts.isRead, false));
    }

    return await db
      .select({
        id: inventoryStockAlerts.id,
        alertType: inventoryStockAlerts.alertType,
        message: inventoryStockAlerts.message,
        isRead: inventoryStockAlerts.isRead,
        isResolved: inventoryStockAlerts.isResolved,
        createdAt: inventoryStockAlerts.createdAt,
        itemName: inventoryItems.name,
        itemSku: inventoryItems.sku,
        currentStock: inventoryItems.currentStock,
        minimumStock: inventoryItems.minimumStock
      })
      .from(inventoryStockAlerts)
      .leftJoin(inventoryItems, eq(inventoryStockAlerts.itemId, inventoryItems.id))
      .where(and(...conditions))
      .orderBy(desc(inventoryStockAlerts.createdAt));
  }

  // ====== INVENTORY REPORTS ======
  
  async getInventoryValue(organizationId: number) {
    const result = await db
      .select({
        totalValue: sql<number>`SUM(${inventoryItems.currentStock} * ${inventoryItems.purchasePrice})`,
        totalItems: sql<number>`COUNT(*)`,
        totalStock: sql<number>`SUM(${inventoryItems.currentStock})`,
        lowStockItems: sql<number>`COUNT(CASE WHEN ${inventoryItems.currentStock} <= ${inventoryItems.minimumStock} THEN 1 END)`
      })
      .from(inventoryItems)
      .where(and(
        eq(inventoryItems.organizationId, organizationId),
        eq(inventoryItems.isActive, true)
      ));

    return result[0];
  }

  async getLowStockItems(organizationId: number) {
    return await db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        sku: inventoryItems.sku,
        currentStock: inventoryItems.currentStock,
        minimumStock: inventoryItems.minimumStock,
        reorderPoint: inventoryItems.reorderPoint,
        categoryName: inventoryCategories.name
      })
      .from(inventoryItems)
      .leftJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id))
      .where(and(
        eq(inventoryItems.organizationId, organizationId),
        eq(inventoryItems.isActive, true),
        sql`${inventoryItems.currentStock} <= ${inventoryItems.minimumStock}`
      ))
      .orderBy(inventoryItems.name);
  }

  async getStockMovements(organizationId: number, itemId?: number, limit: number = 50) {
    const conditions = [eq(inventoryStockMovements.organizationId, organizationId)];
    
    if (itemId) {
      conditions.push(eq(inventoryStockMovements.itemId, itemId));
    }

    return await db
      .select({
        id: inventoryStockMovements.id,
        itemName: inventoryItems.name,
        movementType: inventoryStockMovements.movementType,
        quantity: inventoryStockMovements.quantity,
        previousStock: inventoryStockMovements.previousStock,
        newStock: inventoryStockMovements.newStock,
        unitCost: inventoryStockMovements.unitCost,
        notes: inventoryStockMovements.notes,
        createdAt: inventoryStockMovements.createdAt
      })
      .from(inventoryStockMovements)
      .leftJoin(inventoryItems, eq(inventoryStockMovements.itemId, inventoryItems.id))
      .where(and(...conditions))
      .orderBy(desc(inventoryStockMovements.createdAt))
      .limit(limit);
  }

  // ====== BARCODE & SKU GENERATION ======
  
  generateSKU(categoryName: string, itemName: string): string {
    const categoryCode = categoryName.substring(0, 3).toUpperCase();
    const itemCode = itemName.replace(/\s+/g, '').substring(0, 6).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${categoryCode}-${itemCode}-${timestamp}`;
  }

  generateBarcode(): string {
    // Generate a simple 12-digit barcode
    return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  }

  // ====== GOODS RECEIPTS ======
  
  async getGoodsReceipts(organizationId: number) {
    const receipts = await db
      .select({
        id: inventoryStockMovements.id,
        receiptNumber: sql<string>`CONCAT('GR-', ${inventoryStockMovements.id})`,
        purchaseOrderId: inventoryStockMovements.referenceId,
        poNumber: inventoryPurchaseOrders.poNumber,
        supplierName: inventorySuppliers.name,
        receivedDate: inventoryStockMovements.createdAt,
        totalAmount: sql<number>`${inventoryStockMovements.quantity} * ${inventoryStockMovements.unitCost}`,
        receivedBy: inventoryStockMovements.createdBy,
        notes: inventoryStockMovements.notes,
        itemId: inventoryStockMovements.itemId,
        itemName: inventoryItems.name,
        quantityReceived: inventoryStockMovements.quantity,
        batchNumber: inventoryBatches.batchNumber,
        expiryDate: inventoryBatches.expiryDate
      })
      .from(inventoryStockMovements)
      .leftJoin(inventoryItems, eq(inventoryStockMovements.itemId, inventoryItems.id))
      .leftJoin(inventoryBatches, eq(inventoryStockMovements.batchId, inventoryBatches.id))
      .leftJoin(inventoryPurchaseOrders, eq(inventoryStockMovements.referenceId, inventoryPurchaseOrders.id))
      .leftJoin(inventorySuppliers, eq(inventoryPurchaseOrders.supplierId, inventorySuppliers.id))
      .where(and(
        eq(inventoryStockMovements.organizationId, organizationId),
        eq(inventoryStockMovements.movementType, 'purchase')
      ))
      .orderBy(desc(inventoryStockMovements.createdAt));

    return receipts;
  }

  async createGoodsReceipt(receiptData: any) {
    return await db.transaction(async (tx) => {
      const movements = [];
      
      for (const item of receiptData.items) {
        // Create stock movement for receipt
        const [movement] = await tx
          .insert(inventoryStockMovements)
          .values({
            organizationId: receiptData.organizationId,
            itemId: item.itemId,
            movementType: 'purchase',
            quantity: item.quantityReceived,
            previousStock: 0, // Will be updated
            newStock: 0, // Will be updated
            referenceType: 'purchase_order',
            referenceId: receiptData.purchaseOrderId,
            notes: receiptData.notes,
            createdBy: 1, // TODO: Get from user context
          })
          .returning();

        // Update item stock
        await this.updateStock(
          item.itemId,
          receiptData.organizationId,
          item.quantityReceived,
          'purchase',
          receiptData.notes,
          1 // TODO: Get from user context
        );

        // Create batch if batch info provided
        if (item.batchNumber || item.expiryDate) {
          await tx
            .insert(inventoryBatches)
            .values({
              organizationId: receiptData.organizationId,
              itemId: item.itemId,
              batchNumber: item.batchNumber || `BATCH-${Date.now()}`,
              quantity: item.quantityReceived,
              remainingQuantity: item.quantityReceived,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
              purchasePrice: item.unitPrice || '0.00',
              receivedDate: new Date(receiptData.receivedDate),
              status: 'active'
            });
        }

        movements.push(movement);
      }

      console.log(`[INVENTORY] Created goods receipt with ${movements.length} items`);
      return { 
        id: movements[0]?.id,
        receiptNumber: `GR-${movements[0]?.id}`,
        items: movements 
      };
    });
  }

  async getBatches(organizationId: number) {
    const batches = await db
      .select({
        id: inventoryBatches.id,
        itemId: inventoryBatches.itemId,
        itemName: inventoryItems.name,
        batchNumber: inventoryBatches.batchNumber,
        quantityAvailable: inventoryBatches.remainingQuantity,
        location: sql<string>`'Pharmacy'`.as('location'), // Default location
        expiryDate: inventoryBatches.expiryDate,
        manufactureDate: inventoryBatches.manufactureDate,
        supplierId: inventoryBatches.supplierId,
        supplierName: inventorySuppliers.name,
        purchasePrice: inventoryBatches.purchasePrice,
        receivedDate: inventoryBatches.receivedDate,
        isExpired: inventoryBatches.isExpired,
        status: inventoryBatches.status,
        createdAt: inventoryBatches.createdAt
      })
      .from(inventoryBatches)
      .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
      .leftJoin(inventorySuppliers, eq(inventoryBatches.supplierId, inventorySuppliers.id))
      .where(eq(inventoryBatches.organizationId, organizationId))
      .orderBy(desc(inventoryBatches.createdAt));

    return batches;
  }
}

export const inventoryService = new InventoryService();