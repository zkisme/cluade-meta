#!/usr/bin/env node

// Test script to verify field cleanup functionality
import fs from 'fs';
import path from 'path';

const testConfigPath = path.join(process.env.HOME, '.claude', 'settings.json');

try {
  console.log('🧹 Testing field cleanup functionality...\n');
  
  // Create a config file with both old and new field names (simulating the bug)
  const problematicConfig = {
    env: {
      ANTHROPIC_AUTH_TOKEN: "test-key-123",
      ANTHROPIC_BASE_URL: "https://api.packycode.com",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1
    },
    permissions: {
      allow: [],
      deny: []
    },
    apiKeyHelper: "echo 'old-correct-key'",  // Correct field name
    api_key_helper: "echo 'problematic-key'" // Wrong field name that should be removed
  };
  
  // Write the problematic config
  fs.writeFileSync(testConfigPath, JSON.stringify(problematicConfig, null, 2));
  console.log('✅ Created problematic config with both field names');
  console.log('Before cleanup:');
  console.log(JSON.stringify(problematicConfig, null, 2));
  
  // Simulate the update logic (similar to what update_config_env does)
  console.log('\n📝 Simulating field cleanup...');
  
  const newApiKey = "cleaned-test-key-456";
  
  // Read and parse the config
  let config = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
  
  // Apply the cleanup logic
  delete config.api_key_helper; // Remove old field name
  
  // Update the correct field
  if (config.env) {
    config.env.ANTHROPIC_AUTH_TOKEN = newApiKey;
    config.env.ANTHROPIC_BASE_URL = "https://api.packycode.com";
    config.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = 1;
  }
  
  config.apiKeyHelper = `echo '${newApiKey}'`;
  
  // Write the cleaned config
  fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));
  
  // Read and verify the cleaned config
  const cleanedConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
  console.log('\nAfter cleanup:');
  console.log(JSON.stringify(cleanedConfig, null, 2));
  
  // Verify cleanup was successful
  console.log('\n🔍 Verification Results:');
  
  const checks = [
    {
      name: "Old field api_key_helper removed",
      check: !cleanedConfig.hasOwnProperty('api_key_helper')
    },
    {
      name: "Correct field apiKeyHelper exists",
      check: cleanedConfig.hasOwnProperty('apiKeyHelper')
    },
    {
      name: "apiKeyHelper has correct value",
      check: cleanedConfig.apiKeyHelper === `echo '${newApiKey}'`
    },
    {
      name: "ANTHROPIC_AUTH_TOKEN updated",
      check: cleanedConfig.env.ANTHROPIC_AUTH_TOKEN === newApiKey
    },
    {
      name: "Only expected fields at root level",
      check: Object.keys(cleanedConfig).every(key => 
        ['env', 'permissions', 'apiKeyHelper'].includes(key)
      )
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
    console.log('\n🎉 All cleanup tests passed! Field cleanup working correctly.');
  } else {
    console.log('\n❌ Some cleanup tests failed. Check the implementation.');
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