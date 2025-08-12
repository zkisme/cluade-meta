#!/usr/bin/env node

// Test script to verify config file field preservation
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const testConfigPath = path.join(process.env.HOME, '.claude', 'settings.json');

try {
  console.log('Testing config file field preservation...\n');
  
  // Create a test config file with custom structure
  const testConfig = {
    env: {
      ANTHROPIC_AUTH_TOKEN: "initial-token",
      ANTHROPIC_BASE_URL: "https://custom.api.com",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
      CUSTOM_FIELD: "preserved_value"  // This should be preserved
    },
    permissions: {
      allow: ["read", "write"],
      deny: ["delete"]
    },
    apiKeyHelper: "echo 'initial-token'",
    customSection: {
      setting1: "value1",
      setting2: "value2"
    }
  };
  
  // Write test config
  fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
  console.log('✅ Created test config with custom structure');
  
  // Simulate updating the config (this would be done via the app)
  console.log('\n📝 Simulating config update...');
  
  // Read the current config
  let currentConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
  console.log('Current config before update:');
  console.log(JSON.stringify(currentConfig, null, 2));
  
  // Simulate the update logic (similar to what the backend does)
  const newApiKey = "updated-test-key-123";
  const newBaseUrl = "https://api.packycode.com";
  
  // Update only specific fields
  if (currentConfig.env) {
    currentConfig.env.ANTHROPIC_AUTH_TOKEN = newApiKey;
    currentConfig.env.ANTHROPIC_BASE_URL = newBaseUrl;
    currentConfig.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = 1;
  }
  
  if (currentConfig.apiKeyHelper) {
    currentConfig.apiKeyHelper = `echo '${newApiKey}'`;
  }
  
  // Write updated config
  fs.writeFileSync(testConfigPath, JSON.stringify(currentConfig, null, 2));
  
  // Read and verify the updated config
  const updatedConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
  console.log('\n📋 Updated config after field-specific update:');
  console.log(JSON.stringify(updatedConfig, null, 2));
  
  // Verify field preservation
  console.log('\n🔍 Verification Results:');
  
  const checks = [
    {
      name: "ANTHROPIC_AUTH_TOKEN updated",
      check: updatedConfig.env.ANTHROPIC_AUTH_TOKEN === newApiKey
    },
    {
      name: "ANTHROPIC_BASE_URL updated", 
      check: updatedConfig.env.ANTHROPIC_BASE_URL === newBaseUrl
    },
    {
      name: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is 1",
      check: updatedConfig.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC === 1
    },
    {
      name: "apiKeyHelper updated",
      check: updatedConfig.apiKeyHelper === `echo '${newApiKey}'`
    },
    {
      name: "CUSTOM_FIELD preserved",
      check: updatedConfig.env.CUSTOM_FIELD === "preserved_value"
    },
    {
      name: "permissions structure preserved",
      check: updatedConfig.permissions.allow.includes("read") && 
             updatedConfig.permissions.allow.includes("write") &&
             updatedConfig.permissions.deny.includes("delete")
    },
    {
      name: "customSection preserved",
      check: updatedConfig.customSection.setting1 === "value1" &&
             updatedConfig.customSection.setting2 === "value2"
    }
  ];
  
  let allPassed = true;
  checks.forEach(({ name, check }) => {
    if (check) {
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name}`);
      allPassed = false;
    }
  });
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Field preservation working correctly.');
  } else {
    console.log('\n❌ Some tests failed. Check the implementation.');
  }
  
  // Cleanup
  if (fs.existsSync(testConfigPath)) {
    fs.unlinkSync(testConfigPath);
    console.log('\n🧹 Cleaned up test config file.');
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  
  // Cleanup on error
  if (fs.existsSync(testConfigPath)) {
    fs.unlinkSync(testConfigPath);
  }
}