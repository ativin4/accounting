import sql from '../lib/db';

export async function setupDatabaseSchema() {
  try {
    // Create organizations table
    await sql`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        gstin VARCHAR(15),
        address TEXT,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create organization_users table
    await sql`
      CREATE TABLE IF NOT EXISTS organization_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'invoice_manager', 'inventory_manager', 'sales_rep', 'viewer')),
        invited_by UUID REFERENCES organization_users(id),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, user_id)
      );
    `;

    // Create invite_links table
    await sql`
      CREATE TABLE IF NOT EXISTS invite_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'invoice_manager', 'inventory_manager', 'sales_rep', 'viewer')),
        expires_at TIMESTAMP NOT NULL,
        used_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create audit_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        old_values JSONB,
        new_values JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create product_serial_numbers table
    await sql`
      CREATE TABLE IF NOT EXISTS product_serial_numbers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
        serial_number VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'returned')),
        invoice_item_id UUID REFERENCES invoice_items(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, serial_number)
      );
    `;

    // Create users table if it doesn't exist (for NextAuth)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        email_verified TIMESTAMP,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create accounts table for NextAuth
    await sql`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        provider_account_id VARCHAR(255) NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INTEGER,
        token_type VARCHAR(50),
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_account_id)
      );
    `;

    // Create sessions table for NextAuth
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_token VARCHAR(255) UNIQUE NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create verification_tokens table for NextAuth
    await sql`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Update existing tables to add organization_id if they don't exist
    try {
      await sql`
        ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      `;
    } catch (e) {
      // Column might already exist
    }

    try {
      await sql`
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      `;
    } catch (e) {
      // Column might already exist
    }

    try {
      await sql`
        ALTER TABLE inventory
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      `;
    } catch (e) {
      // Column might already exist
    }

    try {
      await sql`
        ALTER TABLE ledger
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      `;
    } catch (e) {
      // Column might already exist
    }

    // Add track_serial_numbers to inventory table
    try {
      await sql`
        ALTER TABLE inventory
        ADD COLUMN IF NOT EXISTS track_serial_numbers BOOLEAN DEFAULT FALSE;
      `;
    } catch (e) {
      // Column might already exist
    }

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_organizations_users_org_id ON organization_users(organization_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_organizations_users_user_id ON organization_users(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invite_links_token ON invite_links(token);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invite_links_org_id ON invite_links(organization_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_product_serial_numbers_product_id ON product_serial_numbers(product_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(organization_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(organization_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_inventory_org_id ON inventory(organization_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ledger_org_id ON ledger(organization_id);`;

    console.log('Database schema setup completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Database schema setup failed:', error);
    throw error;
  }
}