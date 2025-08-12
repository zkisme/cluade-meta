#!/usr/bin/env node

// Test script to verify the database data conversion
import { execSync } from 'child_process';

try {
  // Test the new API endpoint
  const result = execSync('sqlite3 "/Users/kay/Library/Application Support/com.config-meta.app/api_keys/claude_keys.db" "SELECT id, name, key, description, anthropic_base_url, created_at, updated_at FROM api_keys LIMIT 1;"', { encoding: 'utf8' });
  
  console.log('Raw database data:');
  console.log(result);
  
  // Parse the raw data
  const [id, name, key, description, anthropic_base_url, created_at, updated_at] = result.trim().split('|');
  
  console.log('\nConverted to ConfigItem format:');
  console.log(JSON.stringify({
    id,
    name,
    data: {
      key,
      anthropic_base_url: anthropic_base_url || null
    },
    description: description || null,
    created_at,
    updated_at
  }, null, 2));
  
  console.log('\n✅ Data conversion test successful!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}