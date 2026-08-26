const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Replace if (!process.env.RESEND_API_KEY) with if (!process.env.GMAIL_USER)
  content = content.replace(/!process\.env\.RESEND_API_KEY/g, '!process.env.GMAIL_USER');
  content = content.replace(/process\.env\.RESEND_API_KEY/g, 'process.env.GMAIL_USER');
  
  // Replace process.env.RESEND_FROM || 'onboarding@resend.dev' with process.env.GMAIL_USER || 'no-reply@genzneuralx.com'
  content = content.replace(/process\.env\.RESEND_FROM\s*\|\|\s*'onboarding@resend\.dev'/g, "process.env.GMAIL_USER || 'no-reply@genzneuralx.com'");
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules') {
        walkDir(fullPath);
      }
    } else if (file.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'server'));
