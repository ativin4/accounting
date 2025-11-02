import { NextRequest, NextResponse } from 'next/server';
import sql from '../../../../../lib/db';
import { requireAuth } from '../../../../../lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Get today's date and this month's start date
    const today = new Date().toISOString().split('T')[0];
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];

    // Today's sales metrics
    const todaySalesResult = await sql`
      SELECT
        COUNT(*) as invoice_count,
        COALESCE(SUM(total), 0) as total_revenue
      FROM invoices
      WHERE organization_id = ${user.organizationId}
        AND date = ${today}
        AND deleted_at IS NULL
    `;

    // This month sales metrics
    const thisMonthSalesResult = await sql`
      SELECT
        COUNT(*) as invoice_count,
        COALESCE(SUM(total), 0) as total_revenue
      FROM invoices
      WHERE organization_id = ${user.organizationId}
        AND date >= ${thisMonthStart}
        AND deleted_at IS NULL
    `;

    // Last month sales metrics for comparison
    const lastMonthSalesResult = await sql`
      SELECT
        COUNT(*) as invoice_count,
        COALESCE(SUM(total), 0) as total_revenue
      FROM invoices
      WHERE organization_id = ${user.organizationId}
        AND date >= ${lastMonthStart}
        AND date <= ${lastMonthEnd}
        AND deleted_at IS NULL
    `;

    // Top 5 customers by revenue
    const topCustomersResult = await sql`
      SELECT
        c.id,
        c.name,
        c.gstin,
        COUNT(i.id) as invoice_count,
        COALESCE(SUM(i.total), 0) as total_revenue
      FROM customers c
      JOIN invoices i ON c.id = i.customer_id
      WHERE c.organization_id = ${user.organizationId}
        AND i.deleted_at IS NULL
      GROUP BY c.id, c.name, c.gstin
      ORDER BY total_revenue DESC
      LIMIT 5
    `;

    // Sales by product category
    const categorySalesResult = await sql`
      SELECT
        i.category,
        COUNT(DISTINCT inv.id) as invoice_count,
        COALESCE(SUM(ii.quantity * ii.price), 0) as total_revenue
      FROM inventory i
      JOIN invoice_items ii ON i.id = ii.product_id
      JOIN invoices inv ON ii.invoice_id = inv.id
      WHERE i.organization_id = ${user.organizationId}
        AND inv.deleted_at IS NULL
        AND i.category IS NOT NULL
      GROUP BY i.category
      ORDER BY total_revenue DESC
    `;

    // Recent invoices
    const recentInvoicesResult = await sql`
      SELECT
        i.id,
        i.date,
        i.total,
        i.gst,
        i.payment_mode,
        c.name as customer_name,
        COUNT(ii.id) as item_count
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.organization_id = ${user.organizationId}
        AND i.deleted_at IS NULL
      GROUP BY i.id, c.name
      ORDER BY i.date DESC, i.created_at DESC
      LIMIT 10
    `;

    // Outstanding balance (customers who owe money)
    const outstandingBalanceResult = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) as total_outstanding,
        COUNT(CASE WHEN balance > 0 THEN 1 END) as customers_with_balance
      FROM customers
      WHERE organization_id = ${user.organizationId}
        AND balance > 0
    `;

    // Low stock products
    const lowStockResult = await sql`
      SELECT COUNT(*) as low_stock_count
      FROM inventory
      WHERE organization_id = ${user.organizationId}
        AND stock <= 10
    `;

    const todaySales = todaySalesResult[0];
    const thisMonthSales = thisMonthSalesResult[0];
    const lastMonthSales = lastMonthSalesResult[0];
    const outstandingBalance = outstandingBalanceResult[0];
    const lowStock = lowStockResult[0];

    // Calculate month over month growth
    const monthlyRevenueGrowth = lastMonthSales.total_revenue > 0
      ? ((thisMonthSales.total_revenue - lastMonthSales.total_revenue) / lastMonthSales.total_revenue) * 100
      : 0;

    const monthlyInvoiceGrowth = lastMonthSales.invoice_count > 0
      ? ((thisMonthSales.invoice_count - lastMonthSales.invoice_count) / lastMonthSales.invoice_count) * 100
      : 0;

    return NextResponse.json({
      today: {
        revenue: parseFloat(todaySales.total_revenue),
        invoiceCount: parseInt(todaySales.invoice_count),
      },
      thisMonth: {
        revenue: parseFloat(thisMonthSales.total_revenue),
        invoiceCount: parseInt(thisMonthSales.invoice_count),
        revenueGrowth: Math.round(monthlyRevenueGrowth * 100) / 100,
        invoiceGrowth: Math.round(monthlyInvoiceGrowth * 100) / 100,
      },
      topCustomers: topCustomersResult.map(customer => ({
        id: customer.id,
        name: customer.name,
        gstin: customer.gstin,
        invoiceCount: parseInt(customer.invoice_count),
        totalRevenue: parseFloat(customer.total_revenue),
      })),
      categorySales: categorySalesResult.map(category => ({
        category: category.category,
        invoiceCount: parseInt(category.invoice_count),
        totalRevenue: parseFloat(category.total_revenue),
      })),
      recentInvoices: recentInvoicesResult.map(invoice => ({
        id: invoice.id,
        date: invoice.date,
        total: parseFloat(invoice.total),
        gst: invoice.gst,
        paymentType: invoice.payment_mode,
        customerName: invoice.customer_name,
        itemCount: parseInt(invoice.item_count),
      })),
      outstandingBalance: {
        total: parseFloat(outstandingBalance.total_outstanding),
        customerCount: parseInt(outstandingBalance.customers_with_balance),
      },
      lowStockCount: parseInt(lowStock.low_stock_count),
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}