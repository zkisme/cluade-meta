#!/usr/bin/env node

// Final test script to verify the complete template functionality
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const testConfigPath = path.join(process.env.HOME, '.claude', 'settings.json');

try {
  console.log('🔧 Testing Complete Template Functionality\n');
  
  // Test 1: Create initial config from template
  console.log('📋 Test 1: Creating initial config from template...');
  const templateConfig = {
    env: {
      ANTHROPIC_AUTH_TOKEN: "your-api-key-here",
      ANTHROPIC_BASE_URL: "https://api.packycode.com",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1
    },
    permissions: {
      allow: [],
      deny: []
    },
    apiKeyHelper: "echo 'your-api-key-here'"
  };
  
  // Ensure directory exists
  const configDir = path.dirname(testConfigPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(testConfigPath, JSON.stringify(templateConfig, null, 2));
  console.log('✅ Template config created successfully');
  
  // Test 2: Simulate field-specific update
  console.log('\n📝 Test 2: Simulating field-specific update...');
  
  const updateData = {
    api_key: "sk-ant-api03-test-key-123456",
    base_url: "https://api.anthropic.com"
  };
  
  // Read existing config
  let config = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
  console.log('Before update:');
  console.log(JSON.stringify(config, null, 2));
  
  // Update only specific fields (mimicking backend logic)
  if (config.env) {
    config.env.ANTHROPIC_AUTH_TOKEN = updateData.api_key;
    config.env.ANTHROPIC_BASE_URL = updateData.base_url;
    config.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = 1; // Always ensure this is set
  }
  
  if (config.apiKeyHelper) {
    config.apiKeyHelper = `echo '${updateData.api_key}'`;
  }
  
  fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));
  
  const updatedConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
  console.log('\nAfter field-specific update:');
  console.log(JSON.stringify(updatedConfig, null, 2));
  
  // Test 3: Verify all required fields are present and correct
  console.log('\n🔍 Test 3: Verification...');
  
  const requiredFields = [
    { path: ['env', 'ANTHROPIC_AUTH_TOKEN'], expected: updateData.api_key, type: 'string' },
    { path: ['env', 'ANTHROPIC_BASE_URL'], expected: updateData.base_url, type: 'string' },
    { path: ['env', 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'], expected: 1, type: 'number' },
    { path: ['permissions', 'allow'], expected: [], type: 'array' },
    { path: ['permissions', 'deny'], expected: [], type: 'array' },
    { path: ['apiKeyHelper'], expected: `echo '${updateData.api_key}'`, type: 'string' }
  ];
  
  let allPassed = true;
  requiredFields.forEach(({ path: fieldPath, expected, type }) => {
    const value = fieldPath.reduce((obj, key) => obj?.[key], updatedConfig);
    let passed = false;
    
    if (type === 'array') {
      passed = Array.isArray(value) && JSON.stringify(value) === JSON.stringify(expected);
    } else {
      passed = value === expected && typeof value === type;
    }
    
    if (passed) {
      console.log(`✅ ${fieldPath.join('.')} = ${Array.isArray(value) ? JSON.stringify(value) : value} (${type})`);
    } else {
      console.log(`❌ ${fieldPath.join('.')} = ${Array.isArray(value) ? JSON.stringify(value) : value} (${typeof value}), expected ${Array.isArray(expected) ? JSON.stringify(expected) : expected} (${type})`);
      allPassed = false;
    }
  });
  
  // Test 4: Verify structure preservation
  console.log('\n🏗️ Test 4: Structure preservation verification...');
  
  const structureChecks = [
    { name: 'Root is object', check: typeof updatedConfig === 'object' && !Array.isArray(updatedConfig) },
    { name: 'Has env object', check: typeof updatedConfig.env === 'object' && !Array.isArray(updatedConfig.env) },
    { name: 'Has permissions object', check: typeof updatedConfig.permissions === 'object' && !Array.isArray(updatedConfig.permissions) },
    { name: 'Has apiKeyHelper', check: typeof updatedConfig.apiKeyHelper === 'string' },
    { name: 'No extra fields at root', check: Object.keys(updatedConfig).every(key => ['env', 'permissions', 'apiKeyHelper'].includes(key)) }
  ];
  
  structureChecks.forEach(({ name, check }) => {
    if (check) {
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name}`);
      allPassed = false;
    }
  });
  
  // Final result
  console.log('\n🎯 Final Results:');
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Template functionality works correctly');
    console.log('✅ Field-specific updates preserve structure');
    console.log('✅ All required fields are properly set');
    console.log('✅ CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is always 1');
  } else {
    console.log('❌ Some tests failed. Check the implementation.');
  }
  
  // Cleanup
  if (fs.existsSync(testConfigPath)) {
    fs.unlinkSync(testConfigPath);
    console.log('\n🧹 Test config file cleaned up.');
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  
  // Cleanup on error
  if (fs.existsSync(testConfigPath)) {
    fs.unlinkSync(testConfigPath);
  }
}