#!/usr/bin/env node

/**
 * commands.js
 * Task Master CLI Commands Module
 * 
 * This module provides the CLI interface for Task Master functionality.
 */

export function runCLI(argv) {
    const args = argv.slice(2);
    const command = args[0] || 'help';

    console.log('🚀 Synapse Development Environment');
    console.log('=====================================');

    switch (command) {
        case 'help':
        case '--help':
        case '-h':
            showHelp();
            break;
        
        case 'dev':
            console.log('Starting development servers...');
            console.log('');
            console.log('To start individual services:');
            console.log('• Backend: npm run dev:backend');
            console.log('• Frontend: cd src/frontend && npm run dev');
            break;
            
        case 'list':
            console.log('📋 Task listing functionality (requires Task Master setup)');
            console.log('Check tasks/ directory for task files');
            break;
            
        case 'generate':
            console.log('🔧 Task generation functionality (requires Task Master setup)');
            break;
            
        case 'parse-prd':
            console.log('📄 PRD parsing functionality (requires Task Master setup)');
            console.log('Example: npm run parse-prd scripts/example_prd.txt');
            break;
            
        default:
            console.log(`❌ Unknown command: ${command}`);
            console.log('Run "npm run dev help" for available commands');
            process.exit(1);
    }
}

function showHelp() {
    console.log('Available commands:');
    console.log('');
    console.log('  npm run dev               Show development info');
    console.log('  npm run dev:backend       Start backend server');
    console.log('  npm run list              List tasks');
    console.log('  npm run generate          Generate task files');
    console.log('  npm run parse-prd         Parse PRD file');
    console.log('  npm run build             Build frontend');
    console.log('  npm run start             Start production server');
    console.log('');
    console.log('Development servers:');
    console.log('  Backend:  http://localhost:3000');
    console.log('  Frontend: http://localhost:5173');
    console.log('');
}