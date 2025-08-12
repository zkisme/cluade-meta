#!/usr/bin/env node

// Test script to verify the config file format
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test config file path
const testConfigPath = path.join(process.env.HOME, '.claude', 'settings.json');

try {
  // Simulate updating config env with test data
  console.log('Testing config file generation...');
  
  // Read the generated config file
  if (fs.existsSync(testConfigPath)) {
    const configContent = fs.readFileSync(testConfigPath, 'utf8');
    console.log('Generated config file:');
    console.log(configContent);
    
    // Parse and validate the config
    const config = JSON.parse(configContent);
    
    console.log('\nValidation results:');
    
    // Check structure
    if (config.env && config.permissions && config.apiKeyHelper) {
      console.log('✅ Config structure is correct');
    } else {
      console.log('❌ Config structure is incorrect');
    }
    
    // Check CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC value
    if (config.env && config.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC === 1) {
      console.log('✅ CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is set to 1 (number)');
    } else {
      console.log('❌ CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is not set to 1:', config.env?.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC);
    }
    
    // Check other fields
    if (config.env.ANTHROPIC_AUTH_TOKEN) {
      console.log('✅ ANTHROPIC_AUTH_TOKEN is present');
    }
    
    if (config.env.ANTHROPIC_BASE_URL) {
      console.log('✅ ANTHROPIC_BASE_URL is present');
    }
    
    if (Array.isArray(config.permissions.allow) && Array.isArray(config.permissions.deny)) {
      console.log('✅ Permissions structure is correct');
    }
    
    if (config.apiKeyHelper) {
      console.log('✅ apiKeyHelper is present');
    }
    
  } else {
    console.log('Config file does not exist yet. Run the app and toggle a switch to generate it.');
  }
  
  console.log('\n✅ Config format test completed!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}